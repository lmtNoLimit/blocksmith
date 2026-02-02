---
phase: 03
title: "Remove Extraction and Continuation from API Stream"
status: done
effort: 2h
---

# Phase 03: Remove Extraction and Continuation from API Stream

## Context Links

- [Plan Overview](./plan.md)
- [SSE Streaming Research](./research/researcher-01-sse-streaming.md)

## Overview

**Priority:** P1 - Critical server-side cleanup
**Current Status:** Pending
**Depends On:** Phases 01, 02 complete

Remove auto-continuation logic, extraction calls, and validation from api.chat.stream.tsx. Simplify to pure streaming with marker-based output.

## Key Insights

- Auto-continuation (FLAG_AUTO_CONTINUE) causes duplicate/merged code bugs
- Server-side extraction before storage leads to sync issues with client
- Validation checks block valid output when false positives occur
- New flow: stream raw content → accumulate → strip markers → store

## Requirements

### Functional
- Remove FLAG_AUTO_CONTINUE logic entirely
- Remove extractCodeFromResponse calls
- Remove validateLiquidCompleteness calls
- Remove mergeResponses calls
- Add simple marker stripping for storage
- Keep CRO reasoning parsing (separate from code extraction)

### Non-Functional
- Streaming performance unchanged
- Error handling preserved
- Billing/tracking logic preserved

## Related Code Files

### File to MODIFY

| File | Path |
|------|------|
| api.chat.stream.tsx | `app/routes/api.chat.stream.tsx` |

### Lines to REMOVE

| Lines | Content | Reason |
|-------|---------|--------|
| 5 | `import { extractCodeFromResponse, validateLiquidCompleteness, mergeResponses } from "../utils/code-extractor"` | Deleted module |
| 6 | `import { ... buildContinuationPrompt } from "../utils/context-builder"` | Remove buildContinuationPrompt |
| 19-20 | `const MAX_CONTINUATIONS = 2` | No longer needed |
| 145-222 | Auto-continuation while loop | Entire FLAG_AUTO_CONTINUE block |
| 236 | `extractCodeFromResponse(contentForExtraction)` | No extraction |
| 239-241 | `sanitizeLiquidCode(extraction.code)` | Moved to marker strip |
| 292-295 | Second validateLiquidCompleteness call | No validation |

### Functions to ADD

```typescript
/**
 * Extract raw Liquid from marker-wrapped response
 * Returns content between ===START LIQUID=== and ===END LIQUID===
 * FALLBACK (validated): If markers not found, return full content as-is
 */
function extractFromMarkers(content: string): string {
  const match = content.match(/===START LIQUID===\s*([\s\S]*?)\s*===END LIQUID===/);
  if (match) {
    return match[1].trim();
  }
  // Fallback: store full response if markers missing (validated decision)
  return content.trim();
}
```

## Architecture

### Current Flow (broken)
```
Stream → Accumulate → [Continuation Loop] → [extractCodeFromResponse] → [validateLiquidCompleteness] → Store
```

### New Flow (simplified)
```
Stream → Accumulate → extractFromMarkers → sanitizeLiquidCode → Store
```

## Implementation Steps

1. **Remove deleted module imports (line 5)**

   Before:
   ```typescript
   import { extractCodeFromResponse, validateLiquidCompleteness, mergeResponses } from "../utils/code-extractor";
   ```

   After:
   ```typescript
   // Removed - extraction handled via markers
   ```

2. **Update context-builder import (line 6)**

   Before:
   ```typescript
   import { summarizeOldMessages, buildContinuationPrompt } from "../utils/context-builder";
   ```

   After:
   ```typescript
   import { summarizeOldMessages } from "../utils/context-builder";
   ```

3. **Remove MAX_CONTINUATIONS constant (lines 19-20)**

   Delete:
   ```typescript
   const MAX_CONTINUATIONS = 2;
   ```

4. **Remove continuation tracking variables (lines 123-124)**

   Delete:
   ```typescript
   let continuationCount = 0;
   let lastFinishReason: string | undefined;
   ```

5. **Remove onFinishReason callback (lines 127-129)**

   Before:
   ```typescript
   const generator = aiService.generateWithContext(sanitizedContent, context, {
     onFinishReason: (reason) => { lastFinishReason = reason; }
   });
   ```

   After:
   ```typescript
   const generator = aiService.generateWithContext(sanitizedContent, context);
   ```

