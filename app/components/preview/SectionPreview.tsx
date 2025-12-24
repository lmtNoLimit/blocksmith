import { useState, useCallback, useEffect, useRef } from 'react';
import { PreviewFrame } from './PreviewFrame';
import { useLiquidRenderer } from './hooks/useLiquidRenderer';
import { usePreviewMessaging } from './hooks/usePreviewMessaging';
import { buildPreviewContext } from './utils/buildPreviewContext';
import type { DeviceSize, PreviewMessage } from './types';
import type { SettingsState, BlockInstance } from './schema/SchemaTypes';
import type { MockProduct, MockCollection } from './mockData/types';

export interface SectionPreviewProps {
  liquidCode: string;
  // External device control (from parent CodePreviewPanel header)
  deviceSize?: DeviceSize;
  // External settings for rendering (from usePreviewSettings hook in parent)
  settingsValues?: SettingsState;
  blocksState?: BlockInstance[];
  loadedResources?: Record<string, MockProduct | MockCollection>;
  // Callback to notify parent of render state changes
  onRenderStateChange?: (isRendering: boolean) => void;
  // Callback for manual refresh trigger
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

/**
 * Section preview component - renders Liquid code in sandboxed iframe
 * Settings are managed externally via usePreviewSettings hook
 */
export function SectionPreview({
  liquidCode,
  deviceSize = 'desktop',
  settingsValues = {},
  blocksState = [],
  loadedResources = {},
  onRenderStateChange,
  onRefreshRef,
}: SectionPreviewProps) {
  const [error, setError] = useState<string | null>(null);

  const { render, isRendering } = useLiquidRenderer();
  const { sendMessage, setIframe } = usePreviewMessaging(
    useCallback((msg: PreviewMessage) => {
      if (msg.type === 'RESIZE' && msg.height) {
        // Could use this to auto-adjust iframe height
      }
    }, [])
  );

  // Notify parent of render state changes
  useEffect(() => {
    onRenderStateChange?.(isRendering);
  }, [isRendering, onRenderStateChange]);

  // Debounced render
  const renderTimeoutRef = useRef<NodeJS.Timeout>();

  const triggerRender = useCallback(async () => {
    if (!liquidCode.trim()) {
      sendMessage({ type: 'RENDER', html: '<p style="color: #6d7175; text-align: center;">No code to preview</p>', css: '' });
      return;
    }

    try {
      setError(null);

      // Extract collection/product from loadedResources for global context
      let collectionFromSettings: MockCollection | null = null;
      let productFromSettings: MockProduct | null = null;

      for (const [, resource] of Object.entries(loadedResources)) {
        if ('products' in resource && Array.isArray((resource as { products?: unknown }).products)) {
          collectionFromSettings = resource as MockCollection;
        } else if ('variants' in resource) {
          productFromSettings = resource as MockProduct;
        }
      }

      const previewData = buildPreviewContext({
        collection: collectionFromSettings,
        product: productFromSettings,
        settingsResources: loadedResources
      });

      const { html, css } = await render(liquidCode, settingsValues, blocksState, previewData as unknown as Record<string, unknown>);
      sendMessage({ type: 'RENDER', html, css });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Render failed';
      setError(errorMsg);
      sendMessage({ type: 'RENDER_ERROR', error: errorMsg });
    }
  }, [liquidCode, settingsValues, blocksState, loadedResources, render, sendMessage]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = triggerRender;
    }
  }, [onRefreshRef, triggerRender]);

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
    setTimeout(triggerRender, 50);
  }, [setIframe, triggerRender]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Error banner */}
      {error && (
        <div style={{ flexShrink: 0, padding: '8px' }}>
          <s-banner tone="warning" dismissible onDismiss={() => setError(null)}>
            Preview error: {error}. The code may use unsupported Liquid features.
          </s-banner>
        </div>
      )}

      {/* Preview frame */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <PreviewFrame
          deviceSize={deviceSize}
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
