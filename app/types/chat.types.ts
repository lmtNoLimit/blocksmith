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
  | 'continuation_start'
  | 'continuation_complete'
  | 'message_complete'
  | 'error';

// Continuation start event data (Phase 4: UI Feedback)
export interface ContinuationStartData {
  attempt: number;
  reason: 'token_limit' | 'incomplete_code';
  errors: string[];
}

// Continuation complete event data (Phase 4: UI Feedback)
export interface ContinuationCompleteData {
  attempt: number;
  isComplete: boolean;
  totalLength: number;
}

// Message complete event data with completion metadata (Phase 4: UI Feedback)
export interface MessageCompleteData {
  messageId?: string;
  codeSnapshot?: string;
  hasCode?: boolean;
  changes?: string[];
  wasComplete?: boolean; // true if code is complete (no continuation needed or successful)
  continuationCount?: number; // number of continuation attempts
}

export interface StreamEvent {
  type: StreamEventType;
  data: {
    messageId?: string;
    content?: string;
    codeSnapshot?: string;
    changes?: string[];
    error?: string;
    // Continuation fields (Phase 4)
    attempt?: number;
    reason?: 'token_limit' | 'incomplete_code';
    errors?: string[];
    isComplete?: boolean;
    totalLength?: number;
    wasComplete?: boolean;
    continuationCount?: number;
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

// Generation status for UI feedback (Phase 4: UI Feedback)
export interface GenerationStatus {
  isGenerating: boolean;
  isContinuing: boolean;
  continuationAttempt: number;
  wasComplete: boolean;
  continuationCount: number;
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
