import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PreviewFrame } from './PreviewFrame';
import { PreviewToolbar } from './PreviewToolbar';
import { useLiquidRenderer } from './hooks/useLiquidRenderer';
import { usePreviewMessaging } from './hooks/usePreviewMessaging';
import { parseSchema, extractSettings, buildInitialState } from './schema/parseSchema';
import { SettingsPanel } from './settings/SettingsPanel';
import { getAllPresets, buildContextFromPreset, getDefaultContext } from './mockData/registry';
import type { DeviceSize, PreviewMessage, PreviewSettings } from './types';
import type { SchemaSetting, SettingsState, SchemaDefinition } from './schema/SchemaTypes';

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
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [renderedHtml, setRenderedHtml] = useState<string>('');

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

  // Reset settings when schema changes
  useEffect(() => {
    setSettingsValues(buildInitialState(schemaSettings));
  }, [schemaSettings]);

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

      // Build mock data context
      const mockData = selectedPreset
        ? buildContextFromPreset(selectedPreset)
        : getDefaultContext();

      const { html, css } = await render(liquidCode, settingsValues, mockData as unknown as Record<string, unknown>);
      setRenderedHtml(html);
      sendMessage({ type: 'RENDER', html, css });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Render failed';
      setError(errorMsg);
      sendMessage({ type: 'RENDER_ERROR', error: errorMsg });
    }
  }, [liquidCode, settingsValues, selectedPreset, render, sendMessage]);

  // Debounce renders on code/settings/preset change
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

  return (
    <s-stack gap="large" direction="block">
      {/* Settings panel if schema has settings */}
      {schemaSettings.length > 0 && (
        <SettingsPanel
          settings={schemaSettings}
          values={settingsValues}
          onChange={handleSettingsChange}
          disabled={isRendering}
        />
      )}

      {/* Toolbar */}
      <PreviewToolbar
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        onRefresh={triggerRender}
        isRendering={isRendering}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        presets={presets}
        renderedHtml={renderedHtml}
      />

      {/* Error banner */}
      {error && (
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
            Preview error: {error}. The code may use unsupported Liquid features.
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
