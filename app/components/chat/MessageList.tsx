/**
 * MessageList component - Scrollable message container
 * Uses Polaris components for layout and empty state
 * Handles auto-scroll and version display
 */
import { useAutoScroll } from './hooks/useAutoScroll';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import type { UIMessage, CodeVersion } from '../../types';

export interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  // Version props
  versions?: CodeVersion[];
  selectedVersionId?: string | null;
  activeVersionId?: string | null;
  onVersionSelect?: (versionId: string) => void;
  onVersionApply?: (versionId: string) => void;
}

// Minimal inline styles for scrollable container (not available in Polaris)
const scrollContainerStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto' as const,
  scrollBehavior: 'smooth' as const,
};

export function MessageList({
  messages,
  isStreaming,
  streamingContent,
  versions = [],
  selectedVersionId,
  activeVersionId,
  onVersionSelect,
  onVersionApply,
}: MessageListProps) {
  const { containerRef, handleScroll } = useAutoScroll<HTMLDivElement>({
    enabled: true,
  });

  return (
    <div
      ref={containerRef}
      style={scrollContainerStyle}
      onScroll={handleScroll}
      className="chat-scroll"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <s-box padding="small-400">
        {messages.length === 0 ? (
          <s-box
            padding="large-500"
            minBlockSize="250px"
          >
            <s-stack direction="block" gap="large" alignItems="center">
              {/* Icon with gradient background */}
              <div className="chat-empty-icon">
                <s-icon type="chat" />
              </div>

              {/* Title and description */}
              <s-stack direction="block" gap="small" alignItems="center">
                <s-text type="strong">Start a conversation</s-text>
                <s-text color="subdued">
                  Describe the changes you want to make to your section.
                  <br />
                  I can help you modify layouts, styles, content, and more.
                </s-text>
              </s-stack>

              {/* Suggestion chips */}
              <s-stack direction="inline" gap="small">
                <span className="chat-suggestion" role="button" tabIndex={0}>
                  Make the heading larger
                </span>
                <span className="chat-suggestion" role="button" tabIndex={0}>
                  Add a CTA button
                </span>
                <span className="chat-suggestion" role="button" tabIndex={0}>
                  Change colors
                </span>
              </s-stack>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="none">
            {messages.map((message) => {
              // Find version info for this message
              const version = versions.find((v) => v.id === message.id);
              const isLatestVersion = version && versions.indexOf(version) === versions.length - 1;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  versionNumber={version?.versionNumber}
                  isSelected={selectedVersionId === message.id}
                  isLatest={isLatestVersion || false}
                  isActive={activeVersionId === message.id}
                  onVersionSelect={() => onVersionSelect?.(message.id)}
                  onVersionApply={() => onVersionApply?.(message.id)}
                />
              );
            })}

            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <MessageItem
                message={{
                  id: 'streaming',
                  conversationId: '',
                  role: 'assistant',
                  content: streamingContent,
                  createdAt: new Date(),
                }}
                isStreaming={true}
              />
            )}

            {/* Typing indicator when waiting for first token */}
            {isStreaming && !streamingContent && (
              <TypingIndicator />
            )}
          </s-stack>
        )}
      </s-box>
    </div>
  );
}
