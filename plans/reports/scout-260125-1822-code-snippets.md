# Code Snippets Reference: Section Deletion & Cascade

## 1. Delete Implementation (Service)

**File**: `/home/lmtnolimit/Projects/blocksmith/app/services/section.server.ts`

```typescript
/**
 * Delete section entry
 */
async delete(id: string, shop: string): Promise<boolean> {
  const existing = await prisma.section.findFirst({
    where: { id, shop },
  });

  if (!existing) return false;

  await prisma.section.delete({ where: { id } });
  return true;
}
```

**No cascade handling - orphans related records**

## 2. Delete Actions (Route)

**File**: `/home/lmtnolimit/Projects/blocksmith/app/routes/app.sections._index.tsx:88-128`

```typescript
if (actionType === "delete") {
  const id = formData.get("id") as string;
  await sectionService.delete(id, shop);
  return {
    success: true,
    action: "delete",
    message: "Section deleted successfully.",
  };
}

if (actionType === "bulkDelete") {
  const idsJson = formData.get("ids") as string;
  let ids: string[];
  try {
    ids = JSON.parse(idsJson) as string[];
    if (!Array.isArray(ids)) throw new Error("Invalid format");
  } catch {
    return {
      success: false,
      action: "bulkDelete",
      message: "Invalid request",
    };
  }

  // Delete in parallel, max 50 at a time
  const idsToDelete = ids.slice(0, 50);
  await Promise.all(idsToDelete.map((id) => sectionService.delete(id, shop)));

  return {
    success: true,
    action: "bulkDelete",
    message: `${idsToDelete.length} section${idsToDelete.length > 1 ? "s" : ""} deleted successfully.`,
    deletedCount: idsToDelete.length,
  };
}
```

**Risk**: Parallel deletes without transaction; any failure doesn't roll back others

## 3. Cascade Delete Configuration (Schema)

**File**: `/home/lmtnolimit/Projects/blocksmith/prisma/schema.prisma:271`

```prisma
// Message model - ONLY relation with cascade delete
model Message {
  id             String @id @default(auto()) @map("_id") @db.ObjectId
  conversationId String @db.ObjectId

  // ... other fields ...

  // Relations
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([createdAt])
}
```

**Only Messages cascade delete - all other models orphaned**

## 4. Orphaned Models (No Constraints)

### UsageRecord
```prisma
model UsageRecord {
  id             String @id @default(auto()) @map("_id") @db.ObjectId
  shop           String
  subscriptionId String @db.ObjectId // Link to Subscription
  sectionId      String @db.ObjectId // Link to Section - NO CASCADE
  idempotencyKey String @unique
  
  // ... rest of fields ...
  
  @@index([shop])
  @@index([subscriptionId])
  @@index([chargeStatus])
  @@index([createdAt])
}
```

### SectionFeedback
```prisma
model SectionFeedback {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  sectionId String   @db.ObjectId // Link to Section - NO CASCADE
  shop      String
  positive  Boolean
  createdAt DateTime @default(now())

  @@index([sectionId])
  @@index([shop])
  @@index([createdAt])
}
```

### FailedUsageCharge
```prisma
model FailedUsageCharge {
  id           String    @id @default(auto()) @map("_id") @db.ObjectId
  shop         String
  sectionId    String    @db.ObjectId // Link to Section - NO CASCADE
  errorMessage String
  retryCount   Int       @default(0)
  createdAt    DateTime  @default(now())
  retriedAt    DateTime?

  @@index([shop])
  @@index([createdAt])
  @@index([retryCount])
}
```

### GenerationLog (Intentionally Orphan-Safe)
```prisma
model GenerationLog {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  shop         String
  sectionId    String?  @db.ObjectId // Link to Section - NULLABLE (survives deletion)
  messageId    String?  @db.ObjectId // Links to Message
  prompt       String
  tokenCount   Int?
  modelId      String   @default("gemini-2.5-flash")
  userTier     String
  billingCycle DateTime
  wasCharged   Boolean  @default(false)
  generatedAt  DateTime @default(now())

  @@index([shop, billingCycle])
  @@index([shop, generatedAt])
}
```

## 5. Quota Survives Deletion (Test)

**File**: `/home/lmtnolimit/Projects/blocksmith/app/services/__tests__/billing.server.test.ts:223-232`

```typescript
it('hard-deleted sections do NOT restore quota', async () => {
  // GenerationLog survives section deletion
  mockedGenerationLog.count.mockResolvedValue(5); // All 5 generations logged

  const result = await checkQuota('myshop.myshopify.com');

  // Even if sections were deleted, quota still shows 5 used
  expect(result.usageThisCycle).toBe(5);
  expect(result.hasQuota).toBe(false);
});
```

**Confirms**: Quota tied to GenerationLog, not Section existence

## 6. Archive (Soft Delete) Alternative

**File**: `/home/lmtnolimit/Projects/blocksmith/app/services/section.server.ts:174-176`

```typescript
/**
 * Archive a section (soft delete)
 * Can archive from DRAFT or ACTIVE status
 */
async archive(id: string, shop: string): Promise<Section | null> {
  return this.update(id, shop, { status: SECTION_STATUS.ARCHIVE });
}
```

**Route usage**: `bulkArchive` action (line 130-154) calls this for soft delete

## 7. Conversation Relationship

**File**: `/home/lmtnolimit/Projects/blocksmith/prisma/schema.prisma:221-246`

```prisma
model Conversation {
  id        String @id @default(auto()) @map("_id") @db.ObjectId
  sectionId String @unique @db.ObjectId // 1:1 with Section
  shop      String

  // AI Context
  systemPrompt String?
  modelId      String  @default("gemini-2.5-flash")

  // Metadata
  title        String?
  messageCount Int     @default(0)
  totalTokens  Int     @default(0)

  // Status
  isArchived Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations - Messages cascade delete
  messages Message[]

  @@index([shop])
  @@index([createdAt])
}
```

**Note**: No explicit cascade delete on Conversation - relies on uniqueness constraint
