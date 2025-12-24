import { useEffect } from 'react';
import { NativePreviewFrame } from './NativePreviewFrame';
import { useNativePreviewRenderer } from './hooks/useNativePreviewRenderer';
import type { DeviceSize } from './types';
import type { SettingsState, BlockInstance } from './schema/SchemaTypes';
import type { MockProduct, MockCollection } from './mockData/types';

export interface NativeSectionPreviewProps {
  liquidCode: string;
  deviceSize?: DeviceSize;
  settingsValues?: SettingsState;
  blocksState?: BlockInstance[];
  loadedResources?: Record<string, MockProduct | MockCollection>;
  shopDomain: string;
  onRenderStateChange?: (isRendering: boolean) => void;
}

/**
 * Native section preview - uses App Proxy for server-side Liquid rendering
 * Provides authentic Shopify Liquid rendering with real theme context
 */
export function NativeSectionPreview({
  liquidCode,
  deviceSize = 'desktop',
  settingsValues = {},
  blocksState = [],
  loadedResources = {},
  shopDomain,
  onRenderStateChange,
}: NativeSectionPreviewProps) {
  const { html, isLoading, error, refetch } = useNativePreviewRenderer({
    liquidCode,
    settings: settingsValues,
    blocks: blocksState,
    resources: loadedResources,
    shopDomain,
    debounceMs: 600,
  });

  // Notify parent of loading state
  useEffect(() => {
    onRenderStateChange?.(isLoading);
  }, [isLoading, onRenderStateChange]);

  return (
    <s-stack blockSize="100%" gap="none">
      {/* Error banner */}
      {error && (
        <s-box padding="small">
          <s-banner tone="warning" dismissible>
            Preview error: {error}
            <s-button slot="secondary-actions" variant="tertiary" onClick={refetch}>Retry</s-button>
          </s-banner>
        </s-box>
      )}

      {/* Preview frame */}
      <s-box blockSize="100%">
        <NativePreviewFrame
          html={html}
          isLoading={isLoading}
          deviceSize={deviceSize}
        />
      </s-box>
    </s-stack>
  );
}
