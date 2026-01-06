/**
 * Usage Analytics Service
 * Provides real-time usage statistics, projections, and trend analysis
 */

import prisma from "../db.server";

export interface UsageStats {
  currentCycle: {
    used: number;
    included: number;
    overages: number;
    overageCost: number;
  };
  recentGenerations: Array<{
    id: string;
    name: string;
    createdAt: Date;
    wasOverage: boolean;
  }>;
  projection: {
    estimatedTotal: number;
    estimatedOverages: number;
    estimatedCost: number;
    daysRemaining: number;
  };
  trend: "increasing" | "stable" | "decreasing";
}

/**
 * Get comprehensive usage statistics for a shop
 */
export async function getUsageStats(shop: string): Promise<UsageStats> {
  // Fetch subscription and calculate cycle start
  const subscription = await prisma.subscription.findFirst({
    where: { shop, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  // Calculate billing cycle start (30 days before period end)
  const cycleStart = subscription
    ? new Date(subscription.currentPeriodEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get recent generations for this billing cycle
  const recentGenerations = await prisma.section.findMany({
    where: {
      shop,
      createdAt: { gte: cycleStart },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, name: true, createdAt: true },
  });

  // Calculate usage metrics
  const usageThisCycle = subscription?.usageThisCycle ?? recentGenerations.length;
  const includedQuota = subscription?.includedQuota ?? 5;
  const overagesThisCycle = subscription?.overagesThisCycle ?? 0;
  const overagePrice = subscription?.overagePrice ?? 0;
  const basePrice = subscription?.basePrice ?? 0;

  // Calculate projection based on daily average
  const daysElapsed = Math.max(1, Math.ceil(
    (Date.now() - cycleStart.getTime()) / (24 * 60 * 60 * 1000)
  ));
  const daysRemaining = Math.max(0, 30 - daysElapsed);
  const dailyAverage = usageThisCycle / daysElapsed;
  const estimatedTotal = Math.round(dailyAverage * 30);

  const estimatedOverages = Math.max(0, estimatedTotal - includedQuota);
  const estimatedCost = basePrice + (estimatedOverages * overagePrice);

  // Determine trend based on daily average
  const trend: UsageStats["trend"] =
    dailyAverage > 1.5 ? "increasing" :
    dailyAverage < 0.5 ? "decreasing" :
    "stable";

  // Mark which generations were overages (most recent ones that exceeded quota)
  // Generations are already sorted desc by createdAt, so first N are the overages
  const generationsWithOverage = recentGenerations.map((gen, idx) => ({
    id: gen.id,
    name: gen.name ?? `Section ${recentGenerations.length - idx}`,
    createdAt: gen.createdAt,
    // The most recent `overagesThisCycle` generations are the overages
    wasOverage: idx < overagesThisCycle,
  }));

  return {
    currentCycle: {
      used: usageThisCycle,
      included: includedQuota,
      overages: overagesThisCycle,
      overageCost: overagesThisCycle * overagePrice,
    },
    recentGenerations: generationsWithOverage,
    projection: {
      estimatedTotal,
      estimatedOverages,
      estimatedCost,
      daysRemaining,
    },
    trend,
  };
}
