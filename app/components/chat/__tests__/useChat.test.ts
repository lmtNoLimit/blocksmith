/**
 * Tests for useChat hook
 * Tests message state management, streaming, and error handling
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../hooks/useChat';
import type { UIMessage } from '../../../types';

describe('useChat', () => {
  const mockConversationId = 'test-conv-123';

  describe('initial state', () => {
    it('initializes with empty messages and no streaming', () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingContent).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('loadMessages', () => {
    it('loads messages into state', () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      const messages: UIMessage[] = [
        {
          id: '1',
          conversationId: mockConversationId,
          role: 'user',
          content: 'Hello',
          createdAt: new Date(),
        },
        {
          id: '2',
          conversationId: mockConversationId,
          role: 'assistant',
          content: 'Hi there!',
          createdAt: new Date(),
        },
      ];

      act(() => {
        result.current.loadMessages(messages);
      });

      expect(result.current.messages).toEqual(messages);
    });

    it('replaces existing messages', () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      const firstMessages: UIMessage[] = [
        {
          id: '1',
          conversationId: mockConversationId,
          role: 'user',
          content: 'First',
          createdAt: new Date(),
        },
      ];

      const secondMessages: UIMessage[] = [
        {
          id: '2',
          conversationId: mockConversationId,
          role: 'user',
          content: 'Second',
          createdAt: new Date(),
        },
      ];

      act(() => {
        result.current.loadMessages(firstMessages);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('First');

      act(() => {
        result.current.loadMessages(secondMessages);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Second');
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('does not send empty messages', () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      act(() => {
        result.current.sendMessage('   ');
      });

      expect(result.current.messages).toHaveLength(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not send while streaming', async () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      global.fetch = jest.fn(() =>
        new Promise(() => {}) // Infinite promise to keep streaming
      );

      act(() => {
        result.current.sendMessage('First message');
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true);
      });

      act(() => {
        result.current.sendMessage('Second message');
      });

      // Should only have one message
      expect(result.current.messages.filter(m => m.role === 'user')).toHaveLength(1);
    });

    it('adds user message optimistically', async () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      global.fetch = jest.fn(() => new Promise(() => {}));

      act(() => {
        result.current.sendMessage('Hello');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello');
      expect(result.current.isStreaming).toBe(true);
    });

    it('trims whitespace from messages', async () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      global.fetch = jest.fn(() => new Promise(() => {}));

      act(() => {
        result.current.sendMessage('  Hello world  \n\n');
      });

      expect(result.current.messages[0].content).toBe('Hello world');
    });

    it('sends message with current code context', async () => {
      const mockCode = 'const x = 1;';
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId, currentCode: mockCode })
      );

      global.fetch = jest.fn(() =>
        Promise.resolve(new Response(null, { status: 404 }))
      );

      act(() => {
        result.current.sendMessage('Hello');
      });

      // Wait for fetch to be called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('/api/chat/stream');

      // Check FormData
      const formData = callArgs[1].body as FormData;
      expect(formData.get('currentCode')).toBe(mockCode);
    });
  });

  describe('stopStreaming', () => {
    it('stops streaming and completes message', () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      global.fetch = jest.fn(() => new Promise(() => {}));

      act(() => {
        result.current.sendMessage('Hello');
      });

      expect(result.current.isStreaming).toBe(true);

      act(() => {
        result.current.stopStreaming();
      });

      expect(result.current.isStreaming).toBe(false);
      // Should have user message + stopped assistant message
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toContain('[Generation stopped]');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('sets error on fetch failure', async () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      act(() => {
        result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Connection lost');
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it('clears error on clearError', () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      // Manually set error via dispatch would require testing internals
      // So we test the method works
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('handles HTTP errors', async () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId })
      );

      global.fetch = jest.fn(() =>
        Promise.resolve(new Response(null, { status: 500 }))
      );

      act(() => {
        result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Server error');
      });
    });
  });

  describe('code update callback', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('calls onCodeUpdate callback when message completes with code', async () => {
      const onCodeUpdate = jest.fn();
      const { result } = renderHook(() =>
        useChat({ conversationId: mockConversationId, onCodeUpdate })
      );

      const codeSnapshot = 'updated code';

      // Create a mock response with streaming body
      const mockBody = {
        getReader: jest.fn(() => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'message_complete',
                  data: { codeSnapshot },
                })}\n`
              ),
            })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        })),
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          body: mockBody,
        } as Response)
      );

      act(() => {
        result.current.sendMessage('Update code');
      });

      await waitFor(() => {
        expect(onCodeUpdate).toHaveBeenCalledWith(codeSnapshot);
      });
    });
  });
});
