import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PreviewFrame } from './PreviewFrame';
import { useLiquidRenderer } from './hooks/useLiquidRenderer';
import { usePreviewMessaging } from './hooks/usePreviewMessaging';
import { useResourceFetcher } from './hooks/useResourceFetcher';
import { parseSchema, extractSettings, buildInitialState, buildBlockInstancesFromPreset } from './schema/parseSchema';
import { SettingsPanel } from './settings/SettingsPanel';
import { buildPreviewContext } from './utils/buildPreviewContext';
import type { DeviceSize, PreviewMessage, PreviewSettings } from './types';
import type { SchemaSetting, SettingsState, SchemaDefinition, BlockInstance } from './schema/SchemaTypes';
import type { MockProduct, MockCollection } from './mockData/types';
import type { SelectedResource } from './ResourceSelector';

export interface SectionPreviewProps {
  liquidCode: string;
  onSettingsChange?: (settings: PreviewSettings) => void;
}

/**
 * Main section preview component
 * Renders Liquid code in sandboxed iframe with settings editor
 */
export function SectionPreview({
  liquidCode,
  onSettingsChange
}: SectionPreviewProps) {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [error, setError] = useState<string | null>(null);

  // Settings-based resources (from schema settings with type: product/collection)
  const [settingsResourceSelections, setSettingsResourceSelections] = useState<Record<string, SelectedResource | null>>({});
  const [settingsResources, setSettingsResources] = useState<Record<string, MockProduct | MockCollection>>({});
  const [isLoadingSettingsResource, setIsLoadingSettingsResource] = useState(false);

  // Resource fetching hook
  const { fetchProduct, fetchCollection, error: fetchError } = useResourceFetcher();

  // Parse schema from liquid code
  const parsedSchema = useMemo<SchemaDefinition | null>(
    () => parseSchema(liquidCode),
    [liquidCode]
  );

  const schemaSettings = useMemo<SchemaSetting[]>(
    () => extractSettings(parsedSchema),
    [parsedSchema]
  );

  const [settingsValues, setSettingsValues] = useState<SettingsState>(() =>
    buildInitialState(schemaSettings)
  );

  // Block state management
  const [blocksState, setBlocksState] = useState<BlockInstance[]>([]);

  // Reset settings when schema changes
  useEffect(() => {
    setSettingsValues(buildInitialState(schemaSettings));
  }, [schemaSettings]);

  // Initialize blocks from schema
  useEffect(() => {
    const blocks = buildBlockInstancesFromPreset(parsedSchema);
    setBlocksState(blocks);
  }, [parsedSchema]);

  const { render, isRendering } = useLiquidRenderer();
  const { sendMessage, setIframe } = usePreviewMessaging(
    useCallback((msg: PreviewMessage) => {
      if (msg.type === 'RESIZE' && msg.height) {
        // Could use this to auto-adjust iframe height
      }
    }, [])
  );

  // Debounced render
  const renderTimeoutRef = useRef<NodeJS.Timeout>();

  const triggerRender = useCallback(async () => {
    if (!liquidCode.trim()) {
      sendMessage({ type: 'RENDER', html: '<p style="color: #6d7175; text-align: center;">No code to preview</p>', css: '' });
      return;
    }

    try {
      setError(null);

      // Build context with settings-based resources
      // Extract collection/product from settingsResources to also provide as global context
      // This is needed because AI-generated templates use `collection.products` (global), not just section.settings
      let collectionFromSettings: import('./mockData/types').MockCollection | null = null;
      let productFromSettings: import('./mockData/types').MockProduct | null = null;

      for (const [, resource] of Object.entries(settingsResources)) {
        // Check if it's a collection (has products array)
        if ('products' in resource && Array.isArray((resource as { products?: unknown }).products)) {
          collectionFromSettings = resource as import('./mockData/types').MockCollection;
        }
        // Check if it's a product (has variants)
        else if ('variants' in resource) {
          productFromSettings = resource as import('./mockData/types').MockProduct;
        }
      }

      const previewData = buildPreviewContext({
        collection: collectionFromSettings,
        product: productFromSettings,
        settingsResources
      });

      const { html, css } = await render(liquidCode, settingsValues, blocksState, previewData as unknown as Record<string, unknown>);
      sendMessage({ type: 'RENDER', html, css });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Render failed';
      setError(errorMsg);
      sendMessage({ type: 'RENDER_ERROR', error: errorMsg });
    }
  }, [liquidCode, settingsValues, blocksState, settingsResources, render, sendMessage]);

  // Debounce renders on code/settings/resource change
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = setTimeout(triggerRender, 100);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [triggerRender]);

  const handleIframeLoad = useCallback((iframe: HTMLIFrameElement) => {
    setIframe(iframe);
    // Trigger initial render after iframe loads
    setTimeout(triggerRender, 50);
  }, [setIframe, triggerRender]);

  const handleSettingsChange = useCallback((newValues: SettingsState) => {
    setSettingsValues(newValues);
    onSettingsChange?.(newValues);
  }, [onSettingsChange]);

  // Block setting change handler
  const handleBlockSettingChange = useCallback(
    (blockIndex: number, settingId: string, value: string | number | boolean) => {
      setBlocksState(prev => {
        const updated = [...prev];
        updated[blockIndex] = {
          ...updated[blockIndex],
          settings: {
            ...updated[blockIndex].settings,
            [settingId]: value
          }
        };
        return updated;
      });
    },
    []
  );

  // Settings resource selection handler (for schema-based resource settings)
  const handleSettingsResourceSelect = useCallback(async (
    settingId: string,
    resourceId: string | null,
    resource: SelectedResource | null
  ) => {
    // Update selection UI state
    setSettingsResourceSelections(prev => ({
      ...prev,
      [settingId]: resource
    }));

    if (!resourceId) {
      // Clear the resource data
      setSettingsResources(prev => {
        const updated = { ...prev };
        delete updated[settingId];
        return updated;
      });
      return;
    }

    // Find the setting type to know what kind of resource to fetch
    const setting = schemaSettings.find(s => s.id === settingId);
    if (!setting) return;

    setIsLoadingSettingsResource(true);
    try {
      let data: MockProduct | MockCollection | null = null;

      if (setting.type === 'product') {
        data = await fetchProduct(resourceId);
      } else if (setting.type === 'collection') {
        data = await fetchCollection(resourceId);
      }

      if (data) {
        setSettingsResources(prev => ({
          ...prev,
          [settingId]: data
        }));
      }
    } finally {
      setIsLoadingSettingsResource(false);
    }
  }, [schemaSettings, fetchProduct, fetchCollection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R: Refresh preview (prevent page reload)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
        e.preventDefault();
        triggerRender();
      }
      // Ctrl/Cmd + 1/2/3: Switch device size
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const sizes: DeviceSize[] = ['mobile', 'tablet', 'desktop'];
        setDeviceSize(sizes[parseInt(e.key) - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerRender]);

  // Combine errors
  const displayError = error || fetchError;

  return (
    <s-stack gap="large" direction="block">
      {/* Settings panel with preview controls */}
      <SettingsPanel
        settings={schemaSettings}
        values={settingsValues}
        onChange={handleSettingsChange}
        disabled={isRendering}
        schema={parsedSchema}
        blocks={blocksState}
        onBlockSettingChange={handleBlockSettingChange}
        resourceSettings={settingsResourceSelections}
        onResourceSelect={handleSettingsResourceSelect}
        isLoadingResource={isLoadingSettingsResource}
        // Preview controls (formerly in toolbar)
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        onRefresh={triggerRender}
        isRendering={isRendering}
      />

      {/* Error banner */}
      {displayError && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fff5ea',
          border: '1px solid #ffb84d',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Preview error: {displayError}. The code may use unsupported Liquid features.
          </p>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Preview frame */}
      <PreviewFrame
        deviceSize={deviceSize}
        onLoad={handleIframeLoad}
      />

      {/* Keyboard shortcuts hint */}
      <p style={{ color: '#6d7175', fontSize: '13px', margin: 0 }}>
        Shortcuts: Ctrl+R refresh, Ctrl+1/2/3 device size
      </p>
    </s-stack>
  );
}
