/**
 * ChatPanel component - Main chat container
 * Uses 100% Polaris Web Components for structure
 * Supports version display and selection
 */
import { useEffect, useCallback, useRef } from "react";
import { useChat } from "./hooks/useChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ChatStyles } from "./ChatStyles";
import { VersionTimeline } from "./VersionTimeline";
import type { UIMessage, CodeVersion } from "../../types";

export interface ChatPanelProps {
  conversationId: string;
  initialMessages?: UIMessage[];
  currentCode?: string;
  onCodeUpdate?: (code: string) => void;
  /** Callback when messages change (for syncing with parent state) */
  onMessagesChange?: (messages: UIMessage[]) => void;
  // Version props
  versions?: CodeVersion[];
  selectedVersionId?: string | null;
  activeVersionId?: string | null;
  onVersionSelect?: (versionId: string | null) => void;
  onVersionApply?: (versionId: string) => void;
}

// Minimal inline styles required for flex layout (not available in s-box)
const containerStyle = {
  display: "flex",
  flexDirection: "column" as const,
  height: "100%",
  minHeight: 0,
};

const contentStyle = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column" as const,
};

export function ChatPanel({
  conversationId,
  initialMessages = [],
  currentCode,
  onCodeUpdate,
  onMessagesChange,
  versions = [],
  selectedVersionId,
  activeVersionId,
  onVersionSelect,
  onVersionApply,
}: ChatPanelProps) {
  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    failedMessage,
    sendMessage,
    triggerGeneration,
    stopStreaming,
    loadMessages,
    clearError,
    retryFailedMessage,
    clearConversation,
  } = useChat({
    conversationId,
    currentCode,
    onCodeUpdate,
  });

  // Track if we've already triggered auto-generation
  const hasTriggeredAutoGenRef = useRef(false);

  // Reset auto-trigger flag when conversation changes
  useEffect(() => {
    hasTriggeredAutoGenRef.current = false;
  }, [conversationId]);

  // Load initial messages
  useEffect(() => {
    if (initialMessages.length > 0) {
      loadMessages(initialMessages);
    }
  }, [initialMessages, loadMessages]);

  // Sync messages back to parent when they change
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // Auto-trigger AI generation if last message is user with no assistant response
  useEffect(() => {
    // Early exit for streaming or already triggered
    if (isStreaming || hasTriggeredAutoGenRef.current) return;
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const hasAssistantResponse = messages.some((m) => m.role === "assistant");

    // Trigger generation if last message is from user and no assistant response yet
    if (lastMessage.role === "user" && !hasAssistantResponse) {
      hasTriggeredAutoGenRef.current = true;
      triggerGeneration(lastMessage.content);
    }
  }, [messages, isStreaming, triggerGeneration]);

  const handleClearConversation = useCallback(() => {
    if (messages.length === 0) return;

    const confirmed = window.confirm(
      "Clear conversation history? This cannot be undone.",
    );

    if (confirmed) {
      clearConversation();
    }
  }, [messages.length, clearConversation]);

  return (
    <s-stack
      direction="block"
      gap="none"
      blockSize="100%"
      minBlockSize="0"
      background="base"
    >
      {/* Minimal CSS for animations only */}
      <ChatStyles />

      {/* Header */}
      <s-box
        padding="small base"
        borderWidth="none none small none"
        borderColor="subdued"
        background="base"
      >
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          {versions.length > 0 && (
            <VersionTimeline
              versions={versions}
              selectedVersionId={selectedVersionId ?? null}
              onSelect={onVersionSelect || (() => {})}
            />
          )}
          <s-tooltip id="clear-conversation-tooltip">
            Clear conversation
          </s-tooltip>
          {messages.length > 0 && (
            <s-button
              variant="tertiary"
              icon="refresh"
              onClick={handleClearConversation}
              disabled={isStreaming || undefined}
              accessibilityLabel="Clear conversation"
              interestFor="clear-conversation-tooltip"
            />
          )}
        </s-stack>
      </s-box>

      {/* Error banner */}
      {error && (
        <s-banner tone="critical" onDismiss={clearError}>
          <s-text>{error}</s-text>
          {failedMessage?.error.retryable && (
            <s-button
              slot="primary-action"
              variant="primary"
              onClick={retryFailedMessage}
            >
              Retry
            </s-button>
          )}
        </s-banner>
      )}

      {/* Message list */}
      <div style={{ flex: 1 }}>
        <s-stack direction="block" minBlockSize="0" gap="none">
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            versions={versions}
            selectedVersionId={selectedVersionId}
            activeVersionId={activeVersionId}
            onVersionSelect={onVersionSelect}
            onVersionApply={onVersionApply}
          />
        </s-stack>
      </div>

      {/* Input */}
      <s-stack direction="block" minBlockSize="0" gap="none">
        <ChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
        />
      </s-stack>
    </s-stack>
  );
}
