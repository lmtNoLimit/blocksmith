/**
 * Chat state management hook
 * Handles message state, streaming, and API communication
 */
import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type { UIMessage, StreamEvent } from '../../../types';
import { parseError, formatErrorMessage, type ChatError } from '../../../utils/error-handler';

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

    case 'COMPLETE_STREAMING':
      return {
        ...state,
        isStreaming: false,
        streamingContent: '',
        messages: [...state.messages, action.message],
      };

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

export function useChat({ conversationId, currentCode, onCodeUpdate }: UseChatOptions) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [failedMessage, setFailedMessage] = useState<FailedMessage | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let codeSnapshot: string | undefined;

      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;
        const value = result.value;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'content_delta':
                  if (event.data.content) {
                    assistantContent += event.data.content;
                    dispatch({ type: 'APPEND_CONTENT', content: event.data.content });
                  }
                  break;

                case 'message_complete':
                  codeSnapshot = event.data.codeSnapshot;
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

      // Add completed assistant message
      const assistantMessage: UIMessage = {
        id: `assistant-${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: assistantContent,
        codeSnapshot,
        createdAt: new Date(),
      };
      dispatch({ type: 'COMPLETE_STREAMING', message: assistantMessage });

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
    }
  }, [conversationId, currentCode, onCodeUpdate]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || state.isStreaming) return;

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
  }, [conversationId, state.isStreaming, streamResponse]);

  /**
   * Trigger AI generation for an existing user message (no new message added)
   * Used for auto-generation when redirected from /new route
   */
  const triggerGeneration = useCallback(async (content: string) => {
    if (!content.trim() || state.isStreaming) return;

    dispatch({ type: 'START_STREAMING' });
    await streamResponse(content, true);
  }, [state.isStreaming, streamResponse]);

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

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    streamingContent: state.streamingContent,
    error: state.error,
    failedMessage,
    sendMessage,
    triggerGeneration,
    stopStreaming,
    loadMessages,
    clearError,
    retryFailedMessage,
    clearConversation,
  };
}

export type { ChatState, ChatAction };
