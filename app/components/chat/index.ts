/**
 * Chat components barrel export
 * Provides centralized imports for chat UI components
 */

// Main component
export { ChatPanel } from './ChatPanel';
export type { ChatPanelProps } from './ChatPanel';

// Sub-components
export { MessageList } from './MessageList';
export type { MessageListProps } from './MessageList';

export { MessageItem } from './MessageItem';
export type { MessageItemProps } from './MessageItem';

export { ChatInput } from './ChatInput';
export type { ChatInputProps } from './ChatInput';

export { CodeBlock } from './CodeBlock';
export type { CodeBlockProps } from './CodeBlock';

export { TypingIndicator } from './TypingIndicator';

// Version components
export { VersionBadge } from './VersionBadge';
export type { VersionBadgeProps } from './VersionBadge';

export { VersionCard } from './VersionCard';
export type { VersionCardProps } from './VersionCard';

export { VersionTimeline } from './VersionTimeline';
export type { VersionTimelineProps } from './VersionTimeline';

// Hooks
export { useChat } from './hooks/useChat';
export type { UseChatOptions, ChatState, ChatAction } from './hooks/useChat';

export { useAutoScroll } from './hooks/useAutoScroll';
export type { UseAutoScrollOptions } from './hooks/useAutoScroll';

// Style utilities
export { ChatStyles } from './ChatStyles';
