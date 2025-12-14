/**
 * MessageList component - Scrollable message container
 * Handles auto-scroll and empty state
 */
import { useAutoScroll } from './hooks/useAutoScroll';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import type { UIMessage } from '../../types';

export interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  streamingContent: string;
}

export function MessageList({
  messages,
  isStreaming,
  streamingContent,
}: MessageListProps) {
  const { containerRef, handleScroll } = useAutoScroll<HTMLDivElement>({
    enabled: true,
  });

  return (
    <div
      ref={containerRef}
      className="chat-message-list"
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.length === 0 ? (
        <div className="chat-empty-state">
          <div className="chat-empty-state__icon">💬</div>
          <p className="chat-empty-state__title">Start a conversation</p>
          <p className="chat-empty-state__examples">
            Ask me to modify your section. Try:<br />
            &quot;Make the heading larger&quot; or &quot;Add a call-to-action button&quot;
          </p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
            />
          ))}

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
        </>
      )}
    </div>
  );
}
