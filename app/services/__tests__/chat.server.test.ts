// @jest-environment node
import type { Mock } from 'jest';

// Type alias for convenience
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedFunction<T extends (...args: any[]) => any> = Mock<ReturnType<T>, Parameters<T>>;

// Mock Prisma BEFORE importing ChatService
jest.mock('../../db.server', () => ({
  __esModule: true,
  default: {
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Now import after mocking
import { ChatService } from '../chat.server';
import prisma from '../../db.server';

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Code Extraction Tests (pure function, no mocking needed)
  // ============================================================================
  describe('extractCodeFromResponse', () => {
    it('extracts code starting with {% schema %}', () => {
      const content = `Here's the updated section:

{% schema %}
{
  "name": "Hero Banner",
  "settings": []
}
{% endschema %}

{% style %}
.hero { padding: 20px; }
{% endstyle %}

<div class="hero">Content</div>`;

      const result = chatService.extractCodeFromResponse(content);
      expect(result).toContain('{% schema %}');
      expect(result).toContain('Hero Banner');
      expect(result).toContain('{% style %}');
      expect(result).toContain('<div class="hero">');
    });

    it('extracts code from fenced liquid code block when no schema present', () => {
      // When there's no schema block, fall back to fenced code block
      const content = `Here's the code:

\`\`\`liquid
<div class="hero">
  {{ section.settings.heading }}
</div>
\`\`\`

Let me know if you need changes.`;

      const result = chatService.extractCodeFromResponse(content);
      expect(result).toContain('<div class="hero">');
      expect(result).toContain('{{ section.settings.heading }}');
      expect(result).not.toContain('```');
    });

    it('extracts code from fenced html code block', () => {
      const content = `\`\`\`html
<div class="section">
  {{ section.settings.heading }}
</div>
\`\`\``;

      const result = chatService.extractCodeFromResponse(content);
      expect(result).toContain('<div class="section">');
      expect(result).not.toContain('```');
    });

    it('returns undefined when no code found', () => {
      const content = 'Sure, I can help you with that. What would you like to change?';
      const result = chatService.extractCodeFromResponse(content);
      expect(result).toBeUndefined();
    });

    it('prioritizes schema block over code fence', () => {
      const content = `Old code:
\`\`\`liquid
old code here
\`\`\`

{% schema %}
{
  "name": "New Section"
}
{% endschema %}`;

      const result = chatService.extractCodeFromResponse(content);
      expect(result).toContain('New Section');
    });
  });

  // ============================================================================
  // getOrCreateConversation Tests
  // ============================================================================
  describe('getOrCreateConversation', () => {
    const mockConversation = {
      id: 'conv-123',
      sectionId: 'section-456',
      shop: 'test-shop.myshopify.com',
      systemPrompt: null,
      modelId: 'gemini-2.5-flash',
      title: null,
      messageCount: 0,
      totalTokens: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    it('returns existing conversation if found', async () => {
      (prisma.conversation.findUnique as MockedFunction<typeof prisma.conversation.findUnique>).mockResolvedValue(mockConversation);

      const result = await chatService.getOrCreateConversation('section-456', 'test-shop.myshopify.com');

      expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { sectionId: 'section-456' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockConversation);
    });

    it('creates new conversation if not found', async () => {
      (prisma.conversation.findUnique as MockedFunction<typeof prisma.conversation.findUnique>).mockResolvedValue(null);
      (prisma.conversation.create as MockedFunction<typeof prisma.conversation.create>).mockResolvedValue(mockConversation);

      const result = await chatService.getOrCreateConversation('section-456', 'test-shop.myshopify.com');

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: { sectionId: 'section-456', shop: 'test-shop.myshopify.com' },
        include: { messages: true },
      });
      expect(result).toEqual(mockConversation);
    });
  });

  // ============================================================================
  // addUserMessage Tests
  // ============================================================================
  describe('addUserMessage', () => {
    it('creates message and updates conversation count', async () => {
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-456',
        role: 'user',
        content: 'Make the heading larger',
        codeSnapshot: null,
        tokenCount: null,
        modelId: null,
        isError: false,
        errorMessage: null,
        createdAt: new Date(),
      };

      (prisma.message.create as MockedFunction<typeof prisma.message.create>).mockResolvedValue(mockMessage);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.conversation.update as MockedFunction<typeof prisma.conversation.update>).mockResolvedValue({} as any);

      const result = await chatService.addUserMessage('conv-456', 'Make the heading larger');

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-456',
          role: 'user',
          content: 'Make the heading larger',
        },
      });
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-456' },
        data: { messageCount: { increment: 1 }, updatedAt: expect.any(Date) },
      });
      expect(result.role).toBe('user');
      expect(result.content).toBe('Make the heading larger');
    });
  });

  // ============================================================================
  // addAssistantMessage Tests
  // ============================================================================
  describe('addAssistantMessage', () => {
    it('creates assistant message with code snapshot', async () => {
      const mockMessage = {
        id: 'msg-789',
        conversationId: 'conv-456',
        role: 'assistant',
        content: 'Here is the updated code...',
        codeSnapshot: '{% schema %}...{% endschema %}',
        tokenCount: 150,
        modelId: 'gemini-2.5-flash',
        isError: false,
        errorMessage: null,
        createdAt: new Date(),
      };

      // Mock findMany for duplicate check (returns empty = no existing response)
      (prisma.message.findMany as MockedFunction<typeof prisma.message.findMany>).mockResolvedValue([]);
      (prisma.message.create as MockedFunction<typeof prisma.message.create>).mockResolvedValue(mockMessage);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.conversation.update as MockedFunction<typeof prisma.conversation.update>).mockResolvedValue({} as any);

      const result = await chatService.addAssistantMessage(
        'conv-456',
        'Here is the updated code...',
        '{% schema %}...{% endschema %}',
        150,
        'gemini-2.5-flash'
      );

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-456',
          role: 'assistant',
          content: 'Here is the updated code...',
          codeSnapshot: '{% schema %}...{% endschema %}',
          tokenCount: 150,
          modelId: 'gemini-2.5-flash',
        },
      });
      expect(result.codeSnapshot).toBe('{% schema %}...{% endschema %}');
      expect(result.tokenCount).toBe(150);
    });

    it('increments totalTokens when tokenCount provided', async () => {
      const mockMessage = {
        id: 'msg-789',
        conversationId: 'conv-456',
        role: 'assistant',
        content: 'Response',
        codeSnapshot: null,
        tokenCount: 100,
        modelId: 'gemini-2.5-flash',
        isError: false,
        errorMessage: null,
        createdAt: new Date(),
      };

      // Mock findMany for duplicate check (returns empty = no existing response)
      (prisma.message.findMany as MockedFunction<typeof prisma.message.findMany>).mockResolvedValue([]);
      (prisma.message.create as MockedFunction<typeof prisma.message.create>).mockResolvedValue(mockMessage);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.conversation.update as MockedFunction<typeof prisma.conversation.update>).mockResolvedValue({} as any);

      await chatService.addAssistantMessage('conv-456', 'Response', undefined, 100);

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-456' },
        data: {
          messageCount: { increment: 1 },
          totalTokens: { increment: 100 },
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  // ============================================================================
  // getContextMessages Tests
  // ============================================================================
  describe('getContextMessages', () => {
    it('returns messages in correct format for AI', async () => {
      // Mock returns messages in DESC order (newest first) as the query specifies
      const mockMessages = [
        { id: '3', role: 'user', content: 'Second message', isError: false },
        { id: '2', role: 'assistant', content: 'Response', isError: false },
        { id: '1', role: 'user', content: 'First message', isError: false },
      ];

      (prisma.message.findMany as MockedFunction<typeof prisma.message.findMany>).mockResolvedValue(mockMessages);

      const result = await chatService.getContextMessages('conv-123', 20);

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-123', isError: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      // Messages should be reversed to chronological order (oldest first)
      expect(result[0].content).toBe('First message');
      expect(result[1].content).toBe('Response');
      expect(result[2].content).toBe('Second message');
    });

    it('excludes error messages from context', async () => {
      (prisma.message.findMany as MockedFunction<typeof prisma.message.findMany>).mockResolvedValue([]);

      await chatService.getContextMessages('conv-123');

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 'conv-123', isError: false },
        })
      );
    });
  });

  // ============================================================================
  // addErrorMessage Tests
  // ============================================================================
  describe('addErrorMessage', () => {
    it('creates error message with isError flag', async () => {
      const mockMessage = {
        id: 'msg-err',
        conversationId: 'conv-456',
        role: 'assistant',
        content: 'An error occurred while processing your request.',
        codeSnapshot: null,
        tokenCount: null,
        modelId: null,
        isError: true,
        errorMessage: 'API timeout',
        createdAt: new Date(),
      };

      (prisma.message.create as MockedFunction<typeof prisma.message.create>).mockResolvedValue(mockMessage);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.conversation.update as MockedFunction<typeof prisma.conversation.update>).mockResolvedValue({} as any);

      const result = await chatService.addErrorMessage('conv-456', 'API timeout');

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-456',
          role: 'assistant',
          content: 'An error occurred while processing your request.',
          isError: true,
          errorMessage: 'API timeout',
        },
      });
      expect(result.isError).toBe(true);
      expect(result.errorMessage).toBe('API timeout');
    });
  });
});
