import { useState, useCallback, useRef, useMemo, type MutableRefObject } from 'react';
import { CodePreview } from '../generate/CodePreview';
import { SectionPreview, PreviewErrorBoundary } from '../preview';
import { CodeDiffView } from './CodeDiffView';
import { calculateDiff } from './diff/diff-engine';
import type { DeviceSize } from '../preview/types';
import type { SettingsState, BlockInstance } from '../preview/schema/SchemaTypes';
import type { MockProduct, MockCollection } from '../preview/mockData/types';

interface CodePreviewPanelProps {
  code: string;
  fileName: string;
  isViewingHistory?: boolean;
  versionNumber?: number;
  onReturnToCurrent?: () => void;
  deviceSize: DeviceSize;
  onDeviceSizeChange: (size: DeviceSize) => void;
  onRefresh?: () => void;
  isRendering?: boolean;
  settingsValues?: SettingsState;
  blocksState?: BlockInstance[];
  loadedResources?: Record<string, MockProduct | MockCollection>;
  onRenderStateChange?: (isRendering: boolean) => void;
  onRefreshRef?: MutableRefObject<(() => void) | null>;
  shopDomain: string;
  /** Previous code baseline for diff comparison */
  previousCode?: string;
  /** Callback when user accepts current changes as new baseline */
  onAcceptChanges?: () => void;
}

type ViewTab = 'preview' | 'code' | 'diff';

/**
 * Tabbed panel for code editor, live preview, and diff view
 * Supports color-coded diff with additions/deletions
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
  shopDomain,
  previousCode,
  onAcceptChanges,
}: CodePreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('preview');
  const [copied, setCopied] = useState(false);

  // Track initial code as baseline if no previousCode provided
  const initialCodeRef = useRef(code);
  const effectivePreviousCode = previousCode ?? initialCodeRef.current;

  // Calculate diff
  const diff = useMemo(
    () => calculateDiff(effectivePreviousCode, code),
    [effectivePreviousCode, code]
  );

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  const handleAcceptChanges = useCallback(() => {
    if (onAcceptChanges) {
      onAcceptChanges();
    } else {
      // Update internal baseline
      initialCodeRef.current = code;
    }
    setActiveTab('code');
  }, [code, onAcceptChanges]);

  return (
    <s-box blockSize="100%" display="auto">
      <s-stack direction="block" gap="none">
        {/* Header with segmented control and device selector */}
        <s-box
          padding="base"
          borderWidth="none none small none"
          borderColor="base"
          background="base"
        >
          <s-stack direction="inline" justifyContent="space-between" alignItems="center">
            {/* Left: View mode tabs - using s-stack for segmented control */}
            <s-stack direction="inline" gap="none">
              <s-button
                variant={activeTab === 'preview' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </s-button>
              <s-button
                variant={activeTab === 'code' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('code')}
              >
                Code
              </s-button>
              {/* Diff tab - only show if there are changes */}
              {diff.hasDiff && (
                <s-button
                  variant={activeTab === 'diff' ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab('diff')}
                >
                  Diff ({diff.stats.additions + diff.stats.deletions})
                </s-button>
              )}
            </s-stack>

            {/* Center: Device selector (only in preview mode) */}
            {activeTab === 'preview' && (
              <s-stack direction="inline" gap="none">
                <s-button
                  variant={deviceSize === 'mobile' ? 'primary' : 'secondary'}
                  onClick={() => onDeviceSizeChange('mobile')}
                >
                  Mobile
                </s-button>
                <s-button
                  variant={deviceSize === 'tablet' ? 'primary' : 'secondary'}
                  onClick={() => onDeviceSizeChange('tablet')}
                >
                  Tablet
                </s-button>
                <s-button
                  variant={deviceSize === 'desktop' ? 'primary' : 'secondary'}
                  onClick={() => onDeviceSizeChange('desktop')}
                >
                  Desktop
                </s-button>
              </s-stack>
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
              {/* Accept changes button (only in diff mode) */}
              {activeTab === 'diff' && diff.hasDiff && (
                <s-button variant="primary" onClick={handleAcceptChanges}>
                  Accept Changes
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
                <s-button
                  onClick={handleCopyCode}
                  variant="secondary"
                  icon={copied ? 'check' : undefined}
                >
                  {copied ? 'Copied' : 'Copy All'}
                </s-button>
              )}
            </s-stack>
          </s-stack>
        </s-box>

        {/* Content area */}
        <s-box
          background="subdued"
          overflow="hidden"
          minBlockSize="0"
          blockSize="100%"
          borderStyle={isViewingHistory ? 'dashed' : undefined}
          borderWidth={isViewingHistory ? 'small' : undefined}
          borderColor={isViewingHistory ? 'base' : undefined}
        >
          {activeTab === 'preview' && (
            <PreviewErrorBoundary onRetry={() => setActiveTab('preview')}>
              <SectionPreview
                liquidCode={code}
                deviceSize={deviceSize}
                settingsValues={settingsValues}
                blocksState={blocksState}
                loadedResources={loadedResources}
                onRenderStateChange={onRenderStateChange}
                onRefreshRef={onRefreshRef}
                shopDomain={shopDomain}
              />
            </PreviewErrorBoundary>
          )}
          {activeTab === 'code' && <CodePreview code={code} fileName={fileName} />}
          {activeTab === 'diff' && <CodeDiffView diff={diff} fileName={fileName} />}
        </s-box>
      </s-stack>
    </s-box>
  );
}
