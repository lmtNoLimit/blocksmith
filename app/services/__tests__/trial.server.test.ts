// @jest-environment node
/**
 * Trial Service Tests
 *
 * Tests for 7-day free trial with Pro-tier features and 10 generation limit.
 */

// Mock Prisma BEFORE importing
jest.mock("../../db.server", () => ({
  __esModule: true,
  default: {
    trial: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Import after mocking
import {
  startTrial,
  getTrialStatus,
  incrementTrialUsage,
  convertTrial,
  hasHadTrial,
} from "../trial.server";
import prisma from "../../db.server";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Trial Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("startTrial", () => {
    it("creates new trial for shop without existing trial", async () => {
      const shop = "test-shop.myshopify.com";
      const createdTrial = {
        id: "trial-1",
        shop,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usageCount: 0,
        maxUsage: 10,
        status: "active",
      };

      // First call (startTrial check): no existing trial
      // Second call (getTrialStatus after create): return the created trial
      (mockPrisma.trial.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdTrial);
      (mockPrisma.trial.create as jest.Mock).mockResolvedValue(createdTrial);

      const result = await startTrial(shop);

      expect(mockPrisma.trial.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shop,
          maxUsage: 10,
        }),
      });
      expect(result.isInTrial).toBe(true);
      expect(result.maxUsage).toBe(10);
    });

    it("returns existing trial status if shop already had trial", async () => {
      const shop = "test-shop.myshopify.com";
      const existingTrial = {
        id: "trial-1",
        shop,
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        usageCount: 5,
        maxUsage: 10,
        status: "active",
      };
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue(existingTrial);

      const result = await startTrial(shop);

      expect(mockPrisma.trial.create).not.toHaveBeenCalled();
      expect(result.usageCount).toBe(5);
      expect(result.usageRemaining).toBe(5);
    });
  });

  describe("getTrialStatus", () => {
    it("returns none status for shop without trial", async () => {
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getTrialStatus("no-trial-shop.myshopify.com");

      expect(result.status).toBe("none");
      expect(result.isInTrial).toBe(false);
      expect(result.usageRemaining).toBe(0);
    });

    it("returns active trial with correct days remaining", async () => {
      const shop = "test-shop.myshopify.com";
      const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue({
        id: "trial-1",
        shop,
        startedAt: new Date(),
        endsAt,
        usageCount: 2,
        maxUsage: 10,
        status: "active",
      });

      const result = await getTrialStatus(shop);

      expect(result.isInTrial).toBe(true);
      expect(result.daysRemaining).toBe(3);
      expect(result.usageRemaining).toBe(8);
      expect(result.status).toBe("active");
    });

    it("auto-expires trial if past end date", async () => {
      const shop = "test-shop.myshopify.com";
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue({
        id: "trial-1",
        shop,
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Expired 3 days ago
        usageCount: 5,
        maxUsage: 10,
        status: "active",
      });
      (mockPrisma.trial.update as jest.Mock).mockResolvedValue({});

      const result = await getTrialStatus(shop);

      expect(result.isInTrial).toBe(false);
      expect(result.status).toBe("expired");
      expect(mockPrisma.trial.update).toHaveBeenCalledWith({
        where: { shop },
        data: { status: "expired" },
      });
    });

    it("returns inactive trial when usage exhausted", async () => {
      const shop = "test-shop.myshopify.com";
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue({
        id: "trial-1",
        shop,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        usageCount: 10,
        maxUsage: 10,
        status: "active",
      });

      const result = await getTrialStatus(shop);

      expect(result.isInTrial).toBe(false); // Not active because usage exhausted
      expect(result.usageRemaining).toBe(0);
    });
  });

  describe("incrementTrialUsage", () => {
    it("increments usage for active trial with remaining quota", async () => {
      const shop = "test-shop.myshopify.com";
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue({
        id: "trial-1",
        shop,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        usageCount: 5,
        maxUsage: 10,
        status: "active",
      });
      (mockPrisma.trial.update as jest.Mock).mockResolvedValue({});

      const result = await incrementTrialUsage(shop);

      expect(result).toBe(true);
      expect(mockPrisma.trial.update).toHaveBeenCalledWith({
        where: { shop },
        data: { usageCount: { increment: 1 } },
      });
    });

    it("returns false for exhausted trial", async () => {
      const shop = "test-shop.myshopify.com";
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue({
        id: "trial-1",
        shop,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        usageCount: 10,
        maxUsage: 10,
        status: "active",
      });

      const result = await incrementTrialUsage(shop);

      expect(result).toBe(false);
      expect(mockPrisma.trial.update).not.toHaveBeenCalled();
    });

    it("returns false for expired trial", async () => {
      const shop = "test-shop.myshopify.com";
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue({
        id: "trial-1",
        shop,
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        usageCount: 5,
        maxUsage: 10,
        status: "active",
      });
      (mockPrisma.trial.update as jest.Mock).mockResolvedValue({});

      const result = await incrementTrialUsage(shop);

      expect(result).toBe(false);
      // Should update status to expired
      expect(mockPrisma.trial.update).toHaveBeenCalledWith({
        where: { shop },
        data: { status: "expired" },
      });
    });

    it("returns false for non-existent trial", async () => {
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await incrementTrialUsage("no-trial.myshopify.com");

      expect(result).toBe(false);
    });
  });

  describe("convertTrial", () => {
    it("converts active trial to subscribed status", async () => {
      const shop = "test-shop.myshopify.com";
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue({
        id: "trial-1",
        shop,
        status: "active",
      });
      (mockPrisma.trial.update as jest.Mock).mockResolvedValue({});

      await convertTrial(shop, "pro");

      expect(mockPrisma.trial.update).toHaveBeenCalledWith({
        where: { shop },
        data: {
          status: "converted",
          convertedTo: "pro",
        },
      });
    });

    it("does nothing for shop without trial", async () => {
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue(null);

      await convertTrial("no-trial.myshopify.com", "pro");

      expect(mockPrisma.trial.update).not.toHaveBeenCalled();
    });
  });

  describe("hasHadTrial", () => {
    it("returns true for shop with trial", async () => {
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue({ id: "trial-1" });

      const result = await hasHadTrial("test-shop.myshopify.com");

      expect(result).toBe(true);
    });

    it("returns false for shop without trial", async () => {
      (mockPrisma.trial.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await hasHadTrial("no-trial.myshopify.com");

      expect(result).toBe(false);
    });
  });
});
