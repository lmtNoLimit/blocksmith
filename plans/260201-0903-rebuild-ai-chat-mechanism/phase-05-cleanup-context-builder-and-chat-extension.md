---
phase: 05
title: "Cleanup Context Builder and Chat Extension"
status: done
effort: 1h
---

# Phase 05: Cleanup Context Builder and Chat Extension

## Context Links

- [Plan Overview](./plan.md)
- [Prompt Engineering Research](./research/researcher-02-prompt-engineering.md)

## Overview

**Priority:** P2 - Cleanup
**Current Status:** Pending
**Depends On:** Phases 01, 02 complete

Remove buildContinuationPrompt function and LiquidValidationError import. Update CHAT_SYSTEM_EXTENSION to align with new raw output format.

## Key Insights

- buildContinuationPrompt no longer needed (no auto-continuation)
- LiquidValidationError type from deleted module
- CHAT_SYSTEM_EXTENSION should match new marker-based output
- CRO functions (buildCROEnhancedPrompt) PRESERVED

## Requirements

### Functional
- Remove buildContinuationPrompt function
- Remove LiquidValidationError import
- Update CHAT_SYSTEM_EXTENSION for marker-based output
- Keep buildCROEnhancedPrompt and related CRO functions

### Non-Functional
- TypeScript compiles without errors
- Chat refinement still works

## Related Code Files

### File to MODIFY

| File | Path |
|------|------|
| context-builder.ts | `app/utils/context-builder.ts` |

### Lines to REMOVE

| Lines | Content | Reason |
|-------|---------|--------|
| 3 | `import type { LiquidValidationError } from './code-extractor'` | Deleted module |
| 163-195 | `buildContinuationPrompt` function | No auto-continuation |

### Sections to UPDATE

| Lines | Content | Change |
|-------|---------|--------|
| 21-62 | `CHAT_SYSTEM_EXTENSION` | Simplify for marker output |

## Implementation Steps

1. **Remove LiquidValidationError import (line 3)**

   Delete:
   ```typescript
   import type { LiquidValidationError } from './code-extractor';
   ```

2. **Update CHAT_SYSTEM_EXTENSION (lines 21-62)**

   Replace entire constant:

   ```typescript
   /**
    * Chat-specific system prompt extension
    * Appended to base SYSTEM_PROMPT for conversational context
    */
   const CHAT_SYSTEM_EXTENSION = `

=== CONVERSATION MODE ===

You are refining an existing Liquid section based on user requests.

OUTPUT RULES:
1. For code changes: Output COMPLETE updated section
2. Wrap code: ===START LIQUID=== [full code] ===END LIQUID===
3. NO markdown fences, NO backticks, NO explanations before/after code
4. Include ALL code (schema + style + markup) - never partial sections
5. For questions (not code changes): Answer without code output

CHANGE REQUESTS:
- "Make heading larger" → Update CSS, output full section with markers
- "Add a button" → Add markup + settings, output full section with markers
- "Change colors" → Update defaults/CSS, output full section with markers

QUESTIONS:
- "What settings does this have?" → List settings, no code
- "How do I use this?" → Explain usage, no code

CONTEXT:
The user's current section code is provided. Base changes on this code.
Never start from scratch unless explicitly asked.`;
   ```

3. **Remove buildContinuationPrompt function (lines 163-195)**

   Delete entire function:
   ```typescript
   /**
    * Build continuation prompt when AI response was truncated
    * ...
    */
   export function buildContinuationPrompt(
     originalPrompt: string,
     partialResponse: string,
     validationErrors: LiquidValidationError[]
   ): string {
     // ... entire function body
   }
   ```

4. **Verify exports**

   Ensure these are still exported:
   - `buildConversationPrompt` - KEEP
   - `getChatSystemPrompt` - KEEP
   - `summarizeOldMessages` - KEEP
   - `buildCROEnhancedPrompt` - KEEP
   - `RecipeContextValues` - KEEP

   Removed:
   - `buildContinuationPrompt` - REMOVE

5. **Update any imports of buildContinuationPrompt**

   Already handled in Phase 03 (api.chat.stream.tsx)

   Verify no other files import it:
   ```bash
   grep -r "buildContinuationPrompt" app/ --include="*.ts" --include="*.tsx"
   ```

## Final File Structure

After changes, `context-builder.ts` should have:

```typescript
import type { ConversationContext } from '../types/ai.types';
import type { ModelMessage } from '../types/chat.types';
import type { CRORecipe } from '@prisma/client';

export interface RecipeContextValues { ... }

const CHAT_SYSTEM_EXTENSION = `...`; // ~20 lines

export function buildConversationPrompt(...) { ... }

export function getChatSystemPrompt(...) { ... }

export function summarizeOldMessages(...) { ... }

export function buildCROEnhancedPrompt(...) { ... }

function buildContextBlock(...) { ... }

function formatContextKey(...) { ... }
```

Approximate line count: ~200 lines (down from ~267)

## Todo List

- [x] Remove LiquidValidationError import
- [x] Replace CHAT_SYSTEM_EXTENSION with simplified version
- [x] Remove buildContinuationPrompt function
- [x] Verify no other files import buildContinuationPrompt
- [x] Verify CRO functions still work
- [x] TypeScript compile check
- [x] Test chat refinement flow

## Success Criteria

- [x] No import from code-extractor
- [x] No buildContinuationPrompt function
- [x] CHAT_SYSTEM_EXTENSION uses marker format
- [x] CRO functions preserved and working
- [x] TypeScript compiles without errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chat refinement breaks | Medium | Test refinement flow |
| CRO functions affected | Medium | Keep CRO code untouched |
| Missing export causes import errors | Low | Verify all exports |

## Security Considerations

- No security-related code in this file
- Input sanitization handled elsewhere
- CRO context injection safe (user-provided values)

## Next Steps

After this phase:
- Phase 06: End-to-end testing of new flow
