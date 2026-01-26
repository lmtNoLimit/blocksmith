# Phase 03: Add Auto-Continuation Logic

## Context Links

- [Phase 01: Token Limits](./phase-01-token-limits.md)
- [Phase 02: Liquid Validation](./phase-02-liquid-validation.md)
- [Main Plan](./plan.md)

## Overview

Add auto-continuation logic after streaming completes. When validator detects incomplete output, automatically request continuation from Gemini with context of what's missing.

## Key Insights

- `finishReason: "MAX_TOKENS"` indicates truncation
- Continuation prompt should include last 500 chars + missing tag hints
- Max 2 continuation attempts to prevent infinite loops
- Merge/deduplicate continuation with original response
- Existing `continueGeneration` flag in route already exists (unused)

## Requirements

1. After streaming, check `finishReason` for truncation
2. Run `validateLiquidCompleteness()` on full response
3. If incomplete and retries < 2, build continuation prompt
4. Stream continuation response
5. Merge continuation with original (deduplicate overlap)
6. Send updated completion status to client
7. Add feature flag `FLAG_AUTO_CONTINUE`

## Architecture

```
api.chat.stream.tsx
├── Stream AI response
├── Check finishReason / run validator
│   ├── Complete → Send message_complete
│   └── Incomplete
│       ├── Build continuation prompt
│       ├── Stream continuation
│       ├── Merge responses
│       └── Repeat (max 2x)
└── Send final message_complete
```

SSE event types:
```typescript
// New events for continuation
{ type: 'continuation_start', data: { attempt: 1, reason: 'unclosed_schema' } }
{ type: 'continuation_complete', data: { mergedLength: 5000 } }
```

## Related Code Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/routes/api.chat.stream.tsx` | 109-230 | SSE stream handler |
| `app/services/ai.server.ts` | 517-548 | `generateWithContext()` method |
| `app/utils/code-extractor.ts` | N/A | `validateLiquidCompleteness()` (Phase 02) |

## Implementation Steps

### Step 1: Add continuation types (10 min)

In `ai.types.ts`:
```typescript
export interface ContinuationResult {
  content: string;
  finishReason: string | undefined;
  continuationCount: number;
  wasComplete: boolean;
}
```

### Step 2: Add continuation prompt builder (20 min)

In `context-builder.ts`:
```typescript
export function buildContinuationPrompt(
  originalPrompt: string,
  partialResponse: string,
  validationErrors: LiquidValidationError[]
): string {
  const lastChunk = partialResponse.slice(-500);
  const missingTags = validationErrors
    .filter(e => e.type === 'unclosed_liquid_tag')
    .map(e => e.tag)
    .join(', ');

  return `CONTINUE generating the Liquid section. Your previous response was truncated.

IMPORTANT: Continue EXACTLY where you left off. Do NOT repeat content.

Last part of your response:
"""
${lastChunk}
"""

${missingTags ? `Missing closing tags: ${missingTags}` : ''}

Continue from here, completing all unclosed tags and the section.`;
}
```

### Step 3: Add response merger (30 min)

In `code-extractor.ts`:
```typescript
export function mergeResponses(original: string, continuation: string): string {
  // Find overlap between end of original and start of continuation
  const overlapLength = findOverlap(original, continuation);

  if (overlapLength > 0) {
    // Remove overlapping portion from continuation
    return original + continuation.slice(overlapLength);
  }

  // No overlap detected - simple concatenation
  return original + '\n' + continuation;
}

function findOverlap(str1: string, str2: string): number {
  const maxOverlap = Math.min(str1.length, str2.length, 200);

  for (let len = maxOverlap; len >= 10; len--) {
    const end1 = str1.slice(-len);
    const start2 = str2.slice(0, len);
    if (end1 === start2) {
      return len;
    }
  }

  return 0;
}
```

### Step 4: Update stream handler (60 min)

