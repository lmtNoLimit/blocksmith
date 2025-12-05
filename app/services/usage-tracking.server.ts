/**
 * Usage Tracking Service
 *
 * Handles quota checks, usage metering, and billing integration
 */

import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { checkQuota, recordUsage, getSubscription } from "./billing.server";
import type { QuotaCheck } from "../types/billing";

/**
 * Check if merchant can generate (has quota)
 */
export async function canGenerate(shop: string): Promise<{ allowed: boolean; quota: QuotaCheck; reason?: string }> {
  const quota = await checkQuota(shop);

  if (!quota.hasQuota) {
    return {
      allowed: false,
      quota,
      reason: "You've reached your generation limit for this billing cycle. Please upgrade your plan or wait for the next cycle.",
    };
  }

  // Check if approaching cap (90% used)
  if (quota.percentUsed >= 90) {
    console.warn(`[Usage] Shop ${shop} is at ${quota.percentUsed.toFixed(1)}% of their cap`);
  }

  return {
    allowed: true,
    quota,
  };
}

/**
 * Record generation usage after successful AI generation
 */
export async function trackGeneration(admin: AdminApiContext, shop: string, sectionId: string, prompt: string) {
  try {
    // Check if this is an overage generation
    const subscription = await getSubscription(shop);

    if (!subscription) {
      // Free tier - no billing
      console.log(`[Usage] Free tier generation for ${shop}`);
      return;
    }

    // Truncate prompt for description (max 100 chars)
    const description = `Section generation - ${prompt.substring(0, 80)}${prompt.length > 80 ? "..." : ""}`;

    // Record usage (will charge if overage)
    const result = await recordUsage(admin, {
      shop,
      sectionId,
      description,
    });

    console.log(`[Usage] Recorded usage for ${shop}:`, {
      sectionId,
      amount: result.amount,
      status: result.chargeStatus,
    });

    return result;
  } catch (error) {
    console.error(`[Usage] Failed to track generation for ${shop}:`, error);

    // Save for manual reconciliation
    const prisma = (await import("../db.server")).default;
    await prisma.failedUsageCharge.create({
      data: {
        shop,
        sectionId,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Alert monitoring (TODO: integrate with Sentry/Datadog)
    // await alertMonitoring('usage_charge_failed', { shop, sectionId, error });

    // Don't throw - allow generation to succeed
  }
}

/**
 * Get usage summary for current billing cycle
 */
export async function getUsageSummary(shop: string) {
  const quota = await checkQuota(shop);
  const subscription = await getSubscription(shop);

  if (!subscription) {
    return {
      plan: "Free",
      usageThisCycle: 0,
      includedQuota: 5,
      overagesThisCycle: 0,
      percentUsed: 0,
      estimatedCharge: 0,
      daysUntilRenewal: null,
    };
  }

  const daysUntilRenewal = Math.ceil(
    (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const estimatedCharge = subscription.basePrice + subscription.overagesThisCycle * subscription.overagePrice;

  return {
    plan: subscription.planName,
    usageThisCycle: subscription.usageThisCycle,
    includedQuota: subscription.includedQuota,
    overagesThisCycle: subscription.overagesThisCycle,
    percentUsed: quota.percentUsed,
    estimatedCharge,
    daysUntilRenewal,
  };
}
