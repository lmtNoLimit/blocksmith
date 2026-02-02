/**
 * Chat type definitions for AI conversation feature
 */

// Chat message roles
export type MessageRole = 'user' | 'assistant' | 'system';

// UIMessage - full message for display in chat panel
export interface UIMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  codeSnapshot?: string;
  changes?: string[]; // Phase 3: change summary bullets from AI
  tokenCount?: number;
  isError?: boolean;
  errorMessage?: string;
  createdAt: Date;
  // Restore tracking (Phase 2)
  isRestoreMessage?: boolean; // true for system restore messages
  restoredFromVersion?: number; // source version number if isRestore
}

// ModelMessage - stripped for API calls to AI
export interface ModelMessage {
  role: MessageRole;
  content: string;
}

// Conversation state for client
export interface ConversationState {
  id: string;
  sectionId: string;
  messages: UIMessage[];
  isStreaming: boolean;
  pendingMessage?: string;
}

// API request/response types
export interface SendMessageRequest {
  conversationId: string;
  content: string;
  currentCode?: string; // Include current section code for context
}

export interface SendMessageResponse {
  message: UIMessage;
  updatedCode?: string; // Extracted code from assistant response
}

// Streaming event types for SSE
export type StreamEventType =
  | 'message_start'
  | 'content_delta'
  | 'message_complete'
  | 'error';

// Message complete event data
export interface MessageCompleteData {
  messageId?: string;
  hasCode?: boolean;
  codeSnapshot?: string;
}

export interface StreamEvent {
  type: StreamEventType;
  data: {
    messageId?: string;
    content?: string;
    error?: string;
    hasCode?: boolean;
    codeSnapshot?: string; // Server sends extracted code directly
    // CRO reasoning (Phase 3)
    croReasoning?: unknown;
    hasCROReasoning?: boolean;
  };
}

// Code version derived from messages with codeSnapshot
export interface CodeVersion {
  id: string; // message ID
  versionNumber: number; // 1-indexed
  code: string; // codeSnapshot content
  createdAt: Date;
  messageContent: string; // AI response text (truncated for display)
  // Restore tracking (Phase 2)
  isRestore?: boolean; // true if this version was restored from another
  restoredFromVersion?: number; // source version number if isRestore
}

// Generation status for UI feedback (simplified - server handles continuation)
export interface GenerationStatus {
  isGenerating: boolean;
}

// Code completion status for badges (Phase 4: UI Feedback)
export type CompletionStatus = 'complete' | 'potentially-incomplete' | 'generating';

// Conversation metadata (without messages)
export interface ConversationMeta {
  id: string;
  sectionId: string;
  shop: string;
  title?: string;
  messageCount: number;
  totalTokens: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
