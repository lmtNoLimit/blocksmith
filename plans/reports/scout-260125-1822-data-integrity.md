# Data Integrity Analysis: Section Deletion Impact

## Quick Reference: What Happens When Section Deleted

### Immediately Deleted
- ✅ Section record (hard delete)
- ✅ Conversation record (by unique constraint, via Prisma cascade logic)
- ✅ All Messages (cascade via `onDelete: Cascade`)

### Survives as Orphaned (NO ACTION)
- ❌ UsageRecord entries (billing records)
- ❌ SectionFeedback entries (user feedback)
- ❌ FailedUsageCharge entries (failed billing attempts)
- ✅ GenerationLog entries (intentional - nullable sectionId)

## Impact by Feature

### Billing System
**Status**: ✅ SAFE
- **Why**: GenerationLog survives with sectionId=null
- **Quota Logic**: Queries `GenerationLog.shop` + `billingCycle`, not Section
- **Test Confirms**: `hard-deleted sections do NOT restore quota`
- **Orphan Impact**: UsageRecord orphans don't affect quota calculation
- **Risk**: Reports showing "Section: <deleted>" will have dead links

### Chat/Conversation
**Status**: ✅ SAFE
- **Implementation**: Messages cascade delete automatically
- **Flow**: Section deletion → Conversation unique constraint broken → Conversation deleted → Messages cascade deleted
- **User Experience**: Conversations disappear cleanly (no orphaned messages)

### Section Analytics
**Status**: ⚠️ AT RISK
- **Problem**: SectionFeedback (thumbs up/down) orphaned after deletion
- **Impact**: Historical feedback querying becomes problematic
- **Queries Affected**: Reports filtering by `sectionId` will return deleted sections

### Auto-Save System
**Status**: ✅ SAFE
- **Note**: GenerationLog tracks every AI generation independent of Section
- **Recovery**: Users can reference GenerationLog even if Section deleted
- **Purpose**: Audit trail intentionally survives deletion

## Database Consistency Issues

### Issue 1: UsageRecord Orphans
```
Problem: sectionId foreign key reference becomes orphaned
Scenario: 
  1. User generates section → creates UsageRecord
  2. User deletes section
  3. UsageRecord.sectionId now points to non-existent Section
  
Resolution Options:
  a) Add FK constraint with CASCADE (automatic cleanup)
  b) Set sectionId=null on deletion (nullable design)
  c) Prevent deletion if UsageRecords exist (business rule)
  d) Leave as-is (audit trail philosophy)
```

### Issue 2: Bulk Delete Without Transaction
```
Problem: 50 parallel deletes can partially succeed
Scenario:
  1. User bulk deletes 50 sections
  2. 25 succeed, 25 fail (DB constraint, permission, etc)
  3. User sees success but only 25 deleted
  4. Orphaned data inconsistent
  
Current Code:
  await Promise.all(idsToDelete.map((id) => sectionService.delete(id, shop)));
  
Better Approach:
  Use Prisma transaction or check all exist before deleting
```

### Issue 3: Conversation Deletion Implicit
```
Problem: Conversation deletion not explicitly triggered
Current Behavior: Relies on MongoDB unique constraint
Risk: If unique constraint removed, Conversations remain orphaned
Better: Explicit deletion before Section deletion
```

## Audit Trail Preservation

### GenerationLog Design Intentional
```
Field: sectionId String? @db.ObjectId (NULLABLE)

Benefits:
  ✅ Never lose audit records
  ✅ Quota calculations survive deletion
  ✅ Can query "all AI generations" even with deleted sections
  ✅ Supports billing reconciliation

Cost:
  ❌ Orphaned null references (by design)
  ❌ Schema complexity (nullable FK)
```

### Test Coverage Confirms Intent
Line 223-232 of `billing.server.test.ts`:
> "hard-deleted sections do NOT restore quota"

This test explicitly validates that GenerationLog survives deletion.

## Recommendations for Data Integrity

