/**
 * Billing Types for AI Section Generator
 *
 * Hybrid subscription model: Base recurring charge + usage-based overages
 */

import type { Subscription, UsageRecord, PlanConfiguration } from "@prisma/client";

/**
 * Plan tier names
 */
export type PlanTier = "starter" | "growth" | "professional";

/**
 * Subscription status from Shopify
 */
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "pending" | "frozen" | "declined";

/**
 * Usage charge status
 */
export type ChargeStatus = "pending" | "accepted" | "declined" | "error";

/**
 * Plan configuration with pricing and limits
 */
export interface PlanConfig {
  planName: PlanTier;
  displayName: string;
  description: string;
  basePrice: number; // USD
  includedQuota: number; // Generations per cycle
  overagePrice: number; // USD per additional generation
  cappedAmount: number; // Max total monthly charge (USD)
  features: string[];
  badge?: string; // "Popular", "Best Value"
  sortOrder: number;
  isActive: boolean;
}

/**
 * Subscription creation input
 */
export interface CreateSubscriptionInput {
  shop: string;
  planName: PlanTier;
  returnUrl: string; // Return URL after approval
  // Note: test mode is controlled by BILLING_TEST_MODE env variable
}

/**
 * Subscription creation result from Shopify
 */
export interface CreateSubscriptionResult {
  confirmationUrl: string; // Redirect merchant here for approval
  subscriptionId: string; // Shopify GraphQL subscription ID
}

/**
 * Usage record input
 */
export interface RecordUsageInput {
  shop: string;
  sectionId: string;
  description: string; // e.g., "Section generation - Hero banner"
  amount?: number; // If not provided, use plan's overage price
}

/**
 * Usage record result
 */
export interface RecordUsageResult {
  usageRecordId: string; // Local database ID
  shopifyChargeId: string | null; // Shopify usage charge ID
  amount: number; // Charge amount
  chargeStatus: ChargeStatus;
}

/**
 * Quota check result
 */
export interface QuotaCheck {
  hasQuota: boolean; // Can merchant generate?
  subscription: Subscription | null;
  usageThisCycle: number;
  includedQuota: number;
  overagesThisCycle: number;
  overagesRemaining: number; // How many overages left before cap
  percentUsed: number; // 0-100
  isInTrial: boolean;
  trialEndsAt: Date | null;
}

/**
 * Subscription upgrade/downgrade input
 */
export interface ChangeSubscriptionInput {
  shop: string;
  newPlanName: PlanTier;
  returnUrl: string;
}

/**
 * Webhook payload for APP_SUBSCRIPTIONS_UPDATE
 */
export interface SubscriptionUpdateWebhook {
  app_subscription: {
    admin_graphql_api_id: string; // e.g., gid://shopify/AppSubscription/123
    name: string;
    status: SubscriptionStatus;
    capped_amount: {
      amount: string;
      currency_code: string;
    };
    current_period_end?: string; // ISO 8601 - Optional, may not be included in webhook
    test: boolean;
  };
}

/**
 * Webhook payload for APPROACHING_CAPPED_AMOUNT
 */
export interface ApproachingCappedAmountWebhook {
  app_subscription: {
    admin_graphql_api_id: string;
    balance_used: {
      amount: string;
      currency_code: string;
    };
    capped_amount: {
      amount: string;
      currency_code: string;
    };
  };
}

/**
 * Billing cycle info
 */
export interface BillingCycle {
  start: Date;
  end: Date;
  isCurrent: boolean;
}

/**
 * Merchant billing summary
 */
export interface BillingSummary {
  subscription: Subscription | null;
  currentCycle: BillingCycle;
  quota: QuotaCheck;
  estimatedCharge: number; // Base + usage charges
  generationsThisCycle: number;
  overagesThisCycle: number;
  daysUntilRenewal: number;
}

// Re-export Prisma types for convenience
export type { Subscription, UsageRecord, PlanConfiguration };
