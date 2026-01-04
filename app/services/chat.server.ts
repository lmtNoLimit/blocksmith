import prisma from "../db.server";
import type { UIMessage, ModelMessage } from "../types/chat.types";
import type { Message, Conversation } from "@prisma/client";

/**
 * ChatService handles conversation persistence and message management
 * for the AI chat panel feature.
 */
export class ChatService {
  /**
   * Get or create conversation for a section
   */
  async getOrCreateConversation(sectionId: string, shop: string): Promise<Conversation & { messages: Message[] }> {
    let conversation = await prisma.conversation.findUnique({
      where: { sectionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { sectionId, shop },
        include: { messages: true }
      });
    }

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<(Conversation & { messages: Message[] }) | null> {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }

  /**
   * Add user message to conversation
   */
  async addUserMessage(conversationId: string, content: string): Promise<UIMessage> {
    const message = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { messageCount: { increment: 1 }, updatedAt: new Date() }
    });

    return this.toUIMessage(message);
  }

  /**
   * Add assistant message (after streaming completes)
   * Includes duplicate prevention - returns existing if assistant already responded
   */
  async addAssistantMessage(
    conversationId: string,
    content: string,
    codeSnapshot?: string,
    tokenCount?: number,
    modelId?: string
  ): Promise<UIMessage> {
    // DUPLICATE PREVENTION: Check if assistant already responded to last user message
    const existingAssistant = await this.checkForExistingAssistantResponse(conversationId);
    if (existingAssistant) {
      console.warn('[ChatService] Duplicate assistant message prevented, returning existing');
      return existingAssistant;
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content,
        codeSnapshot,
        tokenCount,
        modelId,
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        totalTokens: tokenCount ? { increment: tokenCount } : undefined,
        updatedAt: new Date()
      }
    });

    return this.toUIMessage(message);
  }

  /**
   * Check if there's already an assistant response after the last user message
   * Returns the existing assistant message if found, null otherwise
   */
  private async checkForExistingAssistantResponse(conversationId: string): Promise<UIMessage | null> {
    // Get last 2 messages to check the pattern
    const recentMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    if (recentMessages.length < 1) return null;

    // If the most recent message is already an assistant message, it's a duplicate
    const lastMessage = recentMessages[0];
    if (lastMessage.role === 'assistant' && !lastMessage.isError) {
      return this.toUIMessage(lastMessage);
    }

    return null;
  }

  /**
   * Add error message to conversation
   */
  async addErrorMessage(
    conversationId: string,
    errorMessage: string
  ): Promise<UIMessage> {
    const message = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: 'An error occurred while processing your request.',
        isError: true,
        errorMessage,
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { messageCount: { increment: 1 }, updatedAt: new Date() }
    });

    return this.toUIMessage(message);
  }

  /**
   * Get conversation history as ModelMessages for AI context
   */
  async getContextMessages(conversationId: string, maxMessages = 20): Promise<ModelMessage[]> {
    const messages = await prisma.message.findMany({
      where: { conversationId, isError: false },
      orderBy: { createdAt: 'desc' },
      take: maxMessages,
    });

    return messages.reverse().map(m => ({
      role: m.role as ModelMessage['role'],
      content: m.content
    }));
  }

  /**
   * Get all messages for a conversation as UIMessages
   */
  async getMessages(conversationId: string, limit = 100): Promise<UIMessage[]> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map(m => this.toUIMessage(m));
  }

  /**
   * Update conversation title (auto-generated from first message)
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title }
    });
  }

  /**
   * Archive a conversation (soft delete)
   */
  async archiveConversation(conversationId: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: true }
    });
  }

  /**
   * Extract Liquid code from AI response
   * Looks for schema blocks or fenced code blocks
   */
  extractCodeFromResponse(content: string): string | undefined {
    // Match complete Liquid section starting with {% schema %}
    const schemaMatch = content.match(/\{%\s*schema\s*%\}[\s\S]*$/);
    if (schemaMatch) {
      return schemaMatch[0].trim();
    }

    // Match fenced code blocks
    const codeBlockMatch = content.match(/```(?:liquid|html)?\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Convert Prisma Message to UIMessage
   */
  private toUIMessage(message: Message): UIMessage {
    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role as UIMessage['role'],
      content: message.content,
      codeSnapshot: message.codeSnapshot || undefined,
      tokenCount: message.tokenCount || undefined,
      isError: message.isError,
      errorMessage: message.errorMessage || undefined,
      createdAt: message.createdAt,
    };
  }
}

export const chatService = new ChatService();
