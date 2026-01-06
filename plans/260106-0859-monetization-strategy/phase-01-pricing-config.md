# Phase 1: Pricing Configuration

## Context

- [Plan Overview](plan.md)
- Research: [SaaS Monetization](research/researcher-01-saas-ai-monetization.md), [Shopify Pricing](research/researcher-02-shopify-app-pricing.md)

## Overview

Configure pricing tiers in database + code. Existing `PlanConfiguration` model already supports base pricing; extend with feature flags for gating in Phase 2.

**Effort**: 3 hours

## Requirements

1. Define 3 tiers: free, pro, agency (rename from starter/growth/professional)
2. Add `featureFlags` field to PlanConfiguration for feature gating
3. Seed database with tier configurations
4. Update type definitions

## Related Code Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add featureFlags field |
| `app/types/billing.ts` | Update PlanTier type, add FeatureFlag enum |
| `app/services/billing.server.ts` | Update getPlanConfig, free tier handling |
| `prisma/seed.ts` | Seed plan configurations |

## Implementation Steps

### 1. Update Prisma Schema

```prisma
model PlanConfiguration {
  // ... existing fields ...
  featureFlags  String[]  // ["live_preview", "publish_theme", "chat_refinement", "team_seats", "batch_generation"]
}
```

### 2. Update Type Definitions

```typescript
// app/types/billing.ts
export type PlanTier = "free" | "pro" | "agency";

export type FeatureFlag =
  | "live_preview"      // Full Shopify context in preview
  | "publish_theme"     // Save directly to theme (not just draft)
  | "chat_refinement"   // AI chat follow-ups
  | "team_seats"        // Multiple users
  | "batch_generation"  // Generate multiple sections
  | "custom_templates"; // Custom brand templates
```

### 3. Seed Plan Configurations

```typescript
// prisma/seed.ts
const plans = [
  {
    planName: "free",
    displayName: "Free",
    description: "Get started with AI section generation",
    basePrice: 0,
    includedQuota: 5,
    overagePrice: 0,    // No overages on free
    cappedAmount: 0,
    features: [
      "5 section generations/month",
      "Basic preview",
      "Save as draft",
      "Email support"
    ],
    featureFlags: [],
    badge: null,
    sortOrder: 0,
    isActive: true
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
      "Live preview with Shopify context",
      "Publish directly to theme",
      "Chat refinement (5 turns)",
      "Priority support",
      "$2/generation overage (max $50)"
    ],
    featureFlags: ["live_preview", "publish_theme", "chat_refinement"],
    badge: "Popular",
    sortOrder: 1,
    isActive: true
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
      "$2/generation overage (max $100)"
    ],
    featureFlags: ["live_preview", "publish_theme", "chat_refinement", "team_seats", "batch_generation", "custom_templates"],
    badge: "Best Value",
    sortOrder: 2,
    isActive: true
  }
];
```

### 4. Update Billing Service

Add free tier handling to `checkQuota()`:

```typescript
// When no subscription, return free tier limits
if (!subscription) {
  const freePlan = await getPlanConfig("free");
  return {
    hasQuota: freeUsageCount < freePlan.includedQuota,
    subscription: null,
    usageThisCycle: freeUsageCount,
    includedQuota: freePlan.includedQuota,
    // ...
  };
}
```

### 5. Create Migration

```bash
npx prisma migrate dev --name add-feature-flags
```

## Todo List

- [x] Add `featureFlags` field to PlanConfiguration schema
- [x] Update PlanTier type to "free" | "pro" | "agency"
- [x] Add FeatureFlag type enum
- [x] Create database seed script for 3 tiers
- [x] Run migration + seed
- [x] Update checkQuota() for free tier
- [x] Update getActivePlans() to filter by isActive

## Status

✅ **COMPLETE** - All tasks implemented successfully

**Review**: [Code Review Report](../reports/code-reviewer-260106-0942-phase1-pricing.md)

**Findings**:
- 3 HIGH priority optimizations identified (cache, status normalization, validation)
- No critical security/data issues
- Build passing, types clean

**Next Phase**: Phase 2 - Feature Gating

## Success Criteria

1. Database contains 3 plan configs (free/pro/agency)
2. `getActivePlans()` returns all 3 tiers sorted correctly
3. `getPlanConfig("free")` returns valid free tier config
4. `checkQuota()` returns free tier limits when no subscription
5. Types compile without errors
