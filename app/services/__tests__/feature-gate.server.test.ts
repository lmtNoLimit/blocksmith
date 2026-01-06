// @jest-environment node
import type { Mock } from 'jest';
import type { Subscription, PlanConfiguration } from '@prisma/client';

// Type alias for convenience
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedFunction<T extends (...args: any[]) => any> = Mock<ReturnType<T>, Parameters<T>>;

// Mock Prisma BEFORE importing feature-gate service
jest.mock('../../db.server', () => ({
  __esModule: true,
  default: {
    subscription: {
      findFirst: jest.fn(),
    },
    planConfiguration: {
      findUnique: jest.fn(),
    },
    message: {
      count: jest.fn(),
    },
    trial: {
      findUnique: jest.fn(),
    },
  },
}));

// Now import after mocking
import {
  hasFeature,
  getRefinementLimit,
  getTeamSeatLimit,
  getConversationRefinementCount,
  checkFeatureAccess,
  checkRefinementAccess,
  getFeaturesSummary,
} from '../feature-gate.server';
import prisma from '../../db.server';

const mockedPrismaSubscription = prisma.subscription as {
  findFirst: MockedFunction<typeof prisma.subscription.findFirst>;
};

const mockedPrismaPlanConfig = prisma.planConfiguration as {
  findUnique: MockedFunction<typeof prisma.planConfiguration.findUnique>;
};

const mockedPrismaMessage = prisma.message as {
  count: MockedFunction<typeof prisma.message.count>;
};

const mockedPrismaTrial = prisma.trial as {
  findUnique: MockedFunction<typeof prisma.trial.findUnique>;
};

// ============================================================================
// Test Data
// ============================================================================

const createMockSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub-123',
  shop: 'myshop.myshopify.com',
  shopifySubId: 'gid://shopify/AppSubscription/123',
  planName: 'pro',
  status: 'active',
  currentPeriodEnd: new Date('2025-02-01'),
  trialEndsAt: null,
  basePrice: 29,
  includedQuota: 30,
  overagePrice: 2,
  cappedAmount: 50,
  usageThisCycle: 5,
  overagesThisCycle: 0,
  usageLineItemId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockPlanConfig = (overrides: Partial<PlanConfiguration> = {}): PlanConfiguration => ({
  id: 'plan-123',
  planName: 'pro',
  displayName: 'Pro',
  description: 'For professional theme developers',
  basePrice: 29,
  includedQuota: 30,
  overagePrice: 2,
  cappedAmount: 50,
  features: ['30 sections/month', 'Live preview'],
  featureFlags: ['live_preview', 'publish_theme', 'chat_refinement'],
  badge: 'Popular',
  sortOrder: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const FREE_PLAN = createMockPlanConfig({
  planName: 'free',
  displayName: 'Free',
  basePrice: 0,
  includedQuota: 5,
  featureFlags: [],
});

const PRO_PLAN = createMockPlanConfig({
  planName: 'pro',
  featureFlags: ['live_preview', 'publish_theme', 'chat_refinement'],
});

const AGENCY_PLAN = createMockPlanConfig({
  planName: 'agency',
  displayName: 'Agency',
  basePrice: 79,
  includedQuota: 100,
  featureFlags: ['live_preview', 'publish_theme', 'chat_refinement', 'team_seats', 'batch_generation', 'custom_templates'],
});

describe('FeatureGateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no trial (returns null)
    mockedPrismaTrial.findUnique.mockResolvedValue(null);
  });

  // ============================================================================
  // hasFeature
  // ============================================================================
  describe('hasFeature', () => {
    it('returns true when plan has feature flag', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'pro' }));
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(PRO_PLAN);

      const result = await hasFeature('myshop.myshopify.com', 'live_preview');
      expect(result).toBe(true);
    });

    it('returns false when plan lacks feature flag', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(null); // Free tier
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(FREE_PLAN);

      const result = await hasFeature('myshop.myshopify.com', 'live_preview');
      expect(result).toBe(false);
    });

    it('returns false for free tier users on publish_theme', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(null);
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(FREE_PLAN);

      const result = await hasFeature('myshop.myshopify.com', 'publish_theme');
      expect(result).toBe(false);
    });

    it('returns true for agency plan on all features', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'agency' }));
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(AGENCY_PLAN);

      expect(await hasFeature('shop.myshopify.com', 'live_preview')).toBe(true);
      expect(await hasFeature('shop.myshopify.com', 'team_seats')).toBe(true);
      expect(await hasFeature('shop.myshopify.com', 'batch_generation')).toBe(true);
    });
  });

  // ============================================================================
  // getRefinementLimit
  // ============================================================================
  describe('getRefinementLimit', () => {
    it('returns 0 for free tier (no subscription)', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(null);

      const result = await getRefinementLimit('myshop.myshopify.com');
      expect(result).toBe(0);
    });

    it('returns 5 for pro plan', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'pro' }));

      const result = await getRefinementLimit('myshop.myshopify.com');
      expect(result).toBe(5);
    });

    it('returns Infinity for agency plan', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'agency' }));

      const result = await getRefinementLimit('myshop.myshopify.com');
      expect(result).toBe(Infinity);
    });
  });

  // ============================================================================
  // getTeamSeatLimit
  // ============================================================================
  describe('getTeamSeatLimit', () => {
    it('returns 1 for free tier', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(null);

      const result = await getTeamSeatLimit('myshop.myshopify.com');
      expect(result).toBe(1);
    });

    it('returns 1 for pro plan', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'pro' }));

      const result = await getTeamSeatLimit('myshop.myshopify.com');
      expect(result).toBe(1);
    });

    it('returns 3 for agency plan', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'agency' }));

      const result = await getTeamSeatLimit('myshop.myshopify.com');
      expect(result).toBe(3);
    });
  });

  // ============================================================================
  // getConversationRefinementCount
  // ============================================================================
  describe('getConversationRefinementCount', () => {
    it('returns count of assistant messages', async () => {
      mockedPrismaMessage.count.mockResolvedValue(3);

      const result = await getConversationRefinementCount('conv-123');
      expect(result).toBe(3);
      expect(mockedPrismaMessage.count).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-123',
          role: 'assistant',
          isError: false,
        },
      });
    });
  });

  // ============================================================================
  // checkFeatureAccess
  // ============================================================================
  describe('checkFeatureAccess', () => {
    it('returns allowed=true when user has access', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'pro' }));
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(PRO_PLAN);

      const result = await checkFeatureAccess('myshop.myshopify.com', 'live_preview');
      expect(result).toEqual({ allowed: true });
    });

    it('returns upgrade info when user lacks access', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(null);
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(FREE_PLAN);

      const result = await checkFeatureAccess('myshop.myshopify.com', 'live_preview');
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe('pro');
      expect(result.reason).toContain('Live preview requires pro plan');
    });

    it('returns agency as required plan for team_seats', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'pro' }));
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(PRO_PLAN);

      const result = await checkFeatureAccess('myshop.myshopify.com', 'team_seats');
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe('agency');
    });
  });

  // ============================================================================
  // checkRefinementAccess
  // ============================================================================
  describe('checkRefinementAccess', () => {
    it('denies free tier users', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(null);

      const result = await checkRefinementAccess('myshop.myshopify.com', 'conv-123');
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe('pro');
      expect(result.limit).toBe(0);
    });

    it('allows pro users within limit', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'pro' }));
      mockedPrismaMessage.count.mockResolvedValue(3); // 3 of 5 used

      const result = await checkRefinementAccess('myshop.myshopify.com', 'conv-123');
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(3);
      expect(result.limit).toBe(5);
    });

    it('denies pro users at limit', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'pro' }));
      mockedPrismaMessage.count.mockResolvedValue(5); // 5 of 5 used

      const result = await checkRefinementAccess('myshop.myshopify.com', 'conv-123');
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe('agency');
      expect(result.used).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('allows agency users unlimited', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'agency' }));
      mockedPrismaMessage.count.mockResolvedValue(100);

      const result = await checkRefinementAccess('myshop.myshopify.com', 'conv-123');
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(100);
      expect(result.limit).toBe(Infinity);
    });
  });

  // ============================================================================
  // getFeaturesSummary
  // ============================================================================
  describe('getFeaturesSummary', () => {
    it('returns correct summary for free tier', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(null);
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(FREE_PLAN);

      const result = await getFeaturesSummary('myshop.myshopify.com');
      expect(result).toEqual({
        canPublish: false,
        canLivePreview: true, // Preview available for ALL plans to showcase value
        canChatRefine: false,
        refinementLimit: 0,
        refinementUsed: 0,
        teamSeatLimit: 1,
        planName: 'free',
        // Trial info (no trial)
        isInTrial: false,
        trialDaysRemaining: 0,
        trialUsageRemaining: 0,
        trialMaxUsage: 0,
      });
    });

    it('returns correct summary for pro tier', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'pro' }));
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(PRO_PLAN);
      mockedPrismaMessage.count.mockResolvedValue(2);

      const result = await getFeaturesSummary('myshop.myshopify.com', 'conv-123');
      expect(result.canPublish).toBe(true);
      expect(result.canLivePreview).toBe(true);
      expect(result.canChatRefine).toBe(true);
      expect(result.refinementLimit).toBe(5);
      expect(result.refinementUsed).toBe(2);
      expect(result.teamSeatLimit).toBe(1);
      expect(result.planName).toBe('pro');
    });

    it('returns correct summary for agency tier', async () => {
      mockedPrismaSubscription.findFirst.mockResolvedValue(createMockSubscription({ planName: 'agency' }));
      mockedPrismaPlanConfig.findUnique.mockResolvedValue(AGENCY_PLAN);
      mockedPrismaMessage.count.mockResolvedValue(50);

      const result = await getFeaturesSummary('myshop.myshopify.com', 'conv-123');
      expect(result.canPublish).toBe(true);
      expect(result.canLivePreview).toBe(true);
      expect(result.canChatRefine).toBe(true);
      expect(result.refinementLimit).toBe(Infinity);
      expect(result.refinementUsed).toBe(50);
      expect(result.teamSeatLimit).toBe(3);
      expect(result.planName).toBe('agency');
    });
  });
});
