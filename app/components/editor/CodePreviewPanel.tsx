import { useState, useCallback, type MutableRefObject } from 'react';
import { CodePreview } from '../generate/CodePreview';
import { SectionPreview, PreviewErrorBoundary } from '../preview';
import type { DeviceSize } from '../preview/types';
import type { SettingsState, BlockInstance } from '../preview/schema/SchemaTypes';
import type { MockProduct, MockCollection } from '../preview/mockData/types';

interface CodePreviewPanelProps {
  code: string;
  fileName: string;
  isViewingHistory?: boolean;
  versionNumber?: number;
  onReturnToCurrent?: () => void;
  // Device selector props
  deviceSize: DeviceSize;
  onDeviceSizeChange: (size: DeviceSize) => void;
  // Preview controls
  onRefresh?: () => void;
  isRendering?: boolean;
  // Preview settings (from usePreviewSettings hook)
  settingsValues?: SettingsState;
  blocksState?: BlockInstance[];
  loadedResources?: Record<string, MockProduct | MockCollection>;
  onRenderStateChange?: (isRendering: boolean) => void;
  onRefreshRef?: MutableRefObject<(() => void) | null>;
}

/**
 * Tabbed panel for code editor and live preview
 * Uses Polaris s-button-group for segmented control
 */
export function CodePreviewPanel({
  code,
  fileName,
  isViewingHistory,
  versionNumber,
  onReturnToCurrent,
  deviceSize,
  onDeviceSizeChange,
  onRefresh,
  isRendering,
  settingsValues,
  blocksState,
  loadedResources,
  onRenderStateChange,
  onRefreshRef,
}: CodePreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  return (
    <s-stack blockSize="100%" gap="none">
      {/* Header with segmented control and device selector */}
      <s-box
        padding="base"
        borderWidth="none none small none"
        borderColor="base"
        background="base"
      >
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          {/* Left: View mode tabs */}
          <s-button-group gap="none" accessibilityLabel="View mode">
            <s-button
              slot="secondary-actions"
              variant={activeTab === 'preview' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </s-button>
            <s-button
              slot="secondary-actions"
              variant={activeTab === 'code' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('code')}
            >
              Code
            </s-button>
          </s-button-group>

          {/* Center: Device selector (only in preview mode) */}
          {activeTab === 'preview' && (
            <s-button-group gap="none" accessibilityLabel="Device size">
              <s-button
                slot="secondary-actions"
                variant={deviceSize === 'mobile' ? 'primary' : 'tertiary'}
                onClick={() => onDeviceSizeChange('mobile')}
              >
                Mobile
              </s-button>
              <s-button
                slot="secondary-actions"
                variant={deviceSize === 'tablet' ? 'primary' : 'tertiary'}
                onClick={() => onDeviceSizeChange('tablet')}
              >
                Tablet
              </s-button>
              <s-button
                slot="secondary-actions"
                variant={deviceSize === 'desktop' ? 'primary' : 'tertiary'}
                onClick={() => onDeviceSizeChange('desktop')}
              >
                Desktop
              </s-button>
            </s-button-group>
          )}

          {/* Right: Actions */}
          <s-stack direction="inline" gap="small" alignItems="center">
            {/* Refresh button (only in preview mode) */}
            {activeTab === 'preview' && onRefresh && (
              <s-button
                variant="tertiary"
                onClick={onRefresh}
                disabled={isRendering || undefined}
                loading={isRendering || undefined}
                icon="refresh"
              >
                Refresh
              </s-button>
            )}
            {/* Version indicator when viewing history */}
            {isViewingHistory && versionNumber && (
              <>
                <s-badge tone="info">Viewing v{versionNumber}</s-badge>
                <s-button variant="tertiary" onClick={onReturnToCurrent}>
                  Return to current
                </s-button>
              </>
            )}
            {/* Copy button (only in code view, not when viewing history) */}
            {activeTab === 'code' && code && !isViewingHistory && (
              <s-button onClick={handleCopyCode} variant="secondary" icon={copied ? 'check' : undefined}>
                {copied ? 'Copied' : 'Copy All'}
              </s-button>
            )}
          </s-stack>
        </s-stack>
      </s-box>

      {/* Content area */}
      <s-box
        padding="base"
        background="subdued"
        blockSize="100%"
        overflow="hidden"
        {...(isViewingHistory && {
          border: 'base base dashed',
          borderRadius: 'base',
        })}
      >
        {activeTab === 'preview' ? (
          <PreviewErrorBoundary onRetry={() => setActiveTab('preview')}>
            <SectionPreview
              liquidCode={code}
              deviceSize={deviceSize}
              settingsValues={settingsValues}
              blocksState={blocksState}
              loadedResources={loadedResources}
              onRenderStateChange={onRenderStateChange}
              onRefreshRef={onRefreshRef}
            />
          </PreviewErrorBoundary>
        ) : (
          <CodePreview code={code} fileName={fileName} />
        )}
      </s-box>
    </s-stack>
  );
}
