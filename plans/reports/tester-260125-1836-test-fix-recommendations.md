# Section Service Delete Method - Test Fixes Required

## Executive Summary
The cascade delete implementation is **correct** but the **test mocks are incomplete**. The test suite fails because `prisma.$transaction` is not mocked.

**Status**: READY TO FIX (no code changes needed to implementation)

---

## The Problem

### Failing Test
```
FAIL app/services/__tests__/section.server.test.ts
  ● SectionService › delete › should delete section by id
    TypeError: db_server_1.default.$transaction is not a function
```

### Why It Fails
The implementation uses `prisma.$transaction()`:
```typescript
// app/services/section.server.ts:302
await prisma.$transaction(async (tx) => {
  // cascade delete operations...
})
```

But the test mock doesn't include it:
```typescript
// app/services/__tests__/section.server.test.ts:10-22
jest.mock('../../db.server', () => ({
  default: {
    section: { create, update, findFirst, ... },
    // Missing: $transaction
  },
}));
```

---

## The Fix

### Update Mock Setup

**File**: `/home/lmtnolimit/Projects/blocksmith/app/services/__tests__/section.server.test.ts`

**Location**: Lines 10-36 (replace existing mock setup)

**Old Code**:
```typescript
jest.mock('../../db.server', () => ({
  __esModule: true,
  default: {
    section: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
```

**New Code**:
```typescript
jest.mock('../../db.server', () => {
  // Create individual model mocks
  const mockedSection = {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };

  const mockedConversation = {
    findUnique: jest.fn(),
    delete: jest.fn(),
  };

  const mockedMessage = {
    deleteMany: jest.fn(),
  };

  const mockedUsageRecord = {
    deleteMany: jest.fn(),
  };

  const mockedSectionFeedback = {
    deleteMany: jest.fn(),
  };

  const mockedFailedUsageCharge = {
    deleteMany: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      section: mockedSection,
      conversation: mockedConversation,
      message: mockedMessage,
      usageRecord: mockedUsageRecord,
      sectionFeedback: mockedSectionFeedback,
      failedUsageCharge: mockedFailedUsageCharge,
      $transaction: jest.fn((callback) => {
        // Create a mock transaction context with all models
        return callback({
          section: mockedSection,
          conversation: mockedConversation,
          message: mockedMessage,
          usageRecord: mockedUsageRecord,
          sectionFeedback: mockedSectionFeedback,
          failedUsageCharge: mockedFailedUsageCharge,
        });
      }),
    },
  };
});
```

### Update Prisma Mock Types

**Location**: Lines 29-36 (update type definitions)

**Add**:
```typescript
type MockedTransaction = typeof mockedConversation & {
  section: typeof mockedPrismaSection;
  conversation: MockedFunction<typeof prisma.conversation.findUnique>;
  message: MockedFunction<typeof prisma.message.deleteMany>;
  usageRecord: MockedFunction<typeof prisma.usageRecord.deleteMany>;
  sectionFeedback: MockedFunction<typeof prisma.sectionFeedback.deleteMany>;
  failedUsageCharge: MockedFunction<typeof prisma.failedUsageCharge.deleteMany>;
};

// Add to existing type definitions
const mockedPrisma = prisma as any & {
  $transaction: MockedFunction<
    (callback: (tx: any) => Promise<void>) => Promise<void>
  >;
};
```

### Update Delete Tests

**Location**: Lines 730-750 (enhance existing delete tests)

**Add new tests after the existing "should return false if section not found" test**:

