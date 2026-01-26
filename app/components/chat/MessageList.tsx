/**
 * MessageList component - Scrollable message container
 * Uses Polaris Web Components for styling, native CSS for scrolling
 * Handles auto-scroll, version display, build progress, and suggestion chips
 *
 * Scroll Strategy: Uses flex layout + overflow-y:auto
 * - ChatPanelWrapper: flex container with height:100%
 * - ChatPanel: flex:1 + minHeight:0 to allow shrinking
 * - MessageList: height:100% + overflow-y:auto for scrolling
 * Note: s-scroll-box is NOT available in app-home Polaris components
 */
import { useAutoScroll } from './hooks/useAutoScroll';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import { BuildProgressIndicator } from './BuildProgressIndicator';
import { StreamingCodeBlock } from './StreamingCodeBlock';
import type { UIMessage, CodeVersion, GenerationStatus } from '../../types';
import type { StreamingProgress } from './hooks/useStreamingProgress';
import type { Suggestion } from './utils/suggestion-engine';

// Minimal inline styles for non-Polaris features
// Note: s-scroll-box is NOT available in app-home Polaris components
// We must use native CSS for scrolling
const styles = {
  // Scroll container - fills parent and enables vertical scrolling
  // Parent must have explicit height (flex container with minHeight:0)
  scrollContainer: {
    height: '100%',
    overflowY: 'auto' as const,
  },
  bubbleRadius: {
    borderRadius: '16px 16px 16px 4px',
  },
  cursor: {
    display: 'inline-block',
    width: '2px',
    height: '1em',
    background: 'currentColor',
    marginLeft: '2px',
    animation: 'cursor-blink 1s ease-in-out infinite',
  },
};

/**
 * Extract code from markdown code block in streaming content
 * Handles partial/incomplete code blocks during streaming
 */
function extractCodeFromContent(content: string): string {
  const codeBlockStart = content.indexOf('```');
  if (codeBlockStart === -1) return '';

  // Find the end of the language line
  const lineEnd = content.indexOf('\n', codeBlockStart);
  if (lineEnd === -1) return '';

  // Find closing ``` or use rest of content if incomplete
  const codeBlockEnd = content.indexOf('```', lineEnd + 1);
  const codeContent = codeBlockEnd !== -1
    ? content.slice(lineEnd + 1, codeBlockEnd)
    : content.slice(lineEnd + 1); // Partial code block

  return codeContent.trim();
}

export interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  // Build progress props
  progress?: StreamingProgress;
  // Phase 4: Generation status for continuation feedback
  generationStatus?: GenerationStatus;
  // Version props
  versions?: CodeVersion[];
  selectedVersionId?: string | null;
  activeVersionId?: string | null;
  onVersionSelect?: (versionId: string) => void;
  onVersionApply?: (versionId: string) => void;
  // Suggestion chips handlers (Phase 05)
  onSuggestionClick?: (suggestion: Suggestion) => void;
  onCopyCode?: (code: string) => void;
  onApplyCode?: (code: string) => void;
}

export function MessageList({
  messages,
  isStreaming,
  streamingContent,
  progress,
  generationStatus,
  versions = [],
  selectedVersionId,
  activeVersionId,
  onVersionSelect,
  onVersionApply,
  // Suggestion chips handlers (Phase 05)
  onSuggestionClick,
  onCopyCode,
  onApplyCode,
}: MessageListProps) {
  const { containerRef, handleScroll } = useAutoScroll<HTMLDivElement>({
    enabled: true,
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={styles.scrollContainer}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <s-box padding="small-400">
        {messages.length === 0 ? (
          <s-box padding="large-500" minBlockSize="250px">
            <s-stack direction="block" gap="large" alignItems="center">
              {/* Icon with Polaris styling */}
              <s-box
                background="subdued"
                padding="base"
                borderRadius="large"
              >
                <s-icon type="chat" />
              </s-box>

              {/* Title and description */}
              <s-stack direction="block" gap="small" alignItems="center">
                <s-text type="strong">Start a conversation</s-text>
                <s-text color="subdued">
                  Describe the changes you want to make to your section.
                  <br />
                  I can help you modify layouts, styles, content, and more.
                </s-text>
              </s-stack>

              {/* Suggestion chips using Polaris s-badge */}
              <s-stack direction="inline" gap="small">
                <s-badge>Make the heading larger</s-badge>
                <s-badge>Add a CTA button</s-badge>
                <s-badge>Change colors</s-badge>
              </s-stack>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="none">
            {messages.map((message, index) => {
              // Find version info for this message
              const version = versions.find((v) => v.id === message.id);
              const isLatestVersion =
                version && versions.indexOf(version) === versions.length - 1;
              // Phase 05: Determine if this is the latest message (for suggestion chips)
              const isLatestMessage = index === messages.length - 1;

              // Use version.code as fallback (includes extracted code from content)
              const effectiveCode = message.codeSnapshot || version?.code;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  versionNumber={version?.versionNumber}
                  isSelected={selectedVersionId === message.id}
                  isLatest={isLatestVersion || false}
                  isActive={activeVersionId === message.id}
                  isStreaming={isStreaming}
                  onVersionSelect={() => onVersionSelect?.(message.id)}
                  onVersionApply={() => onVersionApply?.(message.id)}
                  // Phase 05: Suggestion chips props
                  messageCount={messages.length}
                  isLatestMessage={isLatestMessage}
                  onSuggestionClick={onSuggestionClick}
                  onCopyCode={effectiveCode ? () => onCopyCode?.(effectiveCode) : undefined}
                  onApplyCode={effectiveCode ? () => onApplyCode?.(effectiveCode) : undefined}
                />
              );
            })}

            {/* Streaming message with build progress */}
            {isStreaming && (
              <s-stack direction="block" gap="small">
                {/* Build progress indicator */}
                {progress && (
                  <BuildProgressIndicator
                    phases={progress.phases}
                    currentPhase={progress.currentPhase}
                    percentage={progress.percentage}
                    isComplete={progress.isComplete}
                  />
                )}

                {/* Phase 4: Continuation indicator */}
                {generationStatus?.isContinuing && (
                  <s-box padding="small base" background="subdued">
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-spinner size="base" />
                      <s-text color="subdued">
                        Completing section (attempt {generationStatus.continuationAttempt}/2)...
                      </s-text>
                    </s-stack>
                  </s-box>
                )}

                {/* Streaming code block (if code detected) */}
                {streamingContent && streamingContent.includes('```') && (
                  <StreamingCodeBlock
                    code={extractCodeFromContent(streamingContent)}
                    isStreaming={isStreaming}
                    language="liquid"
                    maxHeight="250px"
                  />
                )}

                {/* Typing indicator when waiting for first token or generating */}
                {!streamingContent ? (
                  <TypingIndicator />
                ) : (
                  /* Simple "Generating..." message while streaming */
                  <s-box padding="small">
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-avatar initials="AI" size="small" />
                      <div style={styles.bubbleRadius}>
                        <s-box
                          background="subdued"
                          border="small"
                          borderColor="subdued"
                          padding="small base"
                        >
                          <s-text>
                            Generating your section
                            <span style={styles.cursor} aria-hidden="true" />
                          </s-text>
                        </s-box>
                      </div>
                    </s-stack>
                  </s-box>
                )}
              </s-stack>
            )}
          </s-stack>
        )}
      </s-box>
    </div>
  );
}
