// @jest-environment node
import type { Section } from '@prisma/client';

// Type alias for convenience
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedFunction<T extends (...args: any[]) => any> = jest.Mock<ReturnType<T>, Parameters<T>>;

// Mock Prisma BEFORE importing sectionService
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
      deleteMany: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    message: {
      deleteMany: jest.fn(),
    },
    usageRecord: {
      deleteMany: jest.fn(),
    },
    sectionFeedback: {
      deleteMany: jest.fn(),
    },
    failedUsageCharge: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Now import after mocking
import { sectionService } from '../section.server';
import { SECTION_STATUS } from '../../types/section-status';
import prisma from '../../db.server';

const mockedPrismaSection = prisma.section as {
  create: MockedFunction<typeof prisma.section.create>;
  update: MockedFunction<typeof prisma.section.update>;
  findFirst: MockedFunction<typeof prisma.section.findFirst>;
  findMany: MockedFunction<typeof prisma.section.findMany>;
  count: MockedFunction<typeof prisma.section.count>;
  delete: MockedFunction<typeof prisma.section.delete>;
};

describe('SectionService', () => {
  // ============================================================================
  // Helper: Create mock section object
  // ============================================================================
  const createMockSection = (overrides: Partial<Section> = {}): Section => ({
    id: 'section-123',
    shop: 'myshop.myshopify.com',
    name: 'Test Section',
    prompt: 'Create a hero banner',
    code: '{% schema %}\n{"name": "Hero Banner"}\n{% endschema %}',
    tone: 'professional',
    style: 'modern',
    status: SECTION_STATUS.DRAFT,
    themeId: null,
    themeName: null,
    fileName: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CREATE Tests
  // ============================================================================
  describe('create', () => {
    it('should create a new section with DRAFT status', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.create.mockResolvedValueOnce(mockSection);

      const result = await sectionService.create({
        shop: 'myshop.myshopify.com',
        prompt: 'Create a hero banner',
        code: '{% schema %}\n{"name": "Hero Banner"}\n{% endschema %}',
      });

      expect(result.status).toBe(SECTION_STATUS.DRAFT);
      expect(mockedPrismaSection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shop: 'myshop.myshopify.com',
          status: SECTION_STATUS.DRAFT,
        }),
      });
    });

    it('should always set status to DRAFT regardless of input', async () => {
      const mockSection = createMockSection({ status: SECTION_STATUS.DRAFT });
      mockedPrismaSection.create.mockResolvedValueOnce(mockSection);

      await sectionService.create({
        shop: 'myshop.myshopify.com',
        prompt: 'Test',
        code: '{% schema %}\n{"name": "Test"}\n{% endschema %}',
      });

      const callData = mockedPrismaSection.create.mock.calls[0]?.[0]?.data;
      expect(callData?.status).toBe(SECTION_STATUS.DRAFT);
    });

    it('should extract name from schema JSON if not provided', async () => {
      const code = '{% schema %}\n{"name": "Extracted Name"}\n{% endschema %}';
      const mockSection = createMockSection({ name: 'Extracted Name' });
      mockedPrismaSection.create.mockResolvedValueOnce(mockSection);

      await sectionService.create({
        shop: 'myshop.myshopify.com',
        prompt: 'Create something',
        code,
      });

      const callData = mockedPrismaSection.create.mock.calls[0]?.[0]?.data;
      expect(callData?.name).toBe('Extracted Name');
    });

    it('should use provided name over schema name', async () => {
      const code = '{% schema %}\n{"name": "Schema Name"}\n{% endschema %}';
      const mockSection = createMockSection({ name: 'User Name' });
      mockedPrismaSection.create.mockResolvedValueOnce(mockSection);

      await sectionService.create({
        shop: 'myshop.myshopify.com',
        prompt: 'Create something',
        code,
        name: 'User Name',
      });

      const callData = mockedPrismaSection.create.mock.calls[0]?.[0]?.data;
      expect(callData?.name).toBe('User Name');
    });

    it('should generate name from prompt if schema extraction fails', async () => {
      const code = 'Invalid schema';
      const mockSection = createMockSection({ name: 'Create a hero banner...' });
      mockedPrismaSection.create.mockResolvedValueOnce(mockSection);

      await sectionService.create({
        shop: 'myshop.myshopify.com',
        prompt: 'Create a hero banner with image and text overlay',
        code,
      });

      const callData = mockedPrismaSection.create.mock.calls[0]?.[0]?.data;
      // Should truncate prompt at word boundary
      expect(callData?.name).toBeTruthy();
      expect(typeof callData?.name).toBe('string');
    });

    it('should preserve optional fields', async () => {
      const mockSection = createMockSection({
        tone: 'casual',
        style: 'minimalist',
        themeId: 'theme-456',
        themeName: 'Dawn',
        fileName: 'sections/hero.liquid',
      });
      mockedPrismaSection.create.mockResolvedValueOnce(mockSection);

      await sectionService.create({
        shop: 'myshop.myshopify.com',
        prompt: 'Create',
        code: '{}',
        tone: 'casual',
        style: 'minimalist',
        themeId: 'theme-456',
        themeName: 'Dawn',
        fileName: 'sections/hero.liquid',
      });

      const callData = mockedPrismaSection.create.mock.calls[0]?.[0]?.data;
      expect(callData?.tone).toBe('casual');
      expect(callData?.style).toBe('minimalist');
      expect(callData?.themeId).toBe('theme-456');
    });
  });

  // ============================================================================
  // UPDATE Tests (with transition validation)
  // ============================================================================
  describe('update', () => {
    it('should update section without status change', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.DRAFT });
      const updated = createMockSection({ name: 'Updated Name', status: SECTION_STATUS.DRAFT });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(updated);

      const result = await sectionService.update('section-123', 'myshop.myshopify.com', {
        name: 'Updated Name',
      });

      expect(result?.name).toBe('Updated Name');
    });

    it('should allow DRAFT -> ACTIVE transition', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.DRAFT });
      const updated = createMockSection({ status: SECTION_STATUS.ACTIVE });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(updated);

      const result = await sectionService.update('section-123', 'myshop.myshopify.com', {
        status: SECTION_STATUS.ACTIVE,
      });

      expect(result?.status).toBe(SECTION_STATUS.ACTIVE);
      expect(mockedPrismaSection.update).toHaveBeenCalled();
    });

    it('should allow ACTIVE -> DRAFT transition', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.ACTIVE });
      const updated = createMockSection({ status: SECTION_STATUS.DRAFT });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(updated);

      const result = await sectionService.update('section-123', 'myshop.myshopify.com', {
        status: SECTION_STATUS.DRAFT,
      });

      expect(result?.status).toBe(SECTION_STATUS.DRAFT);
    });

    it('should reject invalid status transition', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.INACTIVE });
      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);

      await expect(
        sectionService.update('section-123', 'myshop.myshopify.com', {
          status: SECTION_STATUS.ACTIVE,
        })
      ).rejects.toThrow(/Cannot transition/);
    });

    it('should return null if section not found', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionService.update('section-999', 'myshop.myshopify.com', {
        name: 'Updated',
      });

      expect(result).toBeNull();
      expect(mockedPrismaSection.update).not.toHaveBeenCalled();
    });

    it('should allow same status (no-op)', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.DRAFT });
      const updated = createMockSection({ status: SECTION_STATUS.DRAFT });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(updated);

      const result = await sectionService.update('section-123', 'myshop.myshopify.com', {
        status: SECTION_STATUS.DRAFT,
      });

      expect(result?.status).toBe(SECTION_STATUS.DRAFT);
      expect(mockedPrismaSection.update).toHaveBeenCalled();
    });

    it('should allow valid transition from active to draft', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.ACTIVE });
      const updated = createMockSection({ status: SECTION_STATUS.DRAFT });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(updated);

      const result = await sectionService.update('section-123', 'myshop.myshopify.com', {
        status: SECTION_STATUS.DRAFT,
      });

      expect(result?.status).toBe(SECTION_STATUS.DRAFT);
    });
  });

  // ============================================================================
  // ARCHIVE Tests
  // ============================================================================
  describe('archive', () => {
    it('should set status to ARCHIVE', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.DRAFT });
      const archived = createMockSection({ status: SECTION_STATUS.ARCHIVE });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(archived);

      const result = await sectionService.archive('section-123', 'myshop.myshopify.com');

      expect(result?.status).toBe(SECTION_STATUS.ARCHIVE);
      expect(mockedPrismaSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SECTION_STATUS.ARCHIVE }),
        })
      );
    });

    it('should archive from ACTIVE status', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.ACTIVE });
      const archived = createMockSection({ status: SECTION_STATUS.ARCHIVE });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(archived);

      const result = await sectionService.archive('section-123', 'myshop.myshopify.com');

      expect(result?.status).toBe(SECTION_STATUS.ARCHIVE);
    });

    it('should return null if section not found', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionService.archive('section-999', 'myshop.myshopify.com');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // RESTORE Tests
  // ============================================================================
  describe('restore', () => {
    it('should restore ARCHIVE section to DRAFT', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.ARCHIVE });
      const restored = createMockSection({ status: SECTION_STATUS.DRAFT });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(restored);

      const result = await sectionService.restore('section-123', 'myshop.myshopify.com');

      expect(result?.status).toBe(SECTION_STATUS.DRAFT);
    });

    it('should restore INACTIVE section to DRAFT', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.INACTIVE });
      const restored = createMockSection({ status: SECTION_STATUS.DRAFT });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(restored);

      const result = await sectionService.restore('section-123', 'myshop.myshopify.com');

      expect(result?.status).toBe(SECTION_STATUS.DRAFT);
    });

    it('should throw error if section is not ARCHIVE or INACTIVE', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.DRAFT });
      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);

      await expect(
        sectionService.restore('section-123', 'myshop.myshopify.com')
      ).rejects.toThrow(/Cannot restore: section is not archived or inactive/);
    });

    it('should return null if section not found', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionService.restore('section-999', 'myshop.myshopify.com');

      expect(result).toBeNull();
    });

    it('should throw error when trying to restore ACTIVE section', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.ACTIVE });
      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);

      await expect(
        sectionService.restore('section-123', 'myshop.myshopify.com')
      ).rejects.toThrow(/Cannot restore: section is not archived or inactive/);
    });
  });

  // ============================================================================
  // PUBLISH Tests
  // ============================================================================
  describe('publish', () => {
    it('should set status to ACTIVE and update theme data', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.DRAFT });
      const published = createMockSection({
        status: SECTION_STATUS.ACTIVE,
        themeId: 'theme-456',
        themeName: 'Dawn',
        fileName: 'sections/hero.liquid',
      });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(published);

      const result = await sectionService.publish('section-123', 'myshop.myshopify.com', {
        themeId: 'theme-456',
        themeName: 'Dawn',
        fileName: 'sections/hero.liquid',
      });

      expect(result?.status).toBe(SECTION_STATUS.ACTIVE);
      expect(result?.themeId).toBe('theme-456');
      expect(result?.themeName).toBe('Dawn');
      expect(result?.fileName).toBe('sections/hero.liquid');
    });

    it('should work on DRAFT sections', async () => {
      const existing = createMockSection({ status: SECTION_STATUS.DRAFT });
      const published = createMockSection({ status: SECTION_STATUS.ACTIVE });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(published);

      const result = await sectionService.publish('section-123', 'myshop.myshopify.com', {
        themeId: 'theme-123',
        themeName: 'Dawn',
        fileName: 'sections/hero.liquid',
      });

      expect(result?.status).toBe(SECTION_STATUS.ACTIVE);
    });

    it('should return null if section not found', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionService.publish('section-999', 'myshop.myshopify.com', {
        themeId: 'theme-123',
        themeName: 'Dawn',
        fileName: 'sections/hero.liquid',
      });

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // UNPUBLISH Tests
  // ============================================================================
  describe('unpublish', () => {
    it('should set status to DRAFT and clear theme data', async () => {
      const existing = createMockSection({
        status: SECTION_STATUS.ACTIVE,
        themeId: 'theme-456',
        themeName: 'Dawn',
        fileName: 'sections/hero.liquid',
      });
      const unpublished = createMockSection({
        status: SECTION_STATUS.DRAFT,
        themeId: null,
        themeName: null,
        fileName: null,
      });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(unpublished);

      const result = await sectionService.unpublish('section-123', 'myshop.myshopify.com');

      expect(result?.status).toBe(SECTION_STATUS.DRAFT);
      expect(result?.themeId).toBeNull();
      expect(result?.themeName).toBeNull();
      expect(result?.fileName).toBeNull();
    });

    it('should clear theme data even from published sections', async () => {
      const existing = createMockSection({
        status: SECTION_STATUS.ACTIVE,
        themeId: 'theme-456',
      });
      const unpublished = createMockSection({
        status: SECTION_STATUS.DRAFT,
        themeId: null,
      });

      mockedPrismaSection.findFirst.mockResolvedValueOnce(existing);
      mockedPrismaSection.update.mockResolvedValueOnce(unpublished);

      const result = await sectionService.unpublish('section-123', 'myshop.myshopify.com');

      expect(result).toBeDefined();
      expect(result?.status).toBe(SECTION_STATUS.DRAFT);
      expect(mockedPrismaSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SECTION_STATUS.DRAFT,
            themeId: undefined,
            themeName: undefined,
            fileName: undefined,
          }),
        })
      );
    });

    it('should return null if section not found', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionService.unpublish('section-999', 'myshop.myshopify.com');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // GET_BY_SHOP Tests
  // ============================================================================
  describe('getByShop', () => {
    it('should return paginated sections excluding ARCHIVE by default', async () => {
      const sections = [
        createMockSection({ status: SECTION_STATUS.DRAFT }),
        createMockSection({ status: SECTION_STATUS.ACTIVE }),
      ];

      mockedPrismaSection.findMany.mockResolvedValueOnce(sections);
      mockedPrismaSection.count.mockResolvedValueOnce(2);

      const result = await sectionService.getByShop('myshop.myshopify.com');

      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should exclude ARCHIVE status by default', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      await sectionService.getByShop('myshop.myshopify.com');

      const whereClause = mockedPrismaSection.findMany.mock.calls[0]?.[0]?.where;
      expect(whereClause?.status?.not).toBe(SECTION_STATUS.ARCHIVE);
    });

    it('should include INACTIVE when includeInactive=true', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      await sectionService.getByShop('myshop.myshopify.com', { includeInactive: true });

      const whereClause = mockedPrismaSection.findMany.mock.calls[0]?.[0]?.where;
      // When includeInactive is true, status filter should not be set
      expect(whereClause?.status).toBeUndefined();
    });

    it('should filter by status when provided', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      await sectionService.getByShop('myshop.myshopify.com', { status: SECTION_STATUS.DRAFT });

      const whereClause = mockedPrismaSection.findMany.mock.calls[0]?.[0]?.where;
      expect(whereClause?.status).toBe(SECTION_STATUS.DRAFT);
    });

    it('should search by prompt and name', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      await sectionService.getByShop('myshop.myshopify.com', { search: 'hero' });

      const whereClause = mockedPrismaSection.findMany.mock.calls[0]?.[0]?.where;
      expect(whereClause?.OR).toEqual([
        { prompt: { contains: 'hero', mode: 'insensitive' } },
        { name: { contains: 'hero', mode: 'insensitive' } },
      ]);
    });

    it('should sort by newest by default', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      await sectionService.getByShop('myshop.myshopify.com');

      const orderBy = mockedPrismaSection.findMany.mock.calls[0]?.[0]?.orderBy;
      expect(orderBy?.createdAt).toBe('desc');
    });

    it('should sort by oldest when sort=oldest', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      await sectionService.getByShop('myshop.myshopify.com', { sort: 'oldest' });

      const orderBy = mockedPrismaSection.findMany.mock.calls[0]?.[0]?.orderBy;
      expect(orderBy?.createdAt).toBe('asc');
    });

    it('should handle pagination', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);
      mockedPrismaSection.count.mockResolvedValueOnce(100);

      await sectionService.getByShop('myshop.myshopify.com', { page: 2, limit: 10 });

      const findManyCall = mockedPrismaSection.findMany.mock.calls[0]?.[0];
      expect(findManyCall?.skip).toBe(10); // (2-1) * 10
      expect(findManyCall?.take).toBe(10);
    });

    it('should calculate totalPages correctly', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);
      mockedPrismaSection.count.mockResolvedValueOnce(100);

      const result = await sectionService.getByShop('myshop.myshopify.com', { limit: 20 });

      expect(result.totalPages).toBe(5); // 100/20 = 5
    });
  });

  // ============================================================================
  // GET_BY_ID Tests
  // ============================================================================
  describe('getById', () => {
    it('should return section by id and shop', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);

      const result = await sectionService.getById('section-123', 'myshop.myshopify.com');

      expect(result?.id).toBe('section-123');
      expect(mockedPrismaSection.findFirst).toHaveBeenCalledWith({
        where: { id: 'section-123', shop: 'myshop.myshopify.com' },
      });
    });

    it('should return null if not found', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionService.getById('section-999', 'myshop.myshopify.com');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // GET_MOST_RECENT Tests
  // ============================================================================
  describe('getMostRecent', () => {
    it('should return most recent non-inactive section', async () => {
      const mockSection = createMockSection({ createdAt: new Date() });
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);

      const result = await sectionService.getMostRecent('myshop.myshopify.com');

      expect(result?.id).toBe('section-123');
    });

    it('should exclude INACTIVE and ARCHIVE sections', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      await sectionService.getMostRecent('myshop.myshopify.com');

      const whereClause = mockedPrismaSection.findFirst.mock.calls[0]?.[0]?.where;
      expect(whereClause?.status?.notIn).toEqual([SECTION_STATUS.INACTIVE, SECTION_STATUS.ARCHIVE]);
    });

    it('should order by createdAt descending', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      await sectionService.getMostRecent('myshop.myshopify.com');

      const orderBy = mockedPrismaSection.findFirst.mock.calls[0]?.[0]?.orderBy;
      expect(orderBy?.createdAt).toBe('desc');
    });

    it('should return null if no sections found', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionService.getMostRecent('myshop.myshopify.com');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // GET_TOTAL_COUNT Tests
  // ============================================================================
  describe('getTotalCount', () => {
    it('should return count of non-archived sections', async () => {
      mockedPrismaSection.count.mockResolvedValueOnce(5);

      const result = await sectionService.getTotalCount('myshop.myshopify.com');

      expect(result).toBe(5);
    });

    it('should exclude ARCHIVE sections', async () => {
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      await sectionService.getTotalCount('myshop.myshopify.com');

      const whereClause = mockedPrismaSection.count.mock.calls[0]?.[0]?.where;
      expect(whereClause?.status?.not).toBe(SECTION_STATUS.ARCHIVE);
    });

    it('should return 0 if no sections', async () => {
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      const result = await sectionService.getTotalCount('myshop.myshopify.com');

      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // GET_ARCHIVED_COUNT Tests
  // ============================================================================
  describe('getArchivedCount', () => {
    it('should return count of ARCHIVE sections', async () => {
      mockedPrismaSection.count.mockResolvedValueOnce(3);

      const result = await sectionService.getArchivedCount('myshop.myshopify.com');

      expect(result).toBe(3);
    });

    it('should only count ARCHIVE status', async () => {
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      await sectionService.getArchivedCount('myshop.myshopify.com');

      const whereClause = mockedPrismaSection.count.mock.calls[0]?.[0]?.where;
      expect(whereClause?.status).toBe(SECTION_STATUS.ARCHIVE);
    });

    it('should return 0 if no archived sections', async () => {
      mockedPrismaSection.count.mockResolvedValueOnce(0);

      const result = await sectionService.getArchivedCount('myshop.myshopify.com');

      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // DELETE Tests (Cascade Delete)
  // ============================================================================
  describe('delete', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockedTransaction = prisma.$transaction as jest.Mock<any>;

    beforeEach(() => {
      // Setup $transaction to execute the callback with mocked tx
      mockedTransaction.mockImplementation(async (callback) => {
        const tx = {
          conversation: { findUnique: jest.fn(), delete: jest.fn() },
          message: { deleteMany: jest.fn() },
          usageRecord: { deleteMany: jest.fn() },
          sectionFeedback: { deleteMany: jest.fn() },
          failedUsageCharge: { deleteMany: jest.fn() },
          section: { delete: jest.fn() },
        };
        return callback(tx);
      });
    });

    it('should cascade delete section and all related records', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);

      // Setup transaction mock to track calls
      const txMocks = {
        conversation: { findUnique: jest.fn().mockResolvedValue({ id: 'conv-123', sectionId: 'section-123' }), delete: jest.fn() },
        message: { deleteMany: jest.fn() },
        usageRecord: { deleteMany: jest.fn() },
        sectionFeedback: { deleteMany: jest.fn() },
        failedUsageCharge: { deleteMany: jest.fn() },
        section: { delete: jest.fn() },
      };
      mockedTransaction.mockImplementationOnce(async (callback) => callback(txMocks));

      const result = await sectionService.delete('section-123', 'myshop.myshopify.com');

      expect(result).toBe(true);
      expect(mockedTransaction).toHaveBeenCalled();
      expect(txMocks.conversation.findUnique).toHaveBeenCalledWith({ where: { sectionId: 'section-123' } });
      expect(txMocks.message.deleteMany).toHaveBeenCalledWith({ where: { conversationId: 'conv-123' } });
      expect(txMocks.conversation.delete).toHaveBeenCalledWith({ where: { id: 'conv-123' } });
      expect(txMocks.usageRecord.deleteMany).toHaveBeenCalledWith({ where: { sectionId: 'section-123' } });
      expect(txMocks.sectionFeedback.deleteMany).toHaveBeenCalledWith({ where: { sectionId: 'section-123' } });
      expect(txMocks.failedUsageCharge.deleteMany).toHaveBeenCalledWith({ where: { sectionId: 'section-123' } });
      expect(txMocks.section.delete).toHaveBeenCalledWith({ where: { id: 'section-123' } });
    });

    it('should skip conversation/message deletion if no conversation exists', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);

      const txMocks = {
        conversation: { findUnique: jest.fn().mockResolvedValue(null), delete: jest.fn() },
        message: { deleteMany: jest.fn() },
        usageRecord: { deleteMany: jest.fn() },
        sectionFeedback: { deleteMany: jest.fn() },
        failedUsageCharge: { deleteMany: jest.fn() },
        section: { delete: jest.fn() },
      };
      mockedTransaction.mockImplementationOnce(async (callback) => callback(txMocks));

      const result = await sectionService.delete('section-123', 'myshop.myshopify.com');

      expect(result).toBe(true);
      expect(txMocks.conversation.findUnique).toHaveBeenCalled();
      expect(txMocks.message.deleteMany).not.toHaveBeenCalled();
      expect(txMocks.conversation.delete).not.toHaveBeenCalled();
      // Other deletes should still happen
      expect(txMocks.usageRecord.deleteMany).toHaveBeenCalled();
      expect(txMocks.sectionFeedback.deleteMany).toHaveBeenCalled();
      expect(txMocks.failedUsageCharge.deleteMany).toHaveBeenCalled();
      expect(txMocks.section.delete).toHaveBeenCalled();
    });

    it('should return false if section not found', async () => {
      mockedPrismaSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionService.delete('section-999', 'myshop.myshopify.com');

      expect(result).toBe(false);
      expect(mockedTransaction).not.toHaveBeenCalled();
    });

    it('should throw error if transaction fails', async () => {
      const mockSection = createMockSection();
      mockedPrismaSection.findFirst.mockResolvedValueOnce(mockSection);
      mockedTransaction.mockRejectedValueOnce(new Error('Transaction failed'));

      await expect(
        sectionService.delete('section-123', 'myshop.myshopify.com')
      ).rejects.toThrow('Transaction failed');
    });
  });

  // ============================================================================
  // BULK DELETE Tests (Transactional)
  // ============================================================================
  describe('bulkDelete', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockedTransaction = prisma.$transaction as jest.Mock<any>;

    it('should bulk delete multiple sections in single transaction', async () => {
      // Setup: find valid sections
      mockedPrismaSection.findMany.mockResolvedValueOnce([
        { id: 'section-1' },
        { id: 'section-2' },
        { id: 'section-3' },
      ]);

      // Setup transaction mock
      const txMocks = {
        conversation: { findMany: jest.fn().mockResolvedValue([{ id: 'conv-1' }, { id: 'conv-2' }]), deleteMany: jest.fn() },
        message: { deleteMany: jest.fn() },
        usageRecord: { deleteMany: jest.fn() },
        sectionFeedback: { deleteMany: jest.fn() },
        failedUsageCharge: { deleteMany: jest.fn() },
        section: { deleteMany: jest.fn() },
      };
      mockedTransaction.mockImplementationOnce(async (callback) => callback(txMocks));

      const result = await sectionService.bulkDelete(
        ['section-1', 'section-2', 'section-3'],
        'myshop.myshopify.com'
      );

      expect(result).toBe(3);
      expect(mockedTransaction).toHaveBeenCalled();
      expect(txMocks.conversation.findMany).toHaveBeenCalledWith({
        where: { sectionId: { in: ['section-1', 'section-2', 'section-3'] } },
        select: { id: true },
      });
      expect(txMocks.message.deleteMany).toHaveBeenCalledWith({
        where: { conversationId: { in: ['conv-1', 'conv-2'] } },
      });
      expect(txMocks.conversation.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['conv-1', 'conv-2'] } },
      });
      expect(txMocks.usageRecord.deleteMany).toHaveBeenCalledWith({
        where: { sectionId: { in: ['section-1', 'section-2', 'section-3'] } },
      });
      expect(txMocks.sectionFeedback.deleteMany).toHaveBeenCalledWith({
        where: { sectionId: { in: ['section-1', 'section-2', 'section-3'] } },
      });
      expect(txMocks.failedUsageCharge.deleteMany).toHaveBeenCalledWith({
        where: { sectionId: { in: ['section-1', 'section-2', 'section-3'] } },
      });
      expect(txMocks.section.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['section-1', 'section-2', 'section-3'] } },
      });
    });

    it('should only delete sections belonging to the shop', async () => {
      // Only 2 of 3 IDs belong to this shop
      mockedPrismaSection.findMany.mockResolvedValueOnce([
        { id: 'section-1' },
        { id: 'section-2' },
      ]);

      const txMocks = {
        conversation: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
        message: { deleteMany: jest.fn() },
        usageRecord: { deleteMany: jest.fn() },
        sectionFeedback: { deleteMany: jest.fn() },
        failedUsageCharge: { deleteMany: jest.fn() },
        section: { deleteMany: jest.fn() },
      };
      mockedTransaction.mockImplementationOnce(async (callback) => callback(txMocks));

      const result = await sectionService.bulkDelete(
        ['section-1', 'section-2', 'section-3'],
        'myshop.myshopify.com'
      );

      // Only 2 valid sections deleted
      expect(result).toBe(2);
      expect(txMocks.section.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['section-1', 'section-2'] } },
      });
    });

    it('should return 0 if no sections belong to the shop', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([]);

      const result = await sectionService.bulkDelete(
        ['section-1', 'section-2'],
        'myshop.myshopify.com'
      );

      expect(result).toBe(0);
      expect(mockedTransaction).not.toHaveBeenCalled();
    });

    it('should skip conversation/message deletion if no conversations exist', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([{ id: 'section-1' }]);

      const txMocks = {
        conversation: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
        message: { deleteMany: jest.fn() },
        usageRecord: { deleteMany: jest.fn() },
        sectionFeedback: { deleteMany: jest.fn() },
        failedUsageCharge: { deleteMany: jest.fn() },
        section: { deleteMany: jest.fn() },
      };
      mockedTransaction.mockImplementationOnce(async (callback) => callback(txMocks));

      await sectionService.bulkDelete(['section-1'], 'myshop.myshopify.com');

      expect(txMocks.conversation.findMany).toHaveBeenCalled();
      expect(txMocks.message.deleteMany).not.toHaveBeenCalled();
      expect(txMocks.conversation.deleteMany).not.toHaveBeenCalled();
      // Other deletes should still happen
      expect(txMocks.usageRecord.deleteMany).toHaveBeenCalled();
      expect(txMocks.section.deleteMany).toHaveBeenCalled();
    });

    it('should throw error and rollback if transaction fails', async () => {
      mockedPrismaSection.findMany.mockResolvedValueOnce([{ id: 'section-1' }]);
      mockedTransaction.mockRejectedValueOnce(new Error('Transaction failed'));

      await expect(
        sectionService.bulkDelete(['section-1'], 'myshop.myshopify.com')
      ).rejects.toThrow('Transaction failed');
    });

    it('should handle empty ids array', async () => {
      const result = await sectionService.bulkDelete([], 'myshop.myshopify.com');

      expect(result).toBe(0);
      expect(mockedTransaction).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Integration Workflow Tests
  // ============================================================================
  describe('Complete workflows', () => {
    it('should support create -> publish -> unpublish -> archive -> restore workflow', async () => {
      // Create
      const created = createMockSection({ status: SECTION_STATUS.DRAFT });
      mockedPrismaSection.create.mockResolvedValueOnce(created);
      const createResult = await sectionService.create({
        shop: 'myshop.myshopify.com',
        prompt: 'Create',
        code: '{}',
      });
      expect(createResult.status).toBe(SECTION_STATUS.DRAFT);

      // Publish
      mockedPrismaSection.findFirst.mockResolvedValueOnce(created);
      const published = createMockSection({ status: SECTION_STATUS.ACTIVE });
      mockedPrismaSection.update.mockResolvedValueOnce(published);
      const publishResult = await sectionService.publish('section-123', 'myshop.myshopify.com', {
        themeId: 'theme-123',
        themeName: 'Dawn',
        fileName: 'sections/hero.liquid',
      });
      expect(publishResult?.status).toBe(SECTION_STATUS.ACTIVE);

      // Unpublish
      mockedPrismaSection.findFirst.mockResolvedValueOnce(published);
      const unpublished = createMockSection({ status: SECTION_STATUS.DRAFT, themeId: null });
      mockedPrismaSection.update.mockResolvedValueOnce(unpublished);
      const unpublishResult = await sectionService.unpublish('section-123', 'myshop.myshopify.com');
      expect(unpublishResult?.status).toBe(SECTION_STATUS.DRAFT);

      // Archive
      mockedPrismaSection.findFirst.mockResolvedValueOnce(unpublished);
      const archived = createMockSection({ status: SECTION_STATUS.INACTIVE });
      mockedPrismaSection.update.mockResolvedValueOnce(archived);
      const archiveResult = await sectionService.archive('section-123', 'myshop.myshopify.com');
      expect(archiveResult?.status).toBe(SECTION_STATUS.INACTIVE);

      // Restore
      mockedPrismaSection.findFirst.mockResolvedValueOnce(archived);
      const restored = createMockSection({ status: SECTION_STATUS.DRAFT });
      mockedPrismaSection.update.mockResolvedValueOnce(restored);
      const restoreResult = await sectionService.restore('section-123', 'myshop.myshopify.com');
      expect(restoreResult?.status).toBe(SECTION_STATUS.DRAFT);
    });
  });
});
