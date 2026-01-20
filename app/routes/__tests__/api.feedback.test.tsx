/**
 * Tests for /api/feedback route
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { action } from '../api.feedback';
import prisma from '../../db.server';
import * as shopifyAuth from '../../shopify.server';

// Mock dependencies
jest.mock('../../db.server', () => ({
  sectionFeedback: {
    create: jest.fn(),
  },
  section: {
    findFirst: jest.fn(),
  },
}));

jest.mock('../../shopify.server', () => ({
  authenticate: {
    admin: jest.fn(),
  },
}));

describe('api.feedback route', () => {
  const mockSession = {
    shop: 'test-shop.myshopify.com',
  };

  let mockRequest: any;
  let mockFormData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock FormData
    mockFormData = {
      get: jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: 'section-123',
          positive: 'true',
        };
        return data[key] || null;
      }),
    };

    // Setup mock request
    mockRequest = {
      formData: jest.fn().mockResolvedValue(mockFormData),
    };

    // Setup default auth mock
    (shopifyAuth.authenticate.admin as jest.Mock).mockResolvedValue({
      session: mockSession,
    });

    // Setup default prisma mocks
    (prisma.section.findFirst as jest.Mock).mockResolvedValue({
      id: 'section-123',
      shop: mockSession.shop,
    });

    (prisma.sectionFeedback.create as jest.Mock).mockResolvedValue({
      id: 'feedback-1',
      sectionId: 'section-123',
      positive: true,
    });
  });

  describe('request handling', () => {
    it('should require authentication', async () => {
      await action({ request: mockRequest } as any);

      expect(shopifyAuth.authenticate.admin).toHaveBeenCalledWith(mockRequest);
    });

    it('should parse form data', async () => {
      await action({ request: mockRequest } as any);

      expect(mockRequest.formData).toHaveBeenCalled();
    });

    it('should extract sectionId from form data', async () => {
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: 'test-section-id',
          positive: 'true',
        };
        return data[key] || null;
      });

      await action({ request: mockRequest } as any);

      expect(mockFormData.get).toHaveBeenCalledWith('sectionId');
    });

    it('should extract positive from form data', async () => {
      await action({ request: mockRequest } as any);

      expect(mockFormData.get).toHaveBeenCalledWith('positive');
    });
  });

  describe('validation', () => {
    it('should return 400 when sectionId is missing', async () => {
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: null,
          positive: 'true',
        };
        return data[key];
      });

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(400);
      expect((result as any).data).toHaveProperty('error', 'Section ID required');
    });

    it('should return 404 when section not found', async () => {
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(404);
      expect((result as any).data).toHaveProperty('error', 'Section not found');
    });

    it('should verify section belongs to shop', async () => {
      await action({ request: mockRequest } as any);

      expect(prisma.section.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shop: mockSession.shop,
          }),
        })
      );
    });
  });

  describe('feedback storage', () => {
    it('should create feedback record on success', async () => {
      await action({ request: mockRequest } as any);

      expect(prisma.sectionFeedback.create).toHaveBeenCalled();
    });

    it('should store positive feedback correctly', async () => {
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: 'section-123',
          positive: 'true',
        };
        return data[key];
      });

      await action({ request: mockRequest } as any);

      expect(prisma.sectionFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            positive: true,
          }),
        })
      );
    });

    it('should store negative feedback correctly', async () => {
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: 'section-123',
          positive: 'false',
        };
        return data[key];
      });

      await action({ request: mockRequest } as any);

      expect(prisma.sectionFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            positive: false,
          }),
        })
      );
    });

    it('should store sectionId', async () => {
      const testSectionId = 'test-section-123';
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: testSectionId,
          positive: 'true',
        };
        return data[key];
      });

      await action({ request: mockRequest } as any);

      expect(prisma.sectionFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sectionId: testSectionId,
          }),
        })
      );
    });

    it('should store shop information', async () => {
      await action({ request: mockRequest } as any);

      expect(prisma.sectionFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shop: mockSession.shop,
          }),
        })
      );
    });
  });

  describe('response handling', () => {
    it('should return response on valid feedback', async () => {
      const result = await action({ request: mockRequest } as any);

      expect(result).toBeTruthy();
    });

    it('should return error status on validation failure', async () => {
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: null,
          positive: 'true',
        };
        return data[key];
      });

      const result = await action({ request: mockRequest } as any);

      // data() returns an object with init.status
      expect(result).toHaveProperty('init');
      expect((result as any).init.status).toBe(400);
    });

    it('should return error status when section not found', async () => {
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(404);
    });

    it('should return success on database error', async () => {
      (prisma.sectionFeedback.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await action({ request: mockRequest } as any);

      expect(result).toBeTruthy();
      expect((result as any).data.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle section not found gracefully', async () => {
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(404);
    });

    it('should not crash on database errors', async () => {
      (prisma.sectionFeedback.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await action({ request: mockRequest } as any);

      expect(result).toBeTruthy();
      // Should return success for UX reasons
      expect((result as any).data.success).toBe(true);
    });

    it('should not crash on missing form fields', async () => {
      mockRequest.formData = jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue(null),
      });

      const result = await action({ request: mockRequest } as any);

      expect(result).toBeTruthy();
      expect((result as any).init.status).toBe(400);
    });
  });

  describe('security', () => {
    it('should verify ownership before storing feedback', async () => {
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await action({ request: mockRequest } as any);

      expect((result as any).init.status).toBe(404);
    });

    it('should only process authenticated requests', async () => {
      (shopifyAuth.authenticate.admin as jest.Mock).mockRejectedValue(
        new Error('Not authenticated')
      );

      await expect(action({ request: mockRequest } as any)).rejects.toThrow();
    });
  });

  describe('feedback data', () => {
    it('should handle positive feedback', async () => {
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: 'section-1',
          positive: 'true',
        };
        return data[key];
      });

      await action({ request: mockRequest } as any);

      const call = (prisma.sectionFeedback.create as jest.Mock).mock.calls[0];
      expect(call[0].data.positive).toBe(true);
    });

    it('should handle negative feedback', async () => {
      mockFormData.get = jest.fn((key) => {
        const data: Record<string, any> = {
          sectionId: 'section-1',
          positive: 'false',
        };
        return data[key];
      });

      await action({ request: mockRequest } as any);

      const call = (prisma.sectionFeedback.create as jest.Mock).mock.calls[0];
      expect(call[0].data.positive).toBe(false);
    });

    it('should handle various section IDs', async () => {
      const testIds = ['section-1', 'section-abc-123', 'test-section'];

      for (const testId of testIds) {
        jest.clearAllMocks();

        mockFormData.get = jest.fn((key) => {
          const data: Record<string, any> = {
            sectionId: testId,
            positive: 'true',
          };
          return data[key];
        });

        mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
        (shopifyAuth.authenticate.admin as jest.Mock).mockResolvedValue({
          session: mockSession,
        });
        (prisma.section.findFirst as jest.Mock).mockResolvedValue({
          id: testId,
          shop: mockSession.shop,
        });

        await action({ request: mockRequest } as any);

        expect(prisma.sectionFeedback.create).toHaveBeenCalled();
      }
    });
  });
});
