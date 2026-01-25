---
parent: ./plan.md
phase: 01
status: completed
completed: 2026-01-25
---

# Phase 01: Section Service Cascade Delete

## Overview

Update `sectionService.delete()` to cascade delete all related data in a single Prisma transaction.

## Context

**Current implementation** (section.server.ts:292-301):
```typescript
async delete(id: string, shop: string): Promise<boolean> {
  const existing = await prisma.section.findFirst({
    where: { id, shop },
  });
  if (!existing) return false;
  await prisma.section.delete({ where: { id } });
  return true;
}
```

**Problem:** Only deletes Section record. Related data orphaned.

## Requirements

Delete in order (within transaction):
1. **Messages** - via Conversation (already cascades, but explicit is safer)
2. **Conversation** - 1:1 with Section
3. **UsageRecord** - billing records linked to Section
4. **SectionFeedback** - quality feedback
5. **FailedUsageCharge** - failed billing attempts
6. **Section** - the main record

**DO NOT delete:** `GenerationLog` (audit trail, nullable sectionId by design)

## Architecture

```
prisma.$transaction([
  // 1. Get conversation ID for this section
  // 2. Delete Messages where conversationId (explicit cascade)
  // 3. Delete Conversation where sectionId
  // 4. Delete UsageRecord where sectionId
  // 5. Delete SectionFeedback where sectionId
  // 6. Delete FailedUsageCharge where sectionId
  // 7. Delete Section
])
```

## Related Code Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/services/section.server.ts` | 292-301 | Delete method to modify |
| `prisma/schema.prisma` | 150-175 | UsageRecord model |
| `prisma/schema.prisma` | 206-218 | FailedUsageCharge model |
| `prisma/schema.prisma` | 220-246 | Conversation model |
| `prisma/schema.prisma` | 248-275 | Message model |
| `prisma/schema.prisma` | 278-288 | SectionFeedback model |

## Implementation Steps

### Step 1: Update delete method signature (optional)
Consider adding return type with deletion counts for logging/debugging.

### Step 2: Implement transactional delete

```typescript
async delete(id: string, shop: string): Promise<boolean> {
  const existing = await prisma.section.findFirst({
    where: { id, shop },
  });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    // Get conversation for this section
    const conversation = await tx.conversation.findUnique({
      where: { sectionId: id },
    });

    if (conversation) {
      // Delete messages first (explicit, even though cascade exists)
      await tx.message.deleteMany({
        where: { conversationId: conversation.id },
      });
      // Delete conversation
      await tx.conversation.delete({
        where: { id: conversation.id },
      });
    }

    // Delete billing/feedback records
    await tx.usageRecord.deleteMany({
      where: { sectionId: id },
    });
    await tx.sectionFeedback.deleteMany({
      where: { sectionId: id },
    });
    await tx.failedUsageCharge.deleteMany({
      where: { sectionId: id },
    });

    // Finally delete the section
    await tx.section.delete({
      where: { id },
    });
  });

  return true;
}
```

### Step 3: Add error handling
Wrap transaction in try-catch, log failures.

## Todo List

- [x] Read current delete implementation ✅
- [x] Implement transactional cascade delete ✅
- [x] Add error handling and logging ✅
- [x] Test single section deletion ✅
- [x] Verify no orphaned records ✅

## Success Criteria

- Section delete removes all related records atomically
- Transaction rollback on any failure
- GenerationLog records remain (sectionId becomes orphan reference, acceptable)
- Existing functionality preserved

## Security Considerations

- Shop validation already in place (prevents cross-tenant deletion)
- Transaction ensures atomic operation (no partial state)

## Completion Summary

**Status**: ✅ COMPLETE (2026-01-25)
**Review**: See `plans/reports/code-reviewer-260125-1842-cascade-delete-phase01.md`

**Implementation Results**:
- ✅ Transactional cascade delete implemented (lines 302-334)
- ✅ Error handling with logging (lines 337-340)
- ✅ Comprehensive test coverage (4 test cases)
- ✅ All success criteria met
- ✅ No security issues
- ✅ 0 TypeScript errors, 0 lint errors

**Key Changes**:
- `app/services/section.server.ts:292-342` - Updated delete() method
- `app/services/__tests__/section.server.test.ts:745-839` - Added cascade delete tests

## Next Steps

**Phase 02**: Make bulk delete transactional (route layer optimization)
