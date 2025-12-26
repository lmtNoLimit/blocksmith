/**
 * MessageItem component - Individual chat message display
 * Supports both user and assistant messages with code block parsing
 * Shows version badge for AI messages with codeSnapshot
 */
import { memo } from 'react';
import type { UIMessage } from '../../types';
import { CodeBlock } from './CodeBlock';
import { VersionCard } from './VersionCard';

export interface MessageItemProps {
  message: UIMessage;
  isStreaming?: boolean;
  // Version display props
  versionNumber?: number;
  isSelected?: boolean;
  isLatest?: boolean;
  isActive?: boolean; // This version is current active draft
  onVersionSelect?: () => void;
  onVersionApply?: () => void;
}

interface ContentPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

/**
 * Parse message content to extract code blocks
 * Uses linear-time string scanning to avoid ReDoS vulnerabilities
 */
function parseMessageContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let currentIndex = 0;

  while (currentIndex < content.length) {
    // Find next code block start
    const startMarker = content.indexOf('```', currentIndex);

    if (startMarker === -1) {
      // No more code blocks, add remaining text
      const text = content.slice(currentIndex).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
      break;
    }

    // Add text before code block
    if (startMarker > currentIndex) {
      const text = content.slice(currentIndex, startMarker).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
    }

    // Find language identifier (optional, on same line)
    const lineEnd = content.indexOf('\n', startMarker);
    if (lineEnd === -1) {
      // Malformed: no newline after opening ```
      const text = content.slice(startMarker).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
      break;
    }

    const langLine = content.slice(startMarker + 3, lineEnd).trim();
    const language = /^\w+$/.test(langLine) ? langLine : 'liquid';

    // Find closing ```
    const endMarker = content.indexOf('```', lineEnd + 1);
    if (endMarker === -1) {
      // No closing marker, treat rest as text
      const text = content.slice(startMarker).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
      break;
    }

    // Extract code content
    const codeContent = content.slice(lineEnd + 1, endMarker).trim();
    if (codeContent) {
      parts.push({
        type: 'code',
        content: codeContent,
        language,
      });
    }

    currentIndex = endMarker + 3;
  }

  // If no parts found, treat entire content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
}

/**
 * Memoized MessageItem with custom comparison
 * Only re-renders when content, streaming, or version state changes
 */
export const MessageItem = memo(function MessageItem({
  message,
  isStreaming = false,
  versionNumber,
  isSelected = false,
  isLatest: _isLatest = false,
  isActive = false,
  onVersionSelect,
  onVersionApply,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const parts = parseMessageContent(message.content);

  // Show version badge for AI messages with code
  const showVersionBadge = !isUser && message.codeSnapshot && versionNumber;

  // Build class names
  const classNames = [
    'chat-message',
    `chat-message--${message.role}`,
    isSelected ? 'chat-message--selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      role="article"
      aria-label={`${isUser ? 'You' : 'AI Assistant'} said`}
    >
      <div className="chat-message__avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="chat-message__content">
        {/* Message content parts */}
        {parts.map((part, index) => (
          part.type === 'code' ? (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language || 'liquid'}
            />
          ) : (
            <p key={index} className="chat-message__text">
              {part.content}
              {isStreaming && index === parts.length - 1 && (
                <span className="chat-cursor" aria-hidden="true">▋</span>
              )}
            </p>
          )
        ))}

        {/* Version Card for AI messages with code */}
        {showVersionBadge && (
          <VersionCard
            versionNumber={versionNumber}
            createdAt={message.createdAt}
            isActive={isActive}
            isSelected={isSelected}
            onPreview={onVersionSelect || (() => {})}
            onRestore={onVersionApply || (() => {})}
          />
        )}

        {/* Error display */}
        {message.isError && (
          <div className="chat-message__error">
            {message.errorMessage || 'An error occurred'}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Re-render if content, streaming, or version state changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.versionNumber === nextProps.versionNumber &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isLatest === nextProps.isLatest &&
    prevProps.isActive === nextProps.isActive
  );
});