In `api.chat.stream.tsx`, modify the stream handler:
```typescript
const stream = new ReadableStream({
  async start(controller) {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'message_start' })}\n\n`));

      let fullContent = '';
      let tokenCount = 0;
      let continuationCount = 0;
      const MAX_CONTINUATIONS = 2;

      // Initial generation
      const generator = aiService.generateWithContext(sanitizedContent, context);
      for await (const token of generator) {
        fullContent += token;
        tokenCount += estimateTokens(token);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'content_delta', data: { content: token } })}\n\n`
        ));
      }

      // Validate and continue if needed
      if (process.env.FLAG_AUTO_CONTINUE === 'true') {
        let validation = validateLiquidCompleteness(fullContent);

        while (!validation.isComplete && continuationCount < MAX_CONTINUATIONS) {
          continuationCount++;

          // Notify client of continuation
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'continuation_start',
              data: { attempt: continuationCount, errors: validation.errors }
            })}\n\n`
          ));

          // Build and send continuation prompt
          const continuationPrompt = buildContinuationPrompt(
            sanitizedContent,
            fullContent,
            validation.errors
          );

          const continuationContext: ConversationContext = {
            ...context,
            currentCode: fullContent, // Include partial as context
          };

          const continuationGen = aiService.generateWithContext(
            continuationPrompt,
            continuationContext
          );

          let continuationContent = '';
          for await (const token of continuationGen) {
            continuationContent += token;
            tokenCount += estimateTokens(token);
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'content_delta', data: { content: token } })}\n\n`
            ));
          }

          // Merge responses
          fullContent = mergeResponses(fullContent, continuationContent);

          // Re-validate
          validation = validateLiquidCompleteness(fullContent);

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'continuation_complete',
              data: { isComplete: validation.isComplete }
            })}\n\n`
          ));
        }
      }

      // Extract and save (existing code)
      const extraction = extractCodeFromResponse(fullContent);
      // ... rest of existing completion logic
    } catch (error) {
      // ... existing error handling
    }
  },
});
```

### Step 5: Update AI service for finishReason access (30 min)

Modify `generateWithContext()` to expose finish reason:
```typescript
interface StreamResult {
  content: string;
  finishReason?: string;
}

async *generateWithContext(
  userMessage: string,
  context: ConversationContext,
  options?: StreamingOptions
): AsyncGenerator<string, StreamResult, unknown> {
  // ... existing streaming code

  // At end, return metadata
  return {
    content: fullContent,
    finishReason: lastChunk?.candidates?.[0]?.finishReason,
  };
}
```

Note: AsyncGenerator return type is complex. Alternative: emit metadata via options callback.

### Step 6: Add feature flag (10 min)

In `.env`:
```
FLAG_AUTO_CONTINUE=true
```

### Step 7: Add tests (40 min)

Test cases:
- Complete response: no continuation triggered
- Missing endschema: one continuation attempt
- Still incomplete after 2 attempts: return with warning
- Response merge: overlap detection works
- Feature flag disabled: no continuation logic runs

## Todo List

- [ ] Add `ContinuationResult` type to `ai.types.ts`
- [ ] Add `buildContinuationPrompt()` to `context-builder.ts`
- [ ] Add `mergeResponses()` and `findOverlap()` to `code-extractor.ts`
- [ ] Update `api.chat.stream.tsx` with continuation loop
- [ ] Add SSE events: `continuation_start`, `continuation_complete`
- [ ] Add `FLAG_AUTO_CONTINUE` feature flag
- [ ] Create unit tests for merge logic
- [ ] Create integration tests for continuation flow
- [ ] Manual test with artificially truncated response

## Success Criteria

- Auto-continuation triggers when `finishReason !== 'STOP'` or validation fails
- Max 2 continuation attempts
- Client receives continuation status events
- Merged response is valid Liquid section
- Feature flag can disable continuation
- Token tracking includes continuation tokens

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Infinite loop | Low | High | Max 2 continuations hard limit |
| Response merge corrupts code | Medium | High | Overlap detection, thorough testing |
| Double billing tokens | Low | Medium | Track total tokens across continuations |
| UX confusion | Medium | Low | Clear SSE events for UI feedback |

## Security Considerations

- Continuation prompt built from sanitized content
- No new user inputs in continuation flow
- Rate limit applies to initial request (continuations are same request)

## Next Steps

After completing Phase 03:
1. Deploy with flag disabled, enable for beta testing
2. Monitor continuation frequency and success rate
3. Tune overlap detection if merge issues observed
4. Proceed to Phase 04 (UI feedback)
