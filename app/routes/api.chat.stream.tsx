import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { chatService } from "../services/chat.server";
import { aiService } from "../services/ai.server";
import { extractCodeFromResponse } from "../utils/code-extractor";
import { summarizeOldMessages } from "../utils/context-builder";
import { sanitizeUserInput, sanitizeLiquidCode } from "../utils/input-sanitizer";
import { checkRefinementAccess } from "../services/feature-gate.server";
import { getTrialStatus, incrementTrialUsage } from "../services/trial.server";
import type { ConversationContext } from "../types/ai.types";

// Constants for input validation
const MAX_CONTENT_LENGTH = 10000; // 10K chars max
const MAX_CODE_LENGTH = 100000; // 100K chars max for Liquid code

/**
 * SSE streaming endpoint for chat messages
 * POST /api/chat/stream
 *
 * Body: FormData with conversationId, content, currentCode (optional)
 * Response: Server-Sent Events stream with real Gemini streaming
 */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const conversationId = formData.get("conversationId") as string;
  const content = formData.get("content") as string;
  const currentCode = formData.get("currentCode") as string | null;
  const continueGeneration = formData.get("continueGeneration") === "true";

  // Input validation
  if (!conversationId || !content) {
    return new Response("Missing required fields: conversationId, content", { status: 400 });
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return new Response("Content must be a non-empty string", { status: 400 });
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return new Response(`Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`, { status: 400 });
  }

  if (currentCode && currentCode.length > MAX_CODE_LENGTH) {
    return new Response(`Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`, { status: 400 });
  }

  // Authorization: verify conversation belongs to this shop BEFORE any data operations
  const conversation = await chatService.getConversation(conversationId);
  if (!conversation || conversation.shop !== shop) {
    return new Response("Conversation not found", { status: 404 });
  }

  // Trial gate: Check if trial user has remaining generations
  const trialStatus = await getTrialStatus(shop);
  if (trialStatus.isInTrial && trialStatus.usageRemaining <= 0) {
    return new Response(
      JSON.stringify({
        error: "Trial limit reached. Upgrade to continue generating.",
        trialExpired: true,
        upgradeRequired: "pro",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Feature gate: Check refinement access (skip for initial generation)
  if (!continueGeneration) {
    const refinementCheck = await checkRefinementAccess(shop, conversationId);
    if (!refinementCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: refinementCheck.reason,
          upgradeRequired: refinementCheck.upgradeRequired,
          used: refinementCheck.used,
          limit: refinementCheck.limit,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Sanitize user input to prevent prompt injection
  const { sanitized: sanitizedContent, warnings } = sanitizeUserInput(content.trim());
  if (warnings.length > 0) {
    console.warn('[api.chat.stream] Input sanitization warnings:', warnings);
  }

  // Add user message to conversation (skip if continuing generation for existing message)
  if (!continueGeneration) {
    await chatService.addUserMessage(conversationId, sanitizedContent);
  }

  // Build conversation context for AI
  const allMessages = await chatService.getContextMessages(conversationId, 50);

  // Split into recent (full) and old (summarized)
  const recentMessages = allMessages.slice(-10);
  const oldMessages = allMessages.slice(0, -10);

  const context: ConversationContext = {
    currentCode: currentCode || undefined,
    recentMessages: recentMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })),
    summarizedHistory: oldMessages.length > 0
      ? summarizeOldMessages(oldMessages)
      : undefined,
  };

  // Create SSE stream with real Gemini streaming
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send start event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'message_start' })}\n\n`)
        );

        let fullContent = '';
        let tokenCount = 0;

        // Stream AI response using real Gemini streaming
        const generator = aiService.generateWithContext(sanitizedContent, context);

        for await (const token of generator) {
          fullContent += token;
          tokenCount += estimateTokens(token);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'content_delta',
                data: { content: token },
              })}\n\n`
            )
          );
        }

        // Extract code from completed response
        const extraction = extractCodeFromResponse(fullContent);

        // Sanitize extracted code to prevent XSS
        const sanitizedCode = extraction.hasCode && extraction.code
          ? sanitizeLiquidCode(extraction.code)
          : undefined;

        // Save assistant message
        const assistantMessage = await chatService.addAssistantMessage(
          conversationId,
          fullContent,
          sanitizedCode,
          tokenCount,
          'gemini-2.5-flash'
        );

        // Increment trial usage if code was generated (shop captured from outer scope)
        if (extraction.hasCode && trialStatus.isInTrial) {
          await incrementTrialUsage(shop);
        }

        // Send completion event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'message_complete',
              data: {
                messageId: assistantMessage.id,
                codeSnapshot: sanitizedCode,
                hasCode: extraction.hasCode,
                changes: extraction.changes,
              },
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        // Log full error details server-side only
        console.error('[api.chat.stream] Error:', error);

        const internalErrorMsg = error instanceof Error ? error.message : 'Unknown error';

        // Save detailed error to conversation (for admin review)
        await chatService.addErrorMessage(conversationId, internalErrorMsg);

        // Send sanitized error to client
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              data: { error: 'Failed to generate response. Please try again.' },
            })}\n\n`
          )
        );

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Simple token estimation (roughly 4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
