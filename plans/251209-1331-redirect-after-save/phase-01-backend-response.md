# Phase 01: Update Backend Response with Section ID

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Dependencies**: None
- **Related Docs**: [codebase-summary.md](../../docs/codebase-summary.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-09 |
| Priority | P1 |
| Implementation Status | ✅ DONE |
| Review Status | ✅ DONE |

**Description**: Modify the save action in `app.sections.new.tsx` to return the section ID in the response, enabling frontend redirect.

## Key Insights

1. Section is already created during generate action (`sectionService.create()`)
2. Save action updates existing section with theme info
3. `currentHistoryId` state already tracks the section ID
4. Just need to pass `historyId` through save action response

## Requirements

1. Save action must return `sectionId` on success
2. Type `SaveActionData` needs update to include optional `sectionId`
3. Must work for both new sections and regenerated sections

## Architecture

```
Current Flow:
  generate action → creates section → returns historyId
  save action → updates section → returns { success, message }

New Flow:
  generate action → creates section → returns historyId (unchanged)
  save action → updates section → returns { success, message, sectionId }
```

## Related Code Files

| File | Purpose |
|------|---------|
| `app/routes/app.sections.new.tsx` | Save action handler (lines 72-103) |
| `app/types/index.ts` | `SaveActionData` type definition |

## Implementation Steps

### Step 1: Update SaveActionData Type

**File**: `app/types/index.ts`

Add `sectionId` to `SaveActionData`:

```typescript
export interface SaveActionData {
  success: boolean;
  message: string;
  sectionId?: string;  // Add this field
}
```

### Step 2: Update Save Action Response

**File**: `app/routes/app.sections.new.tsx` (save action block)

Return `sectionId` in success response:

```typescript
if (actionType === "save") {
  // ... existing validation and save logic ...

  // Get the section ID (from historyId or generate new save)
  const sectionId = historyId || currentHistoryId;

  return {
    success: true,
    message: `Section saved successfully to ${result?.filename || fileName}!`,
    sectionId: historyId || undefined,  // Pass the section ID
  } satisfies SaveActionData;
}
```

## Todo List

- [x] Update `SaveActionData` type in `app/types/service.types.ts`
- [x] Update save action response in `app/routes/app.sections.new.tsx`
- [x] Verify type consistency

## Success Criteria

- Save action returns `sectionId` on successful save
- TypeScript types are consistent
- No breaking changes to existing functionality

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type mismatch | Low | Low | TypeScript will catch at compile |
| Missing sectionId | Low | Medium | historyId is set during generate |

## Security Considerations

- No new security concerns; sectionId is already available client-side
- Shop ownership validated by `sectionService.update()`

## Next Steps

After this phase, proceed to [Phase 02](./phase-02-frontend-redirect.md) to implement frontend redirect.
