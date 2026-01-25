---
title: "Section Cascade Delete"
description: "Delete all related data when a section is deleted"
status: completed
completed_at: 2026-01-25
priority: P2
effort: 2h
branch: main
tags: [database, data-integrity, prisma]
created: 2026-01-25
---

# Section Cascade Delete Implementation Plan

## Overview

Implement proper cascade deletion for sections to ensure all related data is cleaned up when a section is deleted, preventing orphaned records.

## Current State

When a section is deleted, the following related data becomes orphaned:
- **Conversation** - 1:1 relationship via `sectionId` (unique constraint)
- **Messages** - Already cascades from Conversation (configured in schema)
- **UsageRecord** - References `sectionId` but no cascade
- **SectionFeedback** - References `sectionId` but no cascade
- **FailedUsageCharge** - References `sectionId` but no cascade

**Note:** `GenerationLog.sectionId` is nullable by design (audit trail preservation).

## Implementation Approach

**Option B: Application-level cascade** (Recommended)

Using Prisma transaction to delete related records before section deletion. This approach:
- Provides explicit control over deletion order
- Allows audit logging before deletion
- Works reliably with MongoDB (FK constraints behavior)
- Can be extended for soft-delete scenarios

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 01](./phase-01-section-service-cascade.md) | Update section.server.ts delete method | ✅ Completed (2026-01-25) |
| [Phase 02](./phase-02-bulk-delete-transactional.md) | Make bulk delete transactional | ✅ Completed (2026-01-25) |

## Key Files

- `prisma/schema.prisma` - Database models
- `app/services/section.server.ts` - Section CRUD (delete method lines 292-301)
- `app/routes/app.sections._index.tsx` - Route actions (lines 88-128)

## Success Criteria

1. Single section delete cleans up all related data atomically
2. Bulk delete uses transaction (no partial failures)
3. GenerationLog records preserved (nullable sectionId unchanged)
4. Existing tests pass
5. No orphaned records after deletion

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Data loss if delete fails mid-transaction | Prisma transaction ensures atomicity |
| Performance impact on bulk delete | Batch operations in single transaction |
| Existing code calling delete directly | Service method is single point of entry |

## Related Scout Reports

- `plans/reports/scout-260125-1822-section-deletion-cascade.md`
- `plans/reports/scout-260125-1822-code-snippets.md`
- `plans/reports/scout-260125-1822-data-integrity.md`
