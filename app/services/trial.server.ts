/**
 * Trial Service - Free Trial Management
 *
 * Manages 7-day free trial with Pro-tier features and 10 generation limit.
 * Auto-starts on first install, converts on subscription, expires to free tier.
 */

import prisma from "../db.server";

/** Trial status type */
export type TrialStatusType = "active" | "expired" | "converted" | "none";

/** Trial status response */
export interface TrialStatus {
  isInTrial: boolean;
  daysRemaining: number;
  usageRemaining: number;
  usageCount: number;
  maxUsage: number;
  endsAt: Date | null;
  status: TrialStatusType;
}

/** Trial configuration constants */
const TRIAL_DURATION_DAYS = 7;
const TRIAL_MAX_USAGE = 10;

/**
 * Start a new trial for shop (only if no existing trial)
 * Returns existing trial status if shop already had a trial
 */
export async function startTrial(shop: string): Promise<TrialStatus> {
  const existingTrial = await prisma.trial.findUnique({ where: { shop } });

  if (existingTrial) {
    // No second trials - return existing status
    return getTrialStatus(shop);
  }

  const endsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.trial.create({
    data: {
      shop,
      endsAt,
      maxUsage: TRIAL_MAX_USAGE,
    },
  });

  return getTrialStatus(shop);
}

/**
 * Get current trial status for shop
 */
export async function getTrialStatus(shop: string): Promise<TrialStatus> {
  const trial = await prisma.trial.findUnique({ where: { shop } });

  if (!trial) {
    return {
      isInTrial: false,
      daysRemaining: 0,
      usageRemaining: 0,
      usageCount: 0,
      maxUsage: 0,
      endsAt: null,
      status: "none",
    };
  }

  const now = new Date();
  const isExpired = now > trial.endsAt;
  const daysRemaining = Math.max(
    0,
    Math.ceil((trial.endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  );

  // Auto-expire if past end date and still marked active
  if (isExpired && trial.status === "active") {
    await prisma.trial.update({
      where: { shop },
      data: { status: "expired" },
    });
  }

  const usageExhausted = trial.usageCount >= trial.maxUsage;
  const isActive = trial.status === "active" && !isExpired && !usageExhausted;

  return {
    isInTrial: isActive,
    daysRemaining,
    usageRemaining: Math.max(0, trial.maxUsage - trial.usageCount),
    usageCount: trial.usageCount,
    maxUsage: trial.maxUsage,
    endsAt: trial.endsAt,
    status: isExpired ? "expired" : (trial.status as TrialStatusType),
  };
}

/**
 * Increment trial usage (call before generation)
 * Returns true if generation allowed, false if trial exhausted
 */
export async function incrementTrialUsage(shop: string): Promise<boolean> {
  const trial = await prisma.trial.findUnique({ where: { shop } });

  if (!trial || trial.status !== "active") {
    return false;
  }

  const now = new Date();
  if (now > trial.endsAt) {
    // Auto-expire
    await prisma.trial.update({
      where: { shop },
      data: { status: "expired" },
    });
    return false;
  }

  if (trial.usageCount >= trial.maxUsage) {
    return false; // Trial usage exhausted
  }

  await prisma.trial.update({
    where: { shop },
    data: { usageCount: { increment: 1 } },
  });

  return true;
}

/**
 * Convert trial to paid subscription
 * Called when merchant subscribes to a plan
 */
export async function convertTrial(shop: string, planName: string): Promise<void> {
  const trial = await prisma.trial.findUnique({ where: { shop } });

  if (!trial) return;

  await prisma.trial.update({
    where: { shop },
    data: {
      status: "converted",
      convertedTo: planName,
    },
  });
}

/**
 * Check if shop has ever had a trial
 */
export async function hasHadTrial(shop: string): Promise<boolean> {
  const trial = await prisma.trial.findUnique({ where: { shop } });
  return trial !== null;
}