### Priority 1: Add Foreign Key Constraints (Medium Effort)
```prisma
// UsageRecord - add relation
model UsageRecord {
  // ... existing fields ...
  section Section? @relation(fields: [sectionId], references: [id], onDelete: Cascade)
}

// SectionFeedback - add relation  
model SectionFeedback {
  // ... existing fields ...
  section Section? @relation(fields: [sectionId], references: [id], onDelete: Cascade)
}

// FailedUsageCharge - add relation
model FailedUsageCharge {
  // ... existing fields ...
  section Section? @relation(fields: [sectionId], references: [id], onDelete: Cascade)
}
```

**Trade-off**: Automatic cleanup vs. audit trail loss

### Priority 2: Alternative - Orphan-Safe Design (Low Effort)
```prisma
// Keep structure, but make nullable to document orphan intent
model UsageRecord {
  sectionId String? @db.ObjectId  // Nullable = survives deletion
}

model SectionFeedback {
  sectionId String? @db.ObjectId  // Nullable = survives deletion
}

model FailedUsageCharge {
  sectionId String? @db.ObjectId  // Nullable = survives deletion
}
```

**Trade-off**: Explicit about orphaning, matches GenerationLog design

### Priority 3: Use Transactions for Bulk Deletes (Low Effort)
```typescript
// Current: Promise.all() - no transaction
await Promise.all(idsToDelete.map((id) => sectionService.delete(id, shop)));

// Better: Atomic operation
await prisma.$transaction(
  idsToDelete.map((id) => prisma.section.deleteMany({ where: { id, shop } }))
);

// Or: Check all exist first
const existing = await prisma.section.findMany({ where: { id: { in: idsToDelete } } });
if (existing.length !== idsToDelete.length) {
  throw new Error('Some sections not found');
}
await Promise.all(idsToDelete.map((id) => sectionService.delete(id, shop)));
```

### Priority 4: Explicit Conversation Cleanup (Low Effort)
```typescript
// In sectionService.delete()
async delete(id: string, shop: string): Promise<boolean> {
  const existing = await prisma.section.findFirst({ where: { id, shop } });
  if (!existing) return false;

  // Explicit conversation cleanup
  await prisma.conversation.deleteMany({ where: { sectionId: id } });
  
  // Then delete section
  await prisma.section.delete({ where: { id } });
  return true;
}
```

**Why**: Documents intent, handles if cascade behavior changes

## Risk Assessment

### Data Loss Risk
- **Current**: LOW - GenerationLog survives, quota preserved
- **Concern**: Feedback & billing records orphaned but not lost

### Quota Accuracy Risk  
- **Current**: LOW - GenerationLog independent of Sections
- **Test Confirms**: Quota doesn't restore on deletion

### Consistency Risk
- **Current**: MEDIUM - Orphaned references accumulate
- **Impact**: Reporting queries must filter deleted sectionId

### User Impact
- **Archive Path**: Users can recover via Archive tab
- **Delete Path**: Hard delete permanent, no recovery UI
- **Recommendation**: Encourage Archive over Delete in UI

## Implementation Timeline

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Add FK constraints OR make nullable | 2hrs | Prevents orphans |
| 2 | Add transaction to bulk delete | 1hr | Prevents partial success |
| 3 | Explicit conversation cleanup | 30min | Clarifies intent |
| 4 | Update delete UI messaging | 1hr | Sets user expectations |

## Summary Table: Models & Delete Behavior

| Model | Relation Type | Delete Behavior | Status |
|-------|---------------|-----------------|--------|
| Section | Root | Hard delete | ❌ Hard delete only |
| Conversation | 1:1, @unique | Cascade via Prisma | ✅ Auto-deleted |
| Message | 1:N, @relation | Cascade via `onDelete: Cascade` | ✅ Auto-deleted |
| UsageRecord | FK (no constraint) | Orphaned | ⚠️ Orphaned |
| SectionFeedback | FK (no constraint) | Orphaned | ⚠️ Orphaned |
| FailedUsageCharge | FK (no constraint) | Orphaned | ⚠️ Orphaned |
| GenerationLog | FK (nullable) | Orphaned (intentional) | ✅ By design |

