---
parent: ./plan.md
phase: 02
status: pending
---

# Phase 02: Bulk Delete Transactional

## Overview

Refactor bulk delete to use single Prisma transaction instead of parallel Promise.all.

## Context

**Current implementation** (app.sections._index.tsx:118-120):
```typescript
const idsToDelete = ids.slice(0, 50);
await Promise.all(idsToDelete.map((id) => sectionService.delete(id, shop)));
```

**Problem:**
- Parallel deletes can partially succeed, leaving inconsistent state
- Each delete is separate transaction (50 transactions for 50 items)
- No rollback if one fails

## Requirements

1. Wrap all deletions in single transaction
2. All-or-nothing semantics
3. Maintain 50-item limit
4. Cascade delete for each section (reuse Phase 01 logic)

## Architecture

Two options:

**Option A: Batch deleteMany (simpler, recommended)**
```typescript
await prisma.$transaction(async (tx) => {
  // Get all conversations for these sections
  const conversations = await tx.conversation.findMany({
    where: { sectionId: { in: ids } },
    select: { id: true },
  });
  const convIds = conversations.map(c => c.id);

  // Batch delete in order
  await tx.message.deleteMany({ where: { conversationId: { in: convIds } } });
  await tx.conversation.deleteMany({ where: { sectionId: { in: ids } } });
  await tx.usageRecord.deleteMany({ where: { sectionId: { in: ids } } });
  await tx.sectionFeedback.deleteMany({ where: { sectionId: { in: ids } } });
  await tx.failedUsageCharge.deleteMany({ where: { sectionId: { in: ids } } });
  await tx.section.deleteMany({ where: { id: { in: ids }, shop } });
});
```

**Option B: Loop with shared transaction**
```typescript
await prisma.$transaction(async (tx) => {
  for (const id of ids) {
    await deleteSectionWithTx(tx, id, shop);
  }
});
```

**Recommendation:** Option A - fewer queries, better performance.

## Related Code Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/routes/app.sections._index.tsx` | 104-128 | Bulk delete action |
| `app/services/section.server.ts` | 292-301 | Delete method |

## Implementation Steps

### Step 1: Add bulk delete method to sectionService

```typescript
async bulkDelete(ids: string[], shop: string): Promise<number> {
  // Validate ownership first
  const existing = await prisma.section.findMany({
    where: { id: { in: ids }, shop },
    select: { id: true },
  });
  const validIds = existing.map(s => s.id);
  if (validIds.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    // Get conversations
    const conversations = await tx.conversation.findMany({
      where: { sectionId: { in: validIds } },
      select: { id: true },
    });
    const convIds = conversations.map(c => c.id);

    // Cascade delete
    if (convIds.length > 0) {
      await tx.message.deleteMany({ where: { conversationId: { in: convIds } } });
      await tx.conversation.deleteMany({ where: { id: { in: convIds } } });
    }
    await tx.usageRecord.deleteMany({ where: { sectionId: { in: validIds } } });
    await tx.sectionFeedback.deleteMany({ where: { sectionId: { in: validIds } } });
    await tx.failedUsageCharge.deleteMany({ where: { sectionId: { in: validIds } } });
    await tx.section.deleteMany({ where: { id: { in: validIds } } });
  });

  return validIds.length;
}
```

### Step 2: Update route action

```typescript
if (actionType === "bulkDelete") {
  // ... existing validation ...
  const idsToDelete = ids.slice(0, 50);
  const deletedCount = await sectionService.bulkDelete(idsToDelete, shop);
  return {
    success: true,
    action: "bulkDelete",
    message: `${deletedCount} section${deletedCount > 1 ? "s" : ""} deleted successfully.`,
    deletedCount,
  };
}
```

### Step 3: Add error handling

Wrap in try-catch, return appropriate error response.

## Todo List

- [ ] Add `bulkDelete` method to sectionService
- [ ] Update route action to use new method
- [ ] Add error handling
- [ ] Test bulk deletion (2-3 sections)
- [ ] Verify transaction rollback on failure

## Success Criteria

- Bulk delete atomic (all or nothing)
- Single transaction for all sections
- Related data deleted for all sections
- Proper error handling and response

## Security Considerations

- Shop validation ensures only owner's sections deleted
- Transaction prevents partial state

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Transaction timeout on large batch | 50-item limit maintained |
| Memory usage with many relations | deleteMany is efficient |

## Next Steps

After both phases: Manual testing, then merge to main.
