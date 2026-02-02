/**
 * Chat state management hook
 * Handles message state, streaming, and API communication
 * Integrates with useStreamingProgress for build phase tracking
 */
import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type { UIMessage, StreamEvent, GenerationStatus } from '../../../types';
import { parseError, formatErrorMessage, createUpgradeError, type ChatError, type ApiErrorResponse } from '../../../utils/error-handler';
import { useStreamingProgress, type StreamingProgress } from './useStreamingProgress';

interface FailedMessage {
  content: string;
  error: ChatError;
}

interface ChatState {
  messages: UIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  pendingMessageId: string | null;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_MESSAGES'; messages: UIMessage[] }
  | { type: 'ADD_USER_MESSAGE'; message: UIMessage }
  | { type: 'START_STREAMING' }
  | { type: 'APPEND_CONTENT'; content: string }
  | { type: 'COMPLETE_STREAMING'; message: UIMessage }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };

    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message],
        error: null,
      };

    case 'START_STREAMING':
      return {
        ...state,
        isStreaming: true,
        streamingContent: '',
        error: null,
      };

    case 'APPEND_CONTENT':
      return {
        ...state,
        streamingContent: state.streamingContent + action.content,
      };

    case 'COMPLETE_STREAMING': {
      // Prevent duplicate messages - check if an assistant message already exists
      // after the last user message (guards against race conditions)
      let lastUserIndex = -1;
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === 'user') {
          lastUserIndex = i;
          break;
        }
      }
      const hasAssistantAfterUser = state.messages.slice(lastUserIndex + 1).some((m: UIMessage) => m.role === 'assistant');
      const messageExists = state.messages.some((m: UIMessage) => m.id === action.message.id);

      if (messageExists || hasAssistantAfterUser) {
        // Already have an assistant response, just clear streaming state
        return {
          ...state,
          isStreaming: false,
          streamingContent: '',
        };
      }

      return {
        ...state,
        isStreaming: false,
        streamingContent: '',
        messages: [...state.messages, action.message],
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        isStreaming: false,
        error: action.error,
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  streamingContent: '',
  pendingMessageId: null,
  error: null,
};

export interface UseChatOptions {
  conversationId: string;
  currentCode?: string;
  onCodeUpdate?: (code: string) => void;
}

// Initial generation status (simplified - server handles continuation)
const initialGenerationStatus: GenerationStatus = {
  isGenerating: false,
};

