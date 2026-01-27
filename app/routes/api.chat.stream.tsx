import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { chatService } from "../services/chat.server";
import { aiService } from "../services/ai.server";
import { extractCodeFromResponse, validateLiquidCompleteness, mergeResponses } from "../utils/code-extractor";
import { summarizeOldMessages, buildContinuationPrompt } from "../utils/context-builder";
import { sanitizeUserInput, sanitizeLiquidCode } from "../utils/input-sanitizer";
import { checkRefinementAccess } from "../services/feature-gate.server";
import { logGeneration } from "../services/generation-log.server";
import { trackGeneration } from "../services/usage-tracking.server";
import { getSubscription } from "../services/billing.server";
import { parseCROReasoning, extractCodeWithoutReasoning, hasCROReasoning, type CROReasoning } from "../utils/cro-reasoning-parser";
import type { ConversationContext } from "../types/ai.types";

// Constants for input validation
const MAX_CONTENT_LENGTH = 10000; // 10K chars max
const MAX_CODE_LENGTH = 100000; // 100K chars max for Liquid code

// Auto-continuation constants
const MAX_CONTINUATIONS = 2; // Hard limit to prevent infinite loops

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
        let continuationCount = 0;
        let lastFinishReason: string | undefined;

        // Stream AI response using real Gemini streaming
        const generator = aiService.generateWithContext(sanitizedContent, context, {
          onFinishReason: (reason) => { lastFinishReason = reason; }
        });

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

        // Auto-continuation logic (feature flag controlled)
        if (process.env.FLAG_AUTO_CONTINUE === 'true') {
          let validation = validateLiquidCompleteness(fullContent);

          // Continue if truncated (MAX_TOKENS) or validation fails, max 2 attempts
          while (!validation.isComplete && continuationCount < MAX_CONTINUATIONS) {
            continuationCount++;

            // Notify client of continuation attempt
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'continuation_start',
                  data: {
                    attempt: continuationCount,
                    reason: lastFinishReason === 'MAX_TOKENS' ? 'token_limit' : 'incomplete_code',
                    errors: validation.errors.map(e => e.message)
                  }
                })}\n\n`
              )
            );

            // Build continuation prompt with validation context
            const continuationPrompt = buildContinuationPrompt(
              sanitizedContent,
              fullContent,
              validation.errors
            );

            // Create continuation context with partial response
            const continuationContext: ConversationContext = {
              ...context,
              currentCode: fullContent, // Include partial as context
            };

            // Stream continuation response
            let continuationContent = '';
            const continuationGen = aiService.generateWithContext(
              continuationPrompt,
              continuationContext,
              { onFinishReason: (reason) => { lastFinishReason = reason; } }
            );

            for await (const token of continuationGen) {
              continuationContent += token;
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

            // Merge responses with overlap detection
            fullContent = mergeResponses(fullContent, continuationContent);

            // Re-validate merged content
            validation = validateLiquidCompleteness(fullContent);

            // Notify client of continuation result
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'continuation_complete',
                  data: {
                    attempt: continuationCount,
                    isComplete: validation.isComplete,
                    totalLength: fullContent.length
                  }
                })}\n\n`
              )
            );
          }
        }

        // Extract CRO reasoning if present (Phase 3)
        let croReasoning: CROReasoning | null = null;
        let contentForExtraction = fullContent;

        if (hasCROReasoning(fullContent)) {
          croReasoning = parseCROReasoning(fullContent);
          // Remove reasoning block from content before code extraction
          // This ensures clean code storage while preserving reasoning separately
          contentForExtraction = extractCodeWithoutReasoning(fullContent);
        }

        // Extract code from completed response (without reasoning block)
        const extraction = extractCodeFromResponse(contentForExtraction);

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

        // Track generation for ALL tiers when code is generated
        if (extraction.hasCode) {
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

        // Determine completion status for Phase 4 UI feedback
        const validation = process.env.FLAG_AUTO_CONTINUE === 'true'
          ? validateLiquidCompleteness(fullContent)
          : { isComplete: true };
        const wasComplete = validation.isComplete;

        // Send completion event with Phase 4 metadata + Phase 3 CRO reasoning
        // NOTE: codeSnapshot is NOT sent via SSE - client extracts locally from
        // streamed content to avoid SSE chunking issues with large payloads
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'message_complete',
              data: {
                messageId: assistantMessage.id,
                hasCode: extraction.hasCode,
                wasComplete, // Phase 4: true if code complete after all continuations
                continuationCount, // Phase 4: number of continuation attempts
                // Phase 3: CRO reasoning data (null if not a recipe-based generation)
                croReasoning: croReasoning,
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
