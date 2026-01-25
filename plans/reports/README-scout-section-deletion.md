# Scout Report Index: Section Deletion & Cascade Delete Analysis

Generated: 2026-01-25 at 18:22 UTC

## Report Files

### 1. **scout-260125-1822-section-deletion-cascade.md** (Main Report)
Comprehensive overview of database relationships, cascade configurations, and deletion logic.

**Key Sections**:
- Database schema relationships (Section, Conversation, Message, orphaned models)
- Current delete implementation (service & route handlers)
- Cascade delete behavior (what gets deleted, what orphans)
- Quota & billing implications
- Files involved in deletion logic
- Strengths & concerns summary
- Unresolved questions

**Use when**: Understanding the overall architecture and deletion flow

---

### 2. **scout-260125-1822-code-snippets.md** (Code Reference)
Exact code snippets from codebase with line numbers and implementation details.

**Includes**:
1. Delete implementation (Service)
2. Delete actions (Route handlers)
3. Cascade delete configuration (Schema)
4. Orphaned models (UsageRecord, SectionFeedback, FailedUsageCharge)
5. GenerationLog (Intentionally orphan-safe)
6. Quota survival test
7. Archive alternative
8. Conversation relationship

**Use when**: Quick reference to actual implementation or reviewing specific code

---

### 3. **scout-260125-1822-data-integrity.md** (Impact Analysis)
Detailed analysis of data integrity issues, risks, and recommendations.

**Covers**:
- Quick reference table (what gets deleted vs orphaned)
- Impact by feature (Billing, Chat, Analytics, Auto-Save)
- Database consistency issues (3 major issues identified)
- Audit trail preservation design
- Recommendations (4 priority levels with code examples)
- Risk assessment
- Implementation timeline

**Use when**: Planning fixes or assessing risk impact

---

## Quick Navigation

### I want to understand...

**...how section deletion works overall**
→ Start with `scout-260125-1822-section-deletion-cascade.md`

**...the actual code implementation**
→ Jump to `scout-260125-1822-code-snippets.md`

**...what happens to my data when sections are deleted**
→ Read `scout-260125-1822-data-integrity.md` (Quick Reference section first)

**...how to fix the orphaned data problem**
→ See `scout-260125-1822-data-integrity.md` (Recommendations section)

**...if quota is safe after deletion**
→ Check `scout-260125-1822-code-snippets.md` (Quota Survives test) or `scout-260125-1822-data-integrity.md` (Billing System status)

---

## Key Findings Summary

### What's Working ✅
1. **Messages cascade delete** - Uses Prisma `onDelete: Cascade` relation
2. **Quota preserved** - GenerationLog survives with nullable sectionId
3. **Chat cleanup** - Conversations auto-deleted via unique constraint
4. **Soft delete option** - Archive status allows recovery

### What Needs Attention ⚠️
1. **Orphaned billing records** - UsageRecord, FailedUsageCharge, SectionFeedback have no FK constraints
2. **Bulk delete not transactional** - 50 parallel deletes can partially fail
3. **Implicit conversation deletion** - Relies on unique constraint, not explicit delete
4. **Analytics at risk** - SectionFeedback feedback orphaned after deletion

### Orphaned Data (By Design)
- **GenerationLog** - Intentionally survives deletion (nullable sectionId) for audit trail
- **UsageRecord** - Survives deletion (no cascade) to track historical billing
- **SectionFeedback** - Survives deletion (no cascade) as feedback record

---

## File References

### Database Schema
- `/home/lmtnolimit/Projects/blocksmith/prisma/schema.prisma` - All model definitions

### Service Layer
- `/home/lmtnolimit/Projects/blocksmith/app/services/section.server.ts:292-301` - Delete method
- `/home/lmtnolimit/Projects/blocksmith/app/services/chat.server.ts` - Conversation management
- `/home/lmtnolimit/Projects/blocksmith/app/services/billing.server.ts` - Quota logic

### Route Handlers
- `/home/lmtnolimit/Projects/blocksmith/app/routes/app.sections._index.tsx:88-128` - Delete actions
- `/home/lmtnolimit/Projects/blocksmith/app/routes/app.sections.$id.tsx:38-80` - Editor loader

### Tests
- `/home/lmtnolimit/Projects/blocksmith/app/services/__tests__/section.server.test.ts:731-745` - Delete test
- `/home/lmtnolimit/Projects/blocksmith/app/services/__tests__/billing.server.test.ts:223-232` - Quota test

---

## Recommendations Priority

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Add FK constraints OR make fields nullable | 2hrs | Prevent orphans |
| 2 | Add transaction to bulk delete | 1hr | Prevent partial success |
| 3 | Explicit conversation cleanup | 30min | Clarify intent |
| 4 | Update delete UI messaging | 1hr | Set user expectations |

See `scout-260125-1822-data-integrity.md` for detailed implementation code.

---

## Model Relationship Matrix

```
Section (Root)
├── Conversation (1:1, @unique sectionId)
│   └── Message[] (1:N, @relation onDelete: Cascade)
├── UsageRecord (FK, no constraint - ORPHANS)
├── SectionFeedback (FK, no constraint - ORPHANS)
├── FailedUsageCharge (FK, no constraint - ORPHANS)
└── GenerationLog (FK nullable - INTENTIONAL ORPHAN)
```

---

## Status Summary

| Component | Status | Concern |
|-----------|--------|---------|
| Messages | ✅ Safe | Cascade delete works |
| Conversations | ✅ Safe | Auto-deleted via unique constraint |
| Quota | ✅ Safe | GenerationLog survives |
| Billing Records | ⚠️ Orphans | No cascade, accumulate over time |
| Feedback | ⚠️ Orphans | No cascade, orphaned records |
| Analytics | ⚠️ Risk | Reporting queries break on orphans |
| Transactions | ⚠️ Risk | Bulk delete not atomic |

---

## Questions Raised

1. Are orphaned UsageRecords/SectionFeedback intentionally kept for audit?
2. Should hard delete be prevented if unpublished UsageRecords exist?
3. Is there a data cleanup job for orphaned records?
4. Should bulk delete use a transaction instead of parallel Promise.all()?
5. Should Conversation deletion be explicit rather than implicit?

See main report for full unresolved questions section.

---

## How to Use This Scout Report

1. **Read all 3 reports** in order for complete understanding
2. **Reference code snippets** when implementing fixes
3. **Check impact analysis** to assess risks before changes
4. **Follow recommendations** in priority order
5. **Use matrices & tables** for quick lookups

---

**Scout ID**: ac5ce0e | **Report Date**: 2026-01-25 | **Codebase**: Blocksmith
