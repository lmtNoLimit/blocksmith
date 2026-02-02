---
phase: 04
title: "Simplify useChat Hook for Direct Code Storage"
status: done
effort: 1.5h
completed: 2026-02-02
---

# Phase 04: Simplify useChat Hook for Direct Code Storage

## Context Links

- [Plan Overview](./plan.md)
- [SSE Streaming Research](./research/researcher-01-sse-streaming.md)

## Overview

**Priority:** P1 - Client-side cleanup
**Current Status:** Pending
**Depends On:** Phases 01, 03 complete

Remove client-side code extraction from useChat.ts. Server now sends clean code via message_complete event; client stores directly.

## Key Insights

- Client was duplicating extraction logic from server (sync issues)
- Current flow: server extracts → client re-extracts → mismatch
- New flow: server extracts with markers → sends sanitized code → client stores
- Remove continuation_start/continuation_complete event handlers (no longer sent)

## Requirements

### Functional
- Remove extractCodeFromContent import and usage
- Remove sanitizeLiquidCode import from code-extraction.client (use input-sanitizer)
- Remove continuation event handlers
- Trust server's code in message_complete event
- Simplify GenerationStatus state

### Non-Functional
- Maintain streaming display
- Preserve version history/restore functionality
- Keep progress tracking (useStreamingProgress)

## Related Code Files

### File to MODIFY

| File | Path |
|------|------|
| useChat.ts | `app/components/chat/hooks/useChat.ts` |

### Lines to REMOVE

| Lines | Content | Reason |
|-------|---------|--------|
| 10 | `import { extractCodeFromContent, sanitizeLiquidCode } from '../../../utils/code-extraction.client'` | Deleted module |
| 119-126 | `initialGenerationStatus` with continuation fields | Simplified status |
| 279-295 | `case 'continuation_start':` and `case 'continuation_complete':` handlers | Events removed |
| 305-311 | Client-side extraction block | Server handles extraction |

### Types to UPDATE

| Type | Location | Change |
|------|----------|--------|
| GenerationStatus | `app/types/index.ts` or inline | Remove continuation fields |

## Architecture

### Current Flow (broken)
```
Server streams → Client accumulates → Client extracts (duplicate) → Store
```

### New Flow (simplified)
```
Server streams → Client accumulates → Server sends code in event → Client stores
```

### Updated message_complete Handler

Server sends:
```typescript
{
  type: 'message_complete',
  data: {
    messageId: string,
    hasCode: boolean,
    codeSnapshot?: string,  // NEW: server sends sanitized code
    croReasoning?: CROReasoning,
    hasCROReasoning: boolean
  }
}
```

Client stores `data.codeSnapshot` directly.

## Implementation Steps

1. **Remove code-extraction.client import (line 10)**

   Delete:
   ```typescript
   import { extractCodeFromContent, sanitizeLiquidCode } from '../../../utils/code-extraction.client';
   ```

2. **Simplify GenerationStatus (lines 119-126)**

   Before:
   ```typescript
   const initialGenerationStatus: GenerationStatus = {
     isGenerating: false,
     isContinuing: false,
     continuationAttempt: 0,
     wasComplete: true,
     continuationCount: 0,
   };
   ```

   After:
   ```typescript
   const initialGenerationStatus: GenerationStatus = {
     isGenerating: false,
   };
   ```

3. **Update GenerationStatus type**

   File: `app/types/index.ts` (or wherever defined)

   Before:
   ```typescript
   export interface GenerationStatus {
     isGenerating: boolean;
     isContinuing: boolean;
     continuationAttempt: number;
     wasComplete: boolean;
     continuationCount: number;
   }
   ```

   After:
   ```typescript
   export interface GenerationStatus {
     isGenerating: boolean;
   }
   ```

4. **Remove continuation status updates (lines 174-180)**

   Delete:
   ```typescript
   setGenerationStatus({
     isGenerating: true,
     isContinuing: false,
     continuationAttempt: 0,
     wasComplete: true,
     continuationCount: 0,
   });
   ```

   Replace with:
   ```typescript
   setGenerationStatus({ isGenerating: true });
   ```

