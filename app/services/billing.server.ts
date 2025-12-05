/**
 * Billing Service - Shopify App Billing API
 *
 * Handles hybrid subscription model: Base recurring + usage-based overages
 * Uses Shopify GraphQL Admin API for billing operations
 */

import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import type {
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  RecordUsageInput,
  RecordUsageResult,
  QuotaCheck,
  ChangeSubscriptionInput,
  PlanTier,
  SubscriptionStatus,
} from "../types/billing";

/**
 * Get plan configuration by tier
 */
export async function getPlanConfig(planName: PlanTier) {
  const config = await prisma.planConfiguration.findUnique({
    where: { planName },
  });

  if (!config) {
    throw new Error(`Plan configuration not found: ${planName}`);
  }

  return config;
}

/**
 * Get all active plans (for pricing page)
 */
export async function getActivePlans() {
  return await prisma.planConfiguration.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Create a new subscription via Shopify Billing API
 */
export async function createSubscription(
  admin: AdminApiContext,
  input: CreateSubscriptionInput,
): Promise<CreateSubscriptionResult> {
  const { shop, planName, returnUrl } = input;

  // Cancel existing pending/declined subscriptions before creating new one
  await prisma.subscription.updateMany({
    where: {
      shop,
      status: { in: ["pending", "declined"] }
    },
    data: { status: "cancelled" }
  });

  // Use environment variable for test mode (true = free subscriptions on dev stores)
  const test = process.env.BILLING_TEST_MODE === "true";

  // Get plan configuration
  const plan = await getPlanConfig(planName);

  // Create hybrid subscription (recurring + usage)
  const mutation = `
    mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!, $test: Boolean) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        lineItems: $lineItems
        test: $test
      ) {
        appSubscription {
          id
          status
          currentPeriodEnd
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      name: `${plan.displayName} Plan`,
      returnUrl,
      test,
      lineItems: [
        // Base recurring charge
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: plan.basePrice, currencyCode: "USD" },
              interval: "EVERY_30_DAYS",
            },
          },
        },
        // Usage-based overage charges
        {
          plan: {
            appUsagePricingDetails: {
              cappedAmount: { amount: plan.cappedAmount, currencyCode: "USD" },
              terms: `${plan.includedQuota} sections included. $${plan.overagePrice.toFixed(2)} per additional section.`,
            },
          },
        },
      ],
    },
  });

  const data = await response.json();
  const result = data.data.appSubscriptionCreate;

  if (result.userErrors && result.userErrors.length > 0) {
    throw new Error(`Failed to create subscription: ${result.userErrors[0].message}`);
  }

  // Save subscription to database (status: pending until approved)
  // Handle null/undefined currentPeriodEnd from pending subscriptions
  const currentPeriodEnd = result.appSubscription.currentPeriodEnd
    ? new Date(result.appSubscription.currentPeriodEnd)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

  await prisma.subscription.create({
    data: {
      shop,
      shopifySubId: result.appSubscription.id,
      planName,
      status: "pending" as SubscriptionStatus,
      currentPeriodEnd,
      trialEndsAt,
      basePrice: plan.basePrice,
      includedQuota: plan.includedQuota,
      overagePrice: plan.overagePrice,
      cappedAmount: plan.cappedAmount,
      usageThisCycle: 0,
      overagesThisCycle: 0,
    },
  });

  return {
    confirmationUrl: result.confirmationUrl,
    subscriptionId: result.appSubscription.id,
  };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(admin: AdminApiContext, shop: string) {
  const subscription = await getSubscription(shop);

  if (!subscription) {
    throw new Error("No active subscription found");
  }

  const mutation = `
    mutation appSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      id: subscription.shopifySubId,
    },
  });

  const data = await response.json();
  const result = data.data.appSubscriptionCancel;

  if (result.userErrors && result.userErrors.length > 0) {
    throw new Error(`Failed to cancel subscription: ${result.userErrors[0].message}`);
  }

  // Update local database - use updateMany since shop is not unique
  await prisma.subscription.updateMany({
    where: {
      shop,
      shopifySubId: subscription.shopifySubId
    },
    data: { status: "cancelled" },
  });
}

/**
 * Record usage charge (for generation overages)
 */