export function useChat({ conversationId, currentCode, onCodeUpdate }: UseChatOptions) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [failedMessage, setFailedMessage] = useState<FailedMessage | null>(null);
  // Phase 4: Track generation and continuation status for UI feedback
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(initialGenerationStatus);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Generation lock to prevent duplicate calls (not affected by React re-renders)
  const isGeneratingRef = useRef(false);
  // Track current generation to detect and abort duplicates
  const currentGenerationIdRef = useRef<string | null>(null);

  // Streaming progress tracking for build phases
  const {
    progress,
    processToken,
    reset: resetProgress,
  } = useStreamingProgress();

  // Cleanup AbortController on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Internal function to stream AI response
   * @param content - The user message content to respond to
   * @param skipAddMessage - If true, skip adding user message (for auto-generation)
   */
  const streamResponse = useCallback(async (content: string, skipAddMessage: boolean) => {
    // Generate unique ID for this generation request
    const generationId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Prevent duplicate concurrent calls using ref (survives React re-renders)
    if (isGeneratingRef.current) {
      console.warn('[useChat] Ignoring duplicate generation call, existing:', currentGenerationIdRef.current, 'new:', generationId);
      return;
    }

    // Set lock and track this generation
    isGeneratingRef.current = true;
    currentGenerationIdRef.current = generationId;
    console.log('[useChat] Starting generation:', generationId, 'skipAddMessage:', skipAddMessage);

    // Set generation status
    setGenerationStatus({ isGenerating: true });

    // Abort any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('content', content.trim());
      if (currentCode) {
        formData.append('currentCode', currentCode);
      }
      if (skipAddMessage) {
        formData.append('continueGeneration', 'true');
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Try to parse error response body for upgrade-required errors
        try {
          const errorData: ApiErrorResponse = await response.json();
          if (errorData.upgradeRequired) {
            const upgradeError = createUpgradeError(errorData);
            dispatch({
              type: 'SET_ERROR',
              error: formatErrorMessage(upgradeError),
            });
            setFailedMessage({ content: content.trim(), error: upgradeError });
            return; // Exit early, don't throw
          }
          // Re-throw with server message if available
          throw new Error(errorData.error || `HTTP ${response.status}`);
        } catch (parseErr) {
          // If JSON parsing fails, throw generic HTTP error
          if (parseErr instanceof SyntaxError) {
            throw new Error(`HTTP ${response.status}`);
          }
          throw parseErr; // Re-throw if it's our error from above
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let codeSnapshot: string | undefined;

      // Store server's real message ID from message_complete event
      let serverMessageId: string | undefined;

      // Buffer for incomplete lines split across chunks
      let lineBuffer = '';

      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;
        const value = result.value;

        const chunk = decoder.decode(value, { stream: true });
        // Prepend any incomplete line from previous chunk
        const fullChunk = lineBuffer + chunk;
        const lines = fullChunk.split('\n');

        // If chunk doesn't end with newline, last "line" is incomplete - buffer it
        if (!chunk.endsWith('\n')) {
          lineBuffer = lines.pop() || '';
        } else {
          lineBuffer = '';
        }

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'content_delta':
                  if (event.data.content) {
                    assistantContent += event.data.content;
                    dispatch({ type: 'APPEND_CONTENT', content: event.data.content });
                    // Track progress through build phases
                    processToken(event.data.content);
                  }
                  break;

                case 'message_complete':
                  // Capture server's real message ID to sync client state with DB
                  serverMessageId = event.data.messageId;

                  // Use server-provided code directly (no client extraction)
                  if (event.data.hasCode && event.data.codeSnapshot) {
                    codeSnapshot = event.data.codeSnapshot;
                  }

                  if (codeSnapshot && onCodeUpdate) {
                    onCodeUpdate(codeSnapshot);
                  }
                  break;

                case 'error':
                  throw new Error(event.data.error || 'Stream error');
              }
            } catch {
              // Ignore JSON parse errors for partial chunks
            }
          }
        }
      }

      // Add completed assistant message using server's real ID to prevent duplicate versions
      const assistantMessage: UIMessage = {
        id: serverMessageId || `assistant-${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: assistantContent,
        codeSnapshot,
        createdAt: new Date(),
      };
      dispatch({ type: 'COMPLETE_STREAMING', message: assistantMessage });

      // Update final generation status
      setGenerationStatus({ isGenerating: false });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Cancelled by user
      }

      const chatError = parseError(error);
      dispatch({
        type: 'SET_ERROR',
        error: formatErrorMessage(chatError),
      });

      // Store failed message for manual retry
      setFailedMessage({ content: content.trim(), error: chatError });
    } finally {
      // Always reset generation lock
      console.log('[useChat] Generation complete:', generationId);
      isGeneratingRef.current = false;
      currentGenerationIdRef.current = null;
    }
  }, [conversationId, currentCode, onCodeUpdate, processToken]);

  const sendMessage = useCallback(async (content: string) => {
    console.log('[useChat] sendMessage called, isStreaming:', state.isStreaming, 'isGenerating:', isGeneratingRef.current);
    if (!content.trim() || state.isStreaming) return;

    // Double-check generation lock (belt and suspenders)
    if (isGeneratingRef.current) {
      console.warn('[useChat] sendMessage blocked by isGeneratingRef');
      return;
    }

    // Reset progress for new generation
    resetProgress();

    // Optimistically add user message
    const userMessage: UIMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    };
    dispatch({ type: 'ADD_USER_MESSAGE', message: userMessage });
    dispatch({ type: 'START_STREAMING' });

    await streamResponse(content, false);
  }, [conversationId, state.isStreaming, streamResponse, resetProgress]);

  /**
   * Trigger AI generation for an existing user message (no new message added)
   * Used for auto-generation when redirected from /new route
   */
  const triggerGeneration = useCallback(async (content: string) => {
    console.log('[useChat] triggerGeneration called, isStreaming:', state.isStreaming, 'isGenerating:', isGeneratingRef.current);
    if (!content.trim() || state.isStreaming) return;

    // Double-check generation lock (belt and suspenders)
    if (isGeneratingRef.current) {
      console.warn('[useChat] triggerGeneration blocked by isGeneratingRef');
      return;
    }

    // Reset progress for new generation
    resetProgress();

    dispatch({ type: 'START_STREAMING' });
    await streamResponse(content, true);
  }, [state.isStreaming, streamResponse, resetProgress]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'COMPLETE_STREAMING', message: {
      id: `cancelled-${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: state.streamingContent + '\n\n[Generation stopped]',
      createdAt: new Date(),
    }});
  }, [conversationId, state.streamingContent]);

  const loadMessages = useCallback((messages: UIMessage[]) => {
    dispatch({ type: 'SET_MESSAGES', messages });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
    setFailedMessage(null);
  }, []);

  const retryFailedMessage = useCallback(() => {
    if (failedMessage) {
      clearError();
      sendMessage(failedMessage.content);
      setFailedMessage(null);
    }
  }, [failedMessage, clearError, sendMessage]);

  const clearConversation = useCallback(() => {
    dispatch({ type: 'SET_MESSAGES', messages: [] });
    setFailedMessage(null);
  }, []);

  /**
   * Restore a previous version as a new version (Phase 2)
   * Calls restore API and adds new message to state
   */
  const restoreVersion = useCallback(async (
    versionId: string,
    versionNumber: number,
    _versionCode: string // Unused - code is fetched server-side for security
  ): Promise<UIMessage | null> => {
    // Prevent restore during streaming
    if (state.isStreaming || isGeneratingRef.current) {
      console.warn('[useChat] Cannot restore during streaming');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('fromVersionId', versionId);
      formData.append('fromVersionNumber', String(versionNumber));

      const response = await fetch('/api/chat/restore', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.message) {
        // Add restored message to state with restore metadata
        const restoredMessage: UIMessage = {
          ...data.message,
          createdAt: new Date(data.message.createdAt),
          isRestoreMessage: true,
          restoredFromVersion: versionNumber,
        };

        dispatch({ type: 'COMPLETE_STREAMING', message: restoredMessage });

        // Apply code to preview
        if (restoredMessage.codeSnapshot && onCodeUpdate) {
          onCodeUpdate(restoredMessage.codeSnapshot);
        }

        return restoredMessage;
      }

      return null;
    } catch (error) {
      const chatError = parseError(error);
      dispatch({
        type: 'SET_ERROR',
        error: formatErrorMessage(chatError),
      });
      return null;
    }
  }, [conversationId, state.isStreaming, onCodeUpdate]);

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    streamingContent: state.streamingContent,
    error: state.error,
    failedMessage,
    progress, // Build phase progress
    generationStatus, // Phase 4: Generation and continuation status for UI feedback
    sendMessage,
    triggerGeneration,
    stopStreaming,
    loadMessages,
    clearError,
    retryFailedMessage,
    clearConversation,
    restoreVersion, // Phase 2: Restore version functionality
  };
}

export type { ChatState, ChatAction, StreamingProgress };
