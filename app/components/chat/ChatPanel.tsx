/**
 * ChatPanel component - Main chat container
 * Uses pure Polaris Web Components for all styling
 * Supports version display, selection, and suggestion chips
 *
 * Layout: Header | Scrollable Messages | Fixed Input
 * - Full height using flex column layout
 * - MessageList scrolls, ChatInput stays at bottom
 */
import { useEffect, useCallback, useRef, useState } from "react";
import { useChat } from "./hooks/useChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { VersionTimeline } from "./VersionTimeline";
import { ErrorType } from "../../utils/error-handler";
import type { UIMessage, CodeVersion } from "../../types";
import type { Suggestion } from "./utils/suggestion-engine";

// Minimal CSS for keyframe animations (cursor blink, typing bounce)
import "./chat-animations.css";

/**
 * Minimal inline styles for flex layout.
 * Required because Polaris s-box doesn't support:
 * - display: flex (only block/none)
 * - flex: 1 for flexible sizing
 * Note: s-scroll-box is NOT available in app-home Polaris components
 * These styles enable the scrollable message list pattern.
 */
const containerStyles = {
  // Main panel: flex column to stack header, messages, input
  // Uses flex: 1 because parent (chat-panel-wrapper) is a flex container
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    minHeight: 0, // Critical: allows flex children to shrink below content size
    overflow: 'hidden', // Prevent content from overflowing the panel
  },
  // Messages area: takes remaining space as flex child
  // minHeight: 0 is critical - allows shrinking below content size for scrolling
  messages: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden', // Children handle their own scrolling
  },
};

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
    progress,
    generationStatus, // Phase 4: Continuation status for UI feedback
    sendMessage,
    triggerGeneration,
    stopStreaming,
    loadMessages,
    clearError,
    retryFailedMessage,
    clearConversation,
    restoreVersion,
  } = useChat({
    conversationId,
    currentCode,
    onCodeUpdate,
  });

  // Check if error is upgrade-required
  const isUpgradeRequired = failedMessage?.error?.type === ErrorType.UPGRADE_REQUIRED;
  const requiredPlan = failedMessage?.error?.upgradeRequired;

  // Track if we've already triggered auto-generation and loaded initial messages
  const hasTriggeredAutoGenRef = useRef(false);
  const hasLoadedInitialRef = useRef(false);
  // Track user-initiated sends to prevent auto-trigger race condition
  const isUserInitiatedSendRef = useRef(false);

  // Reset flags when conversation changes
  useEffect(() => {
    hasTriggeredAutoGenRef.current = false;
    hasLoadedInitialRef.current = false;
    isUserInitiatedSendRef.current = false;
  }, [conversationId]);

  // Load initial messages ONLY on first mount per conversation
  // After initial load, local state is authoritative - ignore parent updates
  // (Parent updates come from onMessagesChange sync, which creates circular dependency)
  useEffect(() => {
    if (hasLoadedInitialRef.current) return; // Already loaded, skip
    if (initialMessages.length === 0) return;

    hasLoadedInitialRef.current = true;
    loadMessages(initialMessages);
  }, [initialMessages, loadMessages]);

  // Sync messages back to parent when they change
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // Auto-trigger AI generation if last message is user with no assistant response
  // This is for route navigation (e.g., from /new), NOT for user-initiated sends
  useEffect(() => {
    // Skip if user just clicked send - prevents race condition with sendMessage
    if (isUserInitiatedSendRef.current) {
      isUserInitiatedSendRef.current = false;
      return;
    }

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

  // Phase 05: State for prefilled input from suggestion chips
  const [prefilledInput, setPrefilledInput] = useState<string>("");

  // Phase 05: Handle suggestion chip click
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    if (suggestion.prompt) {
      // Set prefilled input for ChatInput
      setPrefilledInput(suggestion.prompt);
    }
    // Handle special actions
    if (suggestion.id === 'preview-theme') {
      // Could emit event for parent to handle tab switch
      console.log('Preview in theme clicked');
    }
    if (suggestion.id === 'publish') {
      // Could emit event for parent to handle publish modal
      console.log('Publish to theme clicked');
    }
  }, []);

  // Phase 05: Handle copy code action
  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      // Could show toast notification
      console.log('Code copied to clipboard');
    }).catch((err) => {
      console.error('Failed to copy code:', err);
    });
  }, []);

  // Phase 05: Handle apply code action (uses onCodeUpdate if available)
  const handleApplyCode = useCallback((code: string) => {
    onCodeUpdate?.(code);
  }, [onCodeUpdate]);

  // Phase 2: Handle version restore (creates new version from old version's code)
  const handleVersionRestore = useCallback(async (versionId: string) => {
    // Find the version to restore
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    // Call restore API via useChat hook
    const restoredMessage = await restoreVersion(
      version.id,
      version.versionNumber,
      version.code
    );

    if (restoredMessage) {
      // Trigger auto-apply for the new version (handled by useVersionState)
      onVersionApply?.(restoredMessage.id);
    }
  }, [versions, restoreVersion, onVersionApply]);

  // Phase 05: Clear prefilled input after send
  const handleSend = useCallback((message: string) => {
    // Flag user-initiated send to prevent auto-trigger race condition
    isUserInitiatedSendRef.current = true;
    sendMessage(message);
    setPrefilledInput("");
  }, [sendMessage]);

  // Wrap retry to also prevent auto-trigger race condition
  const handleRetry = useCallback(() => {
    isUserInitiatedSendRef.current = true;
    retryFailedMessage();
  }, [retryFailedMessage]);

  return (
    <div style={containerStyles.panel}>
      {/* Header - fixed at top */}
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
        <s-banner tone={isUpgradeRequired ? "info" : "critical"} onDismiss={clearError}>
          <s-text>{error}</s-text>
          {isUpgradeRequired ? (
            <s-button
              slot="primary-action"
              variant="primary"
              href="/app/billing"
            >
              Upgrade to {requiredPlan === "agency" ? "Agency" : "Pro"}
            </s-button>
          ) : failedMessage?.error.retryable ? (
            <s-button
              slot="primary-action"
              variant="primary"
              onClick={handleRetry}
            >
              Retry
            </s-button>
          ) : null}
        </s-banner>
      )}

      {/* Message list - scrollable, takes remaining space */}
      <div style={containerStyles.messages}>
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          progress={progress}
          generationStatus={generationStatus}
          versions={versions}
          selectedVersionId={selectedVersionId}
          activeVersionId={activeVersionId}
          onVersionSelect={onVersionSelect}
          onVersionApply={handleVersionRestore}
          // Phase 05: Suggestion chips handlers
          onSuggestionClick={handleSuggestionClick}
          onCopyCode={handleCopyCode}
          onApplyCode={handleApplyCode}
        />
      </div>

      {/* Input - fixed at bottom */}
      <ChatInput
        onSend={handleSend}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        prefilledValue={prefilledInput}
        onPrefilledClear={() => setPrefilledInput("")}
      />
    </div>
  );
}
