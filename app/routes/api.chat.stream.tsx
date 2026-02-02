import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { chatService } from "../services/chat.server";
import { aiService } from "../services/ai.server";
import { summarizeOldMessages } from "../utils/context-builder";
import { sanitizeUserInput, sanitizeLiquidCode } from "../utils/input-sanitizer";
import { checkRefinementAccess } from "../services/feature-gate.server";
import { logGeneration } from "../services/generation-log.server";
import { trackGeneration } from "../services/usage-tracking.server";
import { getSubscription } from "../services/billing.server";
import { parseCROReasoning, hasCROReasoning, type CROReasoning } from "../utils/cro-reasoning-parser";
import type { ConversationContext } from "../types/ai.types";

// Constants for input validation
const MAX_CONTENT_LENGTH = 10000; // 10K chars max
const MAX_CODE_LENGTH = 100000; // 100K chars max for Liquid code

/**
 * Extract raw Liquid from marker-wrapped response
 * Returns content between ===START LIQUID=== and ===END LIQUID===
 * Fallback: If markers not found, return full content as-is (validated decision)
 */
function extractFromMarkers(content: string): string | null {
  const match = content.match(/===START LIQUID===\s*([\s\S]*?)\s*===END LIQUID===/);
  if (match) {
    return match[1].trim();
  }
  // Fallback: store full response if markers missing
  return content.trim() || null;
}

/**
 * SSE streaming endpoint for chat messages
 * POST /api/chat/stream
 *
 * Body: FormData with conversationId, content, currentCode (optional)
 * Response: Server-Sent Events stream with real Gemini streaming
 */
export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
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

        // Extract CRO reasoning if present (preserved from Phase 3)
        let croReasoning: CROReasoning | null = null;
        if (hasCROReasoning(fullContent)) {
          croReasoning = parseCROReasoning(fullContent);
        }

        // Extract code from markers (simplified - no complex extraction/validation)
        const rawCode = extractFromMarkers(fullContent);
        const sanitizedCode = rawCode ? sanitizeLiquidCode(rawCode) : undefined;
        const hasCode = !!sanitizedCode;

        // Save assistant message
        const assistantMessage = await chatService.addAssistantMessage(
          conversationId,
          fullContent,
          sanitizedCode,
          tokenCount,
          'gemini-2.5-flash'
        );

        // Track generation for ALL tiers when code is generated
        if (hasCode) {
          try {
            const subscription = await getSubscription(shop);
            const userTier = subscription?.planName ?? "free";

            // Determine if this is an overage charge
            const isOverage = subscription
              ? subscription.usageThisCycle >= subscription.includedQuota
              : false;

            // 1. Create immutable log (all tiers)
            await logGeneration({
              shop,
              sectionId: conversation.sectionId,
              messageId: assistantMessage.id,
              prompt: sanitizedContent,
              tokenCount,
              userTier: userTier as "free" | "pro" | "agency",
              wasCharged: isOverage,
              subscription, // Pass for correct billing cycle calculation
            });

            // 2. Track usage for PAID users only (BUG FIX)
            if (subscription) {
              await trackGeneration(
                admin,
                shop,
                conversation.sectionId,
                sanitizedContent,
                subscription // Pass to avoid duplicate DB fetch
              );
            }
          } catch (error) {
            // Log error but don't block generation
            console.error("[api.chat.stream] Failed to track generation:", error);
          }
        }

        // Send completion event with CRO reasoning and code snapshot
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'message_complete',
              data: {
                messageId: assistantMessage.id,
                hasCode,
                codeSnapshot: sanitizedCode, // Server sends extracted code to client
                croReasoning,
                hasCROReasoning: croReasoning !== null,
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