5. **Remove continuation event handlers (lines 279-295)**

   Delete entire blocks:
   ```typescript
   // Phase 4: Handle continuation start event
   case 'continuation_start':
     continuationCount = event.data.attempt ?? 1;
     setGenerationStatus((prev: GenerationStatus) => ({
       ...prev,
       isContinuing: true,
       continuationAttempt: event.data.attempt ?? 1,
     }));
     break;

   // Phase 4: Handle continuation complete event
   case 'continuation_complete':
     setGenerationStatus((prev: GenerationStatus) => ({
       ...prev,
       isContinuing: false,
       wasComplete: event.data.isComplete ?? true,
       continuationCount: event.data.attempt ?? prev.continuationCount,
     }));
     break;
   ```

6. **Remove client-side extraction (lines 305-311)**

   Before:
   ```typescript
   case 'message_complete':
     serverMessageId = event.data.messageId;
     wasComplete = event.data.wasComplete ?? true;
     continuationCount = event.data.continuationCount ?? 0;

     // CLIENT-SIDE CODE EXTRACTION
     const extraction = extractCodeFromContent(assistantContent);
     if (extraction.hasCode && extraction.code) {
       codeSnapshot = sanitizeLiquidCode(extraction.code);
       messageChanges = extraction.changes;
     }

     if (codeSnapshot && onCodeUpdate) {
       onCodeUpdate(codeSnapshot);
     }
     break;
   ```

   After:
   ```typescript
   case 'message_complete':
     serverMessageId = event.data.messageId;

     // Use server-provided code directly (no client extraction)
     if (event.data.hasCode && event.data.codeSnapshot) {
       codeSnapshot = event.data.codeSnapshot;
     }

     if (codeSnapshot && onCodeUpdate) {
       onCodeUpdate(codeSnapshot);
     }
     break;
   ```

7. **Remove unused variables (lines 232-237)**

   Delete:
   ```typescript
   let wasComplete = true;
   let continuationCount = 0;
   ```

8. **Update final status update (lines 341-347)**

   Before:
   ```typescript
   setGenerationStatus({
     isGenerating: false,
     isContinuing: false,
     continuationAttempt: 0,
     wasComplete,
     continuationCount,
   });
   ```

   After:
   ```typescript
   setGenerationStatus({ isGenerating: false });
   ```

9. **Update StreamEvent type (if defined locally)**

   Ensure message_complete includes codeSnapshot:
   ```typescript
   interface MessageCompleteEvent {
     type: 'message_complete';
     data: {
       messageId: string;
       hasCode: boolean;
       codeSnapshot?: string;
       croReasoning?: CROReasoning;
       hasCROReasoning: boolean;
     };
   }
   ```

10. **Remove messageChanges variable if unused**

    If `changes` field no longer populated, remove:
    ```typescript
    let messageChanges: string[] | undefined;
    ```

    And update assistantMessage:
    ```typescript
    const assistantMessage: UIMessage = {
      id: serverMessageId || `assistant-${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: assistantContent,
      codeSnapshot,
      // changes removed
      createdAt: new Date(),
    };
    ```

## Todo List

- [x] Remove code-extraction.client import
- [x] Simplify GenerationStatus interface
- [x] Update initialGenerationStatus
- [x] Remove continuation event handlers
- [x] Replace client extraction with server-provided code
- [x] Remove unused variables (wasComplete, continuationCount)
- [x] Update final status update
- [x] Update StreamEvent type for codeSnapshot
- [x] Remove messageChanges if unused
- [x] Verify TypeScript compiles
- [x] Test streaming in browser

## Success Criteria

- [x] No imports from code-extraction.client
- [x] No continuation_start/continuation_complete handling
- [x] codeSnapshot comes from server event
- [x] GenerationStatus has only isGenerating
- [x] TypeScript compiles without errors
- [x] Preview updates correctly on generation complete

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Server doesn't send codeSnapshot | High | Update Phase 03 to include in event |
| Preview doesn't update | Medium | Verify onCodeUpdate called |
| Type mismatches | Low | Update StreamEvent interface |

## Security Considerations

- Code sanitized on server before sending
- No raw user input stored on client
- XSS protection maintained server-side

## Next Steps

After this phase:
- Phase 05: Clean up context-builder.ts
- Phase 06: End-to-end testing
