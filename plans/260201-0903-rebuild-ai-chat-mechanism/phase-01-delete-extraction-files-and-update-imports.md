---
phase: 01
title: "Delete Extraction Files and Update Imports"
status: done
effort: 0.5h
---

# Phase 01: Delete Extraction Files and Update Imports

## Context Links

- [Plan Overview](./plan.md)
- [SSE Research](./research/researcher-01-sse-streaming.md)

## Overview

**Priority:** P1 - Must complete first (other phases depend on this)
**Current Status:** Pending

Delete the two code extraction files that cause broken extraction behavior. Update all imports to remove references.

## Key Insights

- `code-extraction.client.ts` (171 lines) duplicates extraction logic on client
- `code-extractor.ts` (465 lines) contains server-side extraction + validation
- Dual extraction causes sync issues between server/client state
- Removing these files eliminates the root cause of malformed code

## Requirements

### Functional
- Delete both extraction files completely
- Remove all import statements referencing these files
- Ensure TypeScript compiles without errors

### Non-Functional
- No runtime errors from missing imports
- Tests referencing deleted files should be removed

## Related Code Files

### Files to DELETE

| File | Lines | Purpose |
|------|-------|---------|
| `app/utils/code-extraction.client.ts` | 171 | Client-side extraction (extractCodeFromContent, sanitizeLiquidCode) |
| `app/utils/code-extractor.ts` | 465 | Server extraction + validation (extractCodeFromResponse, validateLiquidCompleteness, mergeResponses) |

### Files to MODIFY (remove imports)

| File | Line(s) | Import to Remove |
|------|---------|------------------|
| `app/routes/api.chat.stream.tsx` | 5 | `import { extractCodeFromResponse, validateLiquidCompleteness, mergeResponses } from "../utils/code-extractor"` |
| `app/components/chat/hooks/useChat.ts` | 10 | `import { extractCodeFromContent, sanitizeLiquidCode } from '../../../utils/code-extraction.client'` |
| `app/utils/context-builder.ts` | 3 | `import type { LiquidValidationError } from './code-extractor'` |

### Test Files to DELETE

| File | Reason |
|------|--------|
| `app/utils/__tests__/code-extraction.client.test.ts` | Tests deleted module (if exists) |
| `app/utils/__tests__/code-extractor.test.ts` | Tests deleted module (if exists) |

## Implementation Steps

1. **Delete extraction files**
   ```bash
   rm app/utils/code-extraction.client.ts
   rm app/utils/code-extractor.ts
   ```

2. **Delete test files (if exist)**
   ```bash
   rm -f app/utils/__tests__/code-extraction.client.test.ts
   rm -f app/utils/__tests__/code-extractor.test.ts
   ```

3. **Update api.chat.stream.tsx (line 5)**
   - Remove import line for code-extractor
   - Leave file with temporary compile errors (fixed in Phase 03)

4. **Update useChat.ts (line 10)**
   - Remove import line for code-extraction.client
   - Leave file with temporary compile errors (fixed in Phase 04)

5. **Update context-builder.ts (line 3)**
   - Remove `import type { LiquidValidationError } from './code-extractor'`
   - Leave file with temporary compile errors (fixed in Phase 05)

6. **Verify no other imports exist**
   ```bash
   grep -r "code-extraction" app/ --include="*.ts" --include="*.tsx"
   grep -r "code-extractor" app/ --include="*.ts" --include="*.tsx"
   ```

## Todo List

- [x] Delete `app/utils/code-extraction.client.ts`
- [x] Delete `app/utils/code-extractor.ts`
- [x] Delete test files for extraction modules (3 files)
- [x] Remove import from `api.chat.stream.tsx`
- [x] Remove import from `useChat.ts`
- [x] Remove import from `context-builder.ts` (added local type)
- [x] Verify no remaining references with grep
- [x] Document temporary compile errors for subsequent phases

## Success Criteria

- [x] Both extraction files deleted
- [x] No grep results for "code-extraction" or "code-extractor" in app/
- [x] Import removal documented for next phases
- [x] Git shows clean deletion of 1509 lines (exceeded 636 estimate)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Other files depend on deleted exports | High | Grep search before deletion |
| Tests fail on missing modules | Medium | Delete related test files |
| Temporary compile errors | Low | Expected; fixed in phases 03-05 |

## Security Considerations

- `sanitizeLiquidCode` from input-sanitizer.ts is PRESERVED (separate file)
- XSS protection remains intact via input-sanitizer.ts
- No security functionality removed

## Next Steps

After this phase:
- Phase 02: Refactor SYSTEM_PROMPT to output raw Liquid with markers
- Phase 03: Update api.chat.stream.tsx to remove extraction calls
- Phase 04: Update useChat.ts for direct storage