```typescript
  describe('delete cascade behavior', () => {
    it('should execute cascade deletes within transaction', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);

      // Mock successful cascade deletion
      const mockConversation = {
        id: 'conv-123',
        sectionId: 'section-123',
        shop: 'myshop.myshopify.com',
      };

      const txCallback = jest.fn(async (tx) => {
        // Simulate what happens in transaction
        await tx.conversation.findUnique();
        await tx.message.deleteMany();
        await tx.conversation.delete();
        await tx.usageRecord.deleteMany();
        await tx.sectionFeedback.deleteMany();
        await tx.failedUsageCharge.deleteMany();
        await tx.section.delete();
      });

      const mockTx = {
        conversation: { findUnique: jest.fn().mockResolvedValueOnce(mockConversation) },
        message: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 5 }) },
        usageRecord: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 2 }) },
        sectionFeedback: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 1 }) },
        failedUsageCharge: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 0 }) },
        section: { delete: jest.fn().mockResolvedValueOnce(mockSection) },
      };

      (mockedPrisma.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await sectionService.delete('section-123', 'myshop.myshopify.com');

      expect(result).toBe(true);
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.conversation.findUnique).toHaveBeenCalled();
      expect(mockTx.message.deleteMany).toHaveBeenCalled();
      expect(mockTx.usageRecord.deleteMany).toHaveBeenCalled();
      expect(mockTx.sectionFeedback.deleteMany).toHaveBeenCalled();
      expect(mockTx.failedUsageCharge.deleteMany).toHaveBeenCalled();
    });

    it('should handle transaction failure gracefully', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);

      const error = new Error('Transaction failed');
      (mockedPrisma.$transaction as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        sectionService.delete('section-123', 'myshop.myshopify.com')
      ).rejects.toThrow('Transaction failed');
    });

    it('should delete conversation and messages when present', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);

      const mockConversation = { id: 'conv-123', sectionId: 'section-123' };
      const mockTx = {
        conversation: { findUnique: jest.fn().mockResolvedValueOnce(mockConversation) },
        message: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 3 }) },
        usageRecord: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 0 }) },
        sectionFeedback: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 0 }) },
        failedUsageCharge: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 0 }) },
        section: { delete: jest.fn().mockResolvedValueOnce(mockSection) },
        conversation: { delete: jest.fn().mockResolvedValueOnce(mockConversation) },
      };

      (mockedPrisma.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      await sectionService.delete('section-123', 'myshop.myshopify.com');

      expect(mockTx.message.deleteMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-123' },
      });
      expect(mockTx.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
      });
    });

    it('should continue when conversation does not exist', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);

      const mockTx = {
        conversation: { findUnique: jest.fn().mockResolvedValueOnce(null) },
        message: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 0 }) },
        usageRecord: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 0 }) },
        sectionFeedback: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 0 }) },
        failedUsageCharge: { deleteMany: jest.fn().mockResolvedValueOnce({ count: 0 }) },
        section: { delete: jest.fn().mockResolvedValueOnce(mockSection) },
      };

      (mockedPrisma.$transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockTx)
      );

      const result = await sectionService.delete('section-123', 'myshop.myshopify.com');

      expect(result).toBe(true);
      // Should skip conversation.delete() if conversation is null
      expect(mockTx.usageRecord.deleteMany).toHaveBeenCalled();
    });
  });
```

---

## Testing Checklist

After applying the fix:

- [ ] Update jest mock configuration (lines 10-36)
- [ ] Add new cascade behavior tests (before closing brace of delete describe block)
- [ ] Run `npm test app/services/__tests__/section.server.test.ts` to verify fixes
- [ ] Verify ALL tests in section.server.test.ts pass (currently 26, should still be 26+)
- [ ] Run full test suite: `npm test`
- [ ] Verify no regressions in other test files

## Expected Outcome

**Before Fix**:
```
FAIL app/services/__tests__/section.server.test.ts
Tests: 1 failed, 824 passed
```

**After Fix**:
```
PASS app/services/__tests__/section.server.test.ts
Tests: 0 failed, 829 passed (added ~5 new tests)
```

---

## Implementation Quality Notes

✅ **What's Good**:
- Cascade delete order is correct (Messages → Conversation → Supporting Records → Section)
- Transaction usage ensures atomicity
- Error handling with logging
- Shop isolation preserved
- GenerationLog orphaning policy is intentional and correct
- Code documentation is clear

⚠️ **Recommendations**:
- Add JSDoc comment to delete method explaining cascade scope
- Consider adding comment about GenerationLog orphaning to code
- Add test documentation explaining mock transaction behavior
- Consider performance testing for large cascade deletes (>100 related records)

---

## File Paths

**Files to Modify**:
- `/home/lmtnolimit/Projects/blocksmith/app/services/__tests__/section.server.test.ts`

**Files to Review**:
- `/home/lmtnolimit/Projects/blocksmith/app/services/section.server.ts` (implementation - NO CHANGES NEEDED)
- `/home/lmtnolimit/Projects/blocksmith/prisma/schema.prisma` (schema reference only)
