# Scout Report: Section & Conversation Relationships and Deletion Logic

## Executive Summary

Scouted codebase to understand section-conversation relationships, cascade delete configurations, and orphaned data risks when sections are deleted. Found one-to-one relationship with cascade delete on messages, but orphaned data exists in UsageRecord, SectionFeedback, and GenerationLog models.

## Database Schema: Relationships

### Section Model (Root)
- **Location**: `/home/lmtnolimit/Projects/blocksmith/prisma/schema.prisma:36-58`
- **Status**: No direct relations defined (MongoDB ObjectId references only)
- **Indexes**: shop, createdAt, status

### Conversation Model (1:1 with Section)
- **Location**: `/home/lmtnolimit/Projects/blocksmith/prisma/schema.prisma:221-246`
- **Relationship**: `sectionId String @unique @db.ObjectId` - one conversation per section
- **Messages Relation**: `messages Message[]` with cascade delete on child messages
- **Structure**: Stores AI context, messageCount, totalTokens, isArchived flag

### Message Model (Child of Conversation)
- **Location**: `/home/lmtnolimit/Projects/blocksmith/prisma/schema.prisma:249-275`
- **Cascade Delete**: `conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)`
- **Behavior**: Messages automatically deleted when conversation deleted

### Orphaned Data Models (No Foreign Key Constraints)

| Model | Field | Issue | Impact |
|-------|-------|-------|--------|
| **UsageRecord** | `sectionId String @db.ObjectId` | No FK constraint, no cascade | Orphaned records remain; quota tracking survives |
| **SectionFeedback** | `sectionId String @db.ObjectId` | No FK constraint, no cascade | Orphaned feedback records remain |
| **GenerationLog** | `sectionId String? @db.ObjectId` (nullable) | Intentionally nullable for audit trail | Already designed to survive section deletion |
| **FailedUsageCharge** | `sectionId String @db.ObjectId` | No FK constraint, no cascade | Orphaned failed charges remain |

## Current Delete Implementation

### Section Delete Flow
- **Service**: `/home/lmtnolimit/Projects/blocksmith/app/services/section.server.ts:292-301`
- **Method**: `sectionService.delete(id: string, shop: string): Promise<boolean>`
- **Operation**: Hard delete via `prisma.section.delete({ where: { id } })`
- **Note**: No cascade handling for related data

### Section Delete Actions (Routes)
- **Route**: `/home/lmtnolimit/Projects/blocksmith/app/routes/app.sections._index.tsx:88-128`
- **Single Delete**: `actionType === "delete"` → calls `sectionService.delete(id, shop)`
- **Bulk Delete**: `actionType === "bulkDelete"` → deletes up to 50 sections in parallel via `Promise.all()`
- **Bulk Archive**: `actionType === "bulkArchive"` → sets status to ARCHIVE (soft delete)

### Archive vs Delete
- **Archive (Soft Delete)**: Sets `status: SECTION_STATUS.ARCHIVE` - recoverable, section remains in DB
- **Hard Delete**: Completely removes section record via `prisma.section.delete()`
- **UI**: Archive tab (line 47) shows archived sections separately from deleted ones

## Cascade Delete Behavior

### What Gets Deleted
1. **Conversation** - Auto-deleted if unique constraint allows
2. **Messages** - Cascade deleted via `onDelete: Cascade` relationship
3. **GenerationLog.sectionId** - Left as orphaned reference (nullable field, intentionally survives)

### What Remains as Orphaned
1. **UsageRecord** - No relation defined, remains in DB pointing to deleted sectionId
2. **SectionFeedback** - No relation defined, remains in DB pointing to deleted sectionId  
3. **FailedUsageCharge** - No relation defined, remains in DB pointing to deleted sectionId
4. **GenerationLog** - Intentionally survives with sectionId=null after deletion

## Quota & Billing Implications

### GenerationLog Survives Deletion
- **Test**: `/home/lmtnolimit/Projects/blocksmith/app/services/__tests__/billing.server.test.ts:223-232`
- **Behavior**: "hard-deleted sections do NOT restore quota"
- **Purpose**: Audit trail & quota tracking independent of section existence
- **Fallback**: If no GenerationLog found, system falls back to `section.count()` for legacy data

### Orphaned UsageRecords
- **Impact**: Billing calculations continue to reference deleted sections
- **Risk**: Reports/analytics referencing sectionId will have dead links
- **State**: chargeStatus tracked independently; orphaned records don't affect new charges

## Files Involved

### Core Services
- `/home/lmtnolimit/Projects/blocksmith/app/services/section.server.ts` - Delete implementation
- `/home/lmtnolimit/Projects/blocksmith/app/services/chat.server.ts` - Conversation/message management
- `/home/lmtnolimit/Projects/blocksmith/app/services/billing.server.ts` - Quota logic with fallback

### Routes/Actions
- `/home/lmtnolimit/Projects/blocksmith/app/routes/app.sections._index.tsx` - Delete actions
- `/home/lmtnolimit/Projects/blocksmith/app/routes/app.sections.$id.tsx` - Editor loads conversation

### Schema & Types
- `/home/lmtnolimit/Projects/blocksmith/prisma/schema.prisma` - All model definitions
- `/home/lmtnolimit/Projects/blocksmith/app/types/section-status.ts` - Status enum & transitions

### Tests
- `/home/lmtnolimit/Projects/blocksmith/app/services/__tests__/section.server.test.ts:731-745` - Delete test
- `/home/lmtnolimit/Projects/blocksmith/app/services/__tests__/billing.server.test.ts:223-232` - Quota survival test

## Key Findings

### ✅ Strengths
1. Messages cascade delete properly via Prisma relation
2. GenerationLog survives deletion intentionally (audit trail preserved)
3. Quota system robust - uses GenerationLog first, falls back to Section.count()
4. Soft delete (archive) option available for recovery

### ⚠️ Concerns
1. **No Foreign Key Constraints**: UsageRecord, SectionFeedback, FailedUsageCharge have no database constraints
2. **Orphaned Data Accumulation**: Deleting sections leaves orphaned billing/feedback records
3. **No Cleanup Mechanism**: Orphaned records accumulate over time
4. **Analytics/Reporting**: Dead sectionId references may complicate billing dashboards
5. **Bulk Delete Parallel**: 50 parallel deletions - if one fails, others still proceed (no transaction)

## Unresolved Questions

1. Are orphaned UsageRecords/SectionFeedback/FailedUsageCharge intentionally kept for audit?
2. Should hard delete be prevented if unpublished UsageRecords exist?
3. Is there a data cleanup job for orphaned records?
4. Should bulk delete use a transaction instead of parallel Promise.all()?
5. Should Conversation deletion be explicit (currently implicit if section deleted)?
