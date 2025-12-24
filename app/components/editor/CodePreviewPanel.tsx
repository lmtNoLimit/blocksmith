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

// Flex-based layout for proper scrolling
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    minHeight: 0,
  },
  header: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    // Removed overflow:hidden - let innerContent handle scrolling
    background: 'var(--p-color-bg-surface-secondary)',
    padding: '16px',
  },
  innerContent: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
  },
} as const;

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
    <div style={styles.container}>
      {/* Header with segmented control and device selector */}
      <div style={styles.header}>
        <s-box
          padding="base"
          borderWidth="none none small none"
          borderColor="subdued"
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
                <s-button onClick={handleCopyCode} variant="secondary">
                  {copied ? '✓ Copied' : 'Copy All'}
                </s-button>
              )}
            </s-stack>
          </s-stack>
        </s-box>
      </div>

      {/* Content area - dashed border when viewing history */}
      <div
        style={{
          ...styles.content,
          ...(isViewingHistory && {
            border: '2px dashed var(--p-color-border-info)',
            borderRadius: '8px',
            margin: '8px',
          }),
        }}
      >
        <div style={styles.innerContent}>
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
        </div>
      </div>
    </div>
  );
}