export async function recordUsage(
  admin: AdminApiContext,
  input: RecordUsageInput,
): Promise<RecordUsageResult> {
  const { shop, sectionId, description, amount: customAmount } = input;

  // Get subscription
  const subscription = await getSubscription(shop);

  if (!subscription) {
    throw new Error("No active subscription found");
  }

  // Check if generation is within included quota or overage
  const isOverage = subscription.usageThisCycle >= subscription.includedQuota;
  const amount = customAmount ?? (isOverage ? subscription.overagePrice : 0);

  // Generate idempotency key (prevents duplicate charges)
  const timestamp = Date.now();
  const idempotencyKey = `${shop}-${sectionId}-${timestamp}`;

  // Save usage record locally first
  const usageRecord = await prisma.usageRecord.create({
    data: {
      shop,
      subscriptionId: subscription.id,
      sectionId,
      idempotencyKey,
      amount,
      description,
      billingCycle: subscription.currentPeriodEnd,
      chargeStatus: "pending",
    },
  });

  // If no charge amount (within quota), mark as accepted immediately
  if (amount === 0) {
    await prisma.usageRecord.update({
      where: { id: usageRecord.id },
      data: { chargeStatus: "accepted", sentAt: new Date() },
    });

    // Increment usage counter
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { usageThisCycle: { increment: 1 } },
    });

    return {
      usageRecordId: usageRecord.id,
      shopifyChargeId: null,
      amount: 0,
      chargeStatus: "accepted",
    };
  }

  // Send usage charge to Shopify (for overages)
  try {
    // Get or fetch usage line item ID
    let usageLineItemId = subscription.usageLineItemId;

    if (!usageLineItemId) {
      // Query Shopify to get the correct usage line item ID
      const query = `
        query getSubscription($id: ID!) {
          appSubscription(id: $id) {
            lineItems {
              id
              plan {
                pricingDetails {
                  __typename
                }
              }
            }
          }
        }
      `;

      const queryResponse = await admin.graphql(query, {
        variables: { id: subscription.shopifySubId }
      });

      const queryData = await queryResponse.json();
      const lineItems = queryData.data.appSubscription.lineItems;

      // Find usage line item (AppUsagePricing type)
      interface LineItem {
        id: string;
        plan: {
          pricingDetails: {
            __typename: string;
          };
        };
      }
      const usageLineItem = lineItems.find(
        (item: LineItem) => item.plan.pricingDetails.__typename === "AppUsagePricing"
      );

      if (!usageLineItem) {
        throw new Error("Usage line item not found in subscription");
      }

      usageLineItemId = usageLineItem.id;

      // Cache the line item ID for future use
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { usageLineItemId }
      });
    }

    const mutation = `
      mutation appUsageRecordCreate($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!, $idempotencyKey: String!) {
        appUsageRecordCreate(
          subscriptionLineItemId: $subscriptionLineItemId
          price: $price
          description: $description
          idempotencyKey: $idempotencyKey
        ) {
          appUsageRecord {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: {
        subscriptionLineItemId: usageLineItemId,
        price: { amount, currencyCode: "USD" },
        description,
        idempotencyKey,
      },
    });

    const data = await response.json();
    const result = data.data.appUsageRecordCreate;

    if (result.userErrors && result.userErrors.length > 0) {
      // Update record with error
      await prisma.usageRecord.update({
        where: { id: usageRecord.id },
        data: {
          chargeStatus: "error",
          errorMessage: result.userErrors[0].message,
        },
      });

      throw new Error(`Failed to record usage: ${result.userErrors[0].message}`);
    }

    // Update record with Shopify charge ID
    await prisma.usageRecord.update({
      where: { id: usageRecord.id },
      data: {
        shopifyChargeId: result.appUsageRecord.id,
        chargeStatus: "accepted",
        sentAt: new Date(),
      },
    });

    // Increment usage and overage counters
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        usageThisCycle: { increment: 1 },
        overagesThisCycle: { increment: 1 },
      },
    });

    return {
      usageRecordId: usageRecord.id,
      shopifyChargeId: result.appUsageRecord.id,
      amount,
      chargeStatus: "accepted",
    };
  } catch (error) {
    // Log error but don't block merchant (graceful degradation)
    console.error("Failed to send usage charge to Shopify:", error);

    await prisma.usageRecord.update({
      where: { id: usageRecord.id },
      data: {
        chargeStatus: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Still increment usage counter locally
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        usageThisCycle: { increment: 1 },
        overagesThisCycle: isOverage ? { increment: 1 } : undefined,
      },
    });

    return {
      usageRecordId: usageRecord.id,
      shopifyChargeId: null,
      amount,
      chargeStatus: "error",
    };
  }
}

/**
 * Check quota before generation
 */
export async function checkQuota(shop: string): Promise<QuotaCheck> {
  const subscription = await getSubscription(shop);
  console.log("Subscription for quota check:", subscription);
  // No subscription = free tier with limits
  if (!subscription) {
    return {
      hasQuota: true, // Allow 5 free generations
      subscription: null,
      usageThisCycle: 0,
      includedQuota: 5, // Free tier limit
      overagesThisCycle: 0,
      overagesRemaining: 0,
      percentUsed: 0,
      isInTrial: false,
      trialEndsAt: null,
    };
  }

  const isInTrial = subscription.trialEndsAt ? new Date() < subscription.trialEndsAt : false;
  const maxOverages = Math.floor(subscription.cappedAmount / subscription.overagePrice);
  const overagesRemaining = maxOverages - subscription.overagesThisCycle;
  const hasQuota = subscription.usageThisCycle < subscription.includedQuota || overagesRemaining > 0;
  const percentUsed = (subscription.usageThisCycle / (subscription.includedQuota + maxOverages)) * 100;

  return {
    hasQuota,
    subscription,
    usageThisCycle: subscription.usageThisCycle,
    includedQuota: subscription.includedQuota,
    overagesThisCycle: subscription.overagesThisCycle,
    overagesRemaining,
    percentUsed: Math.min(percentUsed, 100),
    isInTrial,
    trialEndsAt: subscription.trialEndsAt,
  };
}

/**
 * Get active subscription for shop (filters by status)
 * Note: Shopify sends uppercase status ("ACTIVE"), but our type uses lowercase
 */
export async function getSubscription(shop: string) {
  return await prisma.subscription.findFirst({
    where: {
      shop,
      status: {
        mode: "insensitive",
        equals: "active"
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Get active subscription (explicit helper)
 */
export async function getActiveSubscription(shop: string) {
  return await getSubscription(shop);
}

/**
 * Update subscription status (called by webhook)
 */
export async function updateSubscriptionStatus(shopifySubId: string, status: SubscriptionStatus, currentPeriodEnd?: Date) {
  const updateData: {
    status: SubscriptionStatus;
    currentPeriodEnd?: Date;
    usageThisCycle?: number;
    overagesThisCycle?: number;
  } = { status };

  if (currentPeriodEnd) {
    updateData.currentPeriodEnd = currentPeriodEnd;
    // Reset usage counters at start of new billing cycle
    updateData.usageThisCycle = 0;
    updateData.overagesThisCycle = 0;
  }

  return await prisma.subscription.update({
    where: { shopifySubId },
    data: updateData,
  });
}

/**
 * Fetch currentPeriodEnd from Shopify GraphQL (webhook fallback)
 */
export async function fetchCurrentPeriodEnd(
  admin: AdminApiContext,
  shopifySubId: string
): Promise<Date | null> {
  try {
    const query = `
      query getSubscription($id: ID!) {
        appSubscription(id: $id) {
          currentPeriodEnd
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { id: shopifySubId }
    });

    interface AppSubscriptionResponse {
      errors?: unknown;
      data?: {
        appSubscription?: {
          currentPeriodEnd?: string;
        };
      };
    }
    const data: AppSubscriptionResponse = await response.json();

    if (data.errors || !data.data?.appSubscription?.currentPeriodEnd) {
      console.warn("[Billing] Failed to fetch currentPeriodEnd:", shopifySubId);
      return null;
    }

    return new Date(data.data.appSubscription.currentPeriodEnd);
  } catch (error) {
    console.error("[Billing] Error fetching currentPeriodEnd:", error);
    return null;
  }
}

/**
 * Change subscription plan (upgrade/downgrade)
 */
export async function changeSubscription(
  admin: AdminApiContext,
  input: ChangeSubscriptionInput,
): Promise<CreateSubscriptionResult> {
  const { shop, newPlanName, returnUrl } = input;

  // Cancel existing subscription
  await cancelSubscription(admin, shop);

  // Create new subscription
  return await createSubscription(admin, {
    shop,
    planName: newPlanName,
    returnUrl,
  });
}