6. **Remove entire auto-continuation block (lines 145-222)**

   Delete the entire `if (process.env.FLAG_AUTO_CONTINUE === 'true')` block including:
   - Validation call
   - While loop
   - continuation_start event
   - buildContinuationPrompt call
   - Continuation streaming
   - mergeResponses call
   - continuation_complete event

7. **Add extractFromMarkers helper function**

   Add before the action function:
   ```typescript
   /**
    * Extract raw Liquid from marker-wrapped response
    */
   function extractFromMarkers(content: string): string | null {
     const match = content.match(/===START LIQUID===\s*([\s\S]*?)\s*===END LIQUID===/);
     return match ? match[1].trim() : null;
   }
   ```

8. **Simplify code extraction logic (replace lines 224-241)**

   Before:
   ```typescript
   // Extract CRO reasoning if present
   let croReasoning: CROReasoning | null = null;
   let contentForExtraction = fullContent;

   if (hasCROReasoning(fullContent)) {
     croReasoning = parseCROReasoning(fullContent);
     contentForExtraction = extractCodeWithoutReasoning(fullContent);
   }

   const extraction = extractCodeFromResponse(contentForExtraction);
   const sanitizedCode = extraction.hasCode && extraction.code
     ? sanitizeLiquidCode(extraction.code)
     : undefined;
   ```

   After:
   ```typescript
   // Extract CRO reasoning if present (preserved)
   let croReasoning: CROReasoning | null = null;
   if (hasCROReasoning(fullContent)) {
     croReasoning = parseCROReasoning(fullContent);
   }

   // Extract code from markers (simplified)
   const rawCode = extractFromMarkers(fullContent);
   const sanitizedCode = rawCode ? sanitizeLiquidCode(rawCode) : undefined;
   const hasCode = !!sanitizedCode;
   ```

9. **Update message_complete event (lines 297-315)**

   Before:
   ```typescript
   data: {
     messageId: assistantMessage.id,
     hasCode: extraction.hasCode,
     wasComplete,
     continuationCount,
     croReasoning: croReasoning,
     hasCROReasoning: croReasoning !== null,
   },
   ```

   After (server sends codeSnapshot - validated decision):
   ```typescript
   data: {
     messageId: assistantMessage.id,
     hasCode,
     codeSnapshot: sanitizedCode,  // Server sends code to client
     croReasoning,
     hasCROReasoning: croReasoning !== null,
   },
   ```

10. **Remove validation-based wasComplete (lines 292-295)**

    Delete:
    ```typescript
    const validation = process.env.FLAG_AUTO_CONTINUE === 'true'
      ? validateLiquidCompleteness(fullContent)
      : { isComplete: true };
    const wasComplete = validation.isComplete;
    ```

11. **Update tracking to use new hasCode variable**

    Line ~253:
    ```typescript
    if (hasCode) {
    ```

## Todo List

- [x] Remove code-extractor import (already removed in prior phase)
- [x] Update context-builder import (remove buildContinuationPrompt)
- [x] Remove MAX_CONTINUATIONS constant
- [x] Remove continuation tracking variables
- [x] Remove onFinishReason callback from generator
- [x] Delete entire auto-continuation block (lines 145-222)
- [x] Add extractFromMarkers helper function
- [x] Replace extraction logic with marker-based extraction
- [x] Update message_complete event data
- [x] Remove validation-based wasComplete logic
- [x] Update hasCode references
- [x] Verify TypeScript compiles (api.chat.stream.tsx compiles - useChat.ts errors expected for Phase 04)
- [ ] Test SSE streaming manually

## Success Criteria

- [x] No references to code-extractor module
- [x] No FLAG_AUTO_CONTINUE logic
- [x] No continuation_start/continuation_complete events
- [x] extractFromMarkers function works correctly
- [x] TypeScript compiles without errors (for this file)
- [ ] SSE streaming works end-to-end (requires manual test)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Marker not found in AI output | Low | **Validated:** Fallback stores full content as-is |
| CRO reasoning parsing broken | Medium | Test CRO flow separately |
| Billing tracking affected | High | Verify hasCode logic works |

## Security Considerations

- sanitizeLiquidCode still called on extracted content
- XSS protection maintained
- No direct user input stored without sanitization

## Next Steps

After this phase:
- Phase 04: Update useChat.ts to match server changes
- Phase 05: Clean up context-builder.ts
