import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PreviewFrame } from './PreviewFrame';
import { PreviewToolbar } from './PreviewToolbar';
import { useLiquidRenderer } from './hooks/useLiquidRenderer';
import { usePreviewMessaging } from './hooks/usePreviewMessaging';
import { useResourceDetection } from './hooks/useResourceDetection';
import { useResourceFetcher } from './hooks/useResourceFetcher';
import { parseSchema, extractSettings, buildInitialState, buildBlockInstancesFromPreset } from './schema/parseSchema';
import { SettingsPanel } from './settings/SettingsPanel';
import { getAllPresets } from './mockData/registry';
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
 * Supports both mock data presets and real Shopify data
 */
export function SectionPreview({
  liquidCode,
  onSettingsChange
}: SectionPreviewProps) {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [renderedHtml, setRenderedHtml] = useState<string>('');

  // Real data state
  const [useRealData, setUseRealData] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MockProduct | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<MockCollection | null>(null);
  const [selectedProductResource, setSelectedProductResource] = useState<SelectedResource | null>(null);
  const [selectedCollectionResource, setSelectedCollectionResource] = useState<SelectedResource | null>(null);

  // Resource detection and fetching
  const resourceNeeds = useResourceDetection(liquidCode);
  const { fetchProduct, fetchCollection, loading: isLoadingResource, error: fetchError } = useResourceFetcher();

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

      // Build context with Drop classes or mock data
      const mockData = buildPreviewContext({
        useRealData,
        product: selectedProduct,
        collection: selectedCollection,
        preset: selectedPreset
      });

      const { html, css } = await render(liquidCode, settingsValues, blocksState, mockData as unknown as Record<string, unknown>);
      setRenderedHtml(html);
      sendMessage({ type: 'RENDER', html, css });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Render failed';
      setError(errorMsg);
      sendMessage({ type: 'RENDER_ERROR', error: errorMsg });
    }
  }, [liquidCode, settingsValues, blocksState, selectedPreset, useRealData, selectedProduct, selectedCollection, render, sendMessage]);

  // Debounce renders on code/settings/preset/resource change
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

  // Product selection handler
  const handleProductSelect = useCallback(async (
    productId: string | null,
    resource: SelectedResource | null
  ) => {
    if (!productId) {
      setSelectedProduct(null);
      setSelectedProductResource(null);
      return;
    }

    setSelectedProductResource(resource);

    // Fetch product data from API
    const product = await fetchProduct(productId);
    if (product) {
      setSelectedProduct(product);
    } else {
      setSelectedProductResource(null);
    }
  }, [fetchProduct]);

  // Collection selection handler
  const handleCollectionSelect = useCallback(async (
    collectionId: string | null,
    resource: SelectedResource | null
  ) => {
    if (!collectionId) {
      setSelectedCollection(null);
      setSelectedCollectionResource(null);
      return;
    }

    setSelectedCollectionResource(resource);

    // Fetch collection data from API
    const collection = await fetchCollection(collectionId);
    if (collection) {
      setSelectedCollection(collection);
    } else {
      setSelectedCollectionResource(null);
    }
  }, [fetchCollection]);

  // Handle real data toggle
  const handleToggleRealData = useCallback((enabled: boolean) => {
    setUseRealData(enabled);
    if (!enabled) {
      // Clear selections when switching to mock data
      setSelectedProduct(null);
      setSelectedCollection(null);
      setSelectedProductResource(null);
      setSelectedCollectionResource(null);
    }
  }, []);

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

  const presets = getAllPresets();

  // Combine errors
  const displayError = error || fetchError;

  return (
    <s-stack gap="large" direction="block">
      {/* Settings panel if schema has settings or blocks */}
      {(schemaSettings.length > 0 || blocksState.length > 0) && (
        <SettingsPanel
          settings={schemaSettings}
          values={settingsValues}
          onChange={handleSettingsChange}
          disabled={isRendering}
          schema={parsedSchema}
          blocks={blocksState}
          onBlockSettingChange={handleBlockSettingChange}
        />
      )}

      {/* Toolbar with resource picker */}
      <PreviewToolbar
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        onRefresh={triggerRender}
        isRendering={isRendering}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        presets={presets}
        renderedHtml={renderedHtml}
        // Real data props
        useRealData={useRealData}
        onToggleRealData={handleToggleRealData}
        selectedProduct={selectedProductResource}
        selectedCollection={selectedCollectionResource}
        onProductSelect={handleProductSelect}
        onCollectionSelect={handleCollectionSelect}
        resourceNeeds={resourceNeeds}
        isLoadingResource={isLoadingResource}
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
