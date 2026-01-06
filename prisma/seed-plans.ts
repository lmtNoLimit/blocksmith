/**
 * Seed script for plan configurations
 * Run with: npx tsx prisma/seed-plans.ts
 *
 * Plan tiers: free, pro, agency
 * Feature flags for gating premium features
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  {
    planName: "free",
    displayName: "Free",
    description: "Get started with AI section generation",
    basePrice: 0,
    includedQuota: 5,
    overagePrice: 0, // No overages on free
    cappedAmount: 0,
    features: [
      "5 section generations/month",
      "Live preview with Shopify context",
      "Save as draft only",
      "Email support",
    ],
    featureFlags: [] as string[],
    badge: null,
    sortOrder: 0,
    isActive: true,
  },
  {
    planName: "pro",
    displayName: "Pro",
    description: "For professional theme developers",
    basePrice: 29,
    includedQuota: 30,
    overagePrice: 2,
    cappedAmount: 50,
    features: [
      "30 section generations/month",
      "Publish directly to theme",
      "Chat refinement (unlimited)",
      "Priority support",
      "$2/generation overage (max $50)",
    ],
    featureFlags: ["live_preview", "publish_theme", "chat_refinement"],
    badge: "Popular",
    sortOrder: 1,
    isActive: true,
  },
  {
    planName: "agency",
    displayName: "Agency",
    description: "For agencies and power users",
    basePrice: 79,
    includedQuota: 100,
    overagePrice: 2,
    cappedAmount: 100,
    features: [
      "100 section generations/month",
      "All Pro features",
      "Unlimited chat refinement",
      "Team seats (3 users)",
      "Batch generation",
      "Custom templates",
      "$2/generation overage (max $100)",
    ],
    featureFlags: [
      "live_preview",
      "publish_theme",
      "chat_refinement",
      "team_seats",
      "batch_generation",
      "custom_templates",
    ],
    badge: "Best Value",
    sortOrder: 2,
    isActive: true,
  },
];

async function main() {
  console.log("Seeding plan configurations...");

  for (const plan of plans) {
    const result = await prisma.planConfiguration.upsert({
      where: { planName: plan.planName },
      update: plan,
      create: plan,
    });

    console.log(`✓ ${result.displayName} plan: $${result.basePrice}/mo, ${result.includedQuota} sections included`);
  }

  console.log("\nPlan configurations seeded successfully!");
}

main()
  .catch((error) => {
    console.error("Error seeding plans:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
