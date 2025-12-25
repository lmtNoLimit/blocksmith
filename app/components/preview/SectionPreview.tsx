import { AppProxyPreviewFrame } from './AppProxyPreviewFrame';
import type { DeviceSize } from './types';
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
  // Shop domain for native preview rendering
  shopDomain: string;
}

/**
 * Section preview component - renders Liquid code via App Proxy (native Shopify rendering)
 *
 * Uses direct iframe to App Proxy URL for native Liquid rendering.
 * Handles password-protected stores via browser-side authentication.
 */
export function SectionPreview({
  liquidCode,
  deviceSize = 'desktop',
  settingsValues = {},
  blocksState = [],
  loadedResources = {},
  onRenderStateChange,
  onRefreshRef,
  shopDomain,
}: SectionPreviewProps) {
  return (
    <AppProxyPreviewFrame
      liquidCode={liquidCode}
      shopDomain={shopDomain}
      deviceSize={deviceSize}
      settings={settingsValues}
      blocks={blocksState}
      resources={loadedResources}
      debounceMs={600}
      onRenderStateChange={onRenderStateChange}
      onRefreshRef={onRefreshRef}
    />
  );
}
