# Phase 4: Free Trial Flow

## Context

- [Plan Overview](plan.md)
- Depends on: [Phase 1](phase-01-pricing-config.md), [Phase 2](phase-02-feature-gating.md)

## Overview

Implement 7-day free trial with Pro-tier access (10 generations max). Auto-starts on first app install; converts to free tier or paid plan at trial end. Research shows 45.7% of successful Shopify apps offer free trials.

**Effort**: 4 hours

## Requirements

1. Auto-start 7-day trial on first install
2. Pro-tier feature access during trial
3. 10 generation limit during trial
4. Trial countdown banner in UI
5. Trial end email reminder (3 days, 1 day before)
6. Graceful downgrade to free tier on expiry

## Trial Configuration

```
Duration: 7 days
Features: Pro-tier access
Generation Limit: 10 (not 30)
Post-Trial: Downgrade to Free tier unless subscribed
```

## Related Code Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add Trial model |
| `app/services/trial.server.ts` | New: trial management |
| `app/services/feature-gate.server.ts` | Trial-aware feature checks |
| `app/routes/webhooks.app.uninstalled.tsx` | Handle reinstall trial logic |
| `app/routes/app._index.tsx` | Show trial banner |
| `app/components/billing/TrialBanner.tsx` | New: countdown component |
| `app/routes/app.billing.tsx` | Trial status in loader |

## Implementation Steps

### 1. Add Trial Model

```prisma
// prisma/schema.prisma
model Trial {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  shop        String    @unique
  startedAt   DateTime  @default(now())
  endsAt      DateTime  // 7 days from start
  usageCount  Int       @default(0)
  maxUsage    Int       @default(10)
  status      String    @default("active") // active, expired, converted
  convertedTo String?   // Plan name if converted

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([status, endsAt])
}
```

### 2. Create Trial Service

```typescript
// app/services/trial.server.ts
import prisma from "../db.server";

export interface TrialStatus {
  isInTrial: boolean;
  daysRemaining: number;
  usageRemaining: number;
  usageCount: number;
  maxUsage: number;
  endsAt: Date | null;
  status: "active" | "expired" | "converted" | "none";
}

export async function startTrial(shop: string): Promise<TrialStatus> {
  // Check if shop already had a trial
  const existingTrial = await prisma.trial.findUnique({ where: { shop } });

  if (existingTrial) {
    // No second trials - return existing status
    return getTrialStatus(shop);
  }

  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.trial.create({
    data: {
      shop,
      endsAt,
      maxUsage: 10,
    },
  });

  return getTrialStatus(shop);
}

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
  const daysRemaining = Math.max(0, Math.ceil((trial.endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  // Auto-expire if past end date
  if (isExpired && trial.status === "active") {
    await prisma.trial.update({
      where: { shop },
      data: { status: "expired" },
    });
  }

  return {
    isInTrial: trial.status === "active" && !isExpired,
    daysRemaining,
    usageRemaining: Math.max(0, trial.maxUsage - trial.usageCount),
    usageCount: trial.usageCount,
    maxUsage: trial.maxUsage,
    endsAt: trial.endsAt,
    status: isExpired ? "expired" : trial.status as TrialStatus["status"],
  };
}

export async function incrementTrialUsage(shop: string): Promise<boolean> {
  const trial = await prisma.trial.findUnique({ where: { shop } });

  if (!trial || trial.status !== "active") {
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

export async function convertTrial(shop: string, planName: string): Promise<void> {
  await prisma.trial.update({
    where: { shop },
    data: {
      status: "converted",
      convertedTo: planName,
    },
  });
}
```

### 3. Update Feature Gate for Trial

```typescript
// app/services/feature-gate.server.ts
import { getTrialStatus } from "./trial.server";

export async function hasFeature(shop: string, feature: FeatureFlag): Promise<boolean> {
  // Check trial status first
  const trial = await getTrialStatus(shop);
  if (trial.isInTrial && trial.usageRemaining > 0) {
    // Trial users get Pro-tier features
    const proPlan = await getPlanConfig("pro");
    return proPlan.featureFlags.includes(feature);
  }

  // Normal subscription check
  const subscription = await getSubscription(shop);
  const planName: PlanTier = subscription?.planName ?? "free";
  const plan = await getPlanConfig(planName);
  return plan.featureFlags.includes(feature);
}
```

### 4. Create Trial Banner Component

```typescript
// app/components/billing/TrialBanner.tsx
interface TrialBannerProps {
  daysRemaining: number;
  usageRemaining: number;
  maxUsage: number;
  onUpgrade: () => void;
}

export function TrialBanner({ daysRemaining, usageRemaining, maxUsage, onUpgrade }: TrialBannerProps) {
  const isUrgent = daysRemaining <= 2 || usageRemaining <= 2;

  return (
    <s-banner tone={isUrgent ? "warning" : "info"}>
      <s-stack direction="inline" gap="base" alignItems="center">
        <s-text>
          <s-text type="strong">Free Trial</s-text>
          {" "}{daysRemaining} days left | {usageRemaining}/{maxUsage} generations remaining
        </s-text>
        <s-button variant="secondary" onClick={onUpgrade}>
          Upgrade Now
        </s-button>
      </s-stack>
    </s-banner>
  );
}
```

### 5. Auto-Start Trial on App Load

```typescript
// app/routes/app._index.tsx (or app.tsx layout)
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  // Check/start trial for new users
  let trialStatus = await getTrialStatus(session.shop);

  // Auto-start trial if no trial and no subscription
  if (trialStatus.status === "none") {
    const subscription = await getSubscription(session.shop);
    if (!subscription) {
      trialStatus = await startTrial(session.shop);
    }
  }

  return { trialStatus, /* other data */ };
}
```

### 6. Update Quota Check for Trial

```typescript
// app/services/billing.server.ts - checkQuota()
export async function checkQuota(shop: string): Promise<QuotaCheck> {
  const subscription = await getSubscription(shop);
  const trial = await getTrialStatus(shop);

  // Trial users
  if (trial.isInTrial && trial.usageRemaining > 0) {
    return {
      hasQuota: true,
      subscription: null,
      usageThisCycle: trial.usageCount,
      includedQuota: trial.maxUsage,
      overagesThisCycle: 0,
      overagesRemaining: 0,
      percentUsed: (trial.usageCount / trial.maxUsage) * 100,
      isInTrial: true,
      trialEndsAt: trial.endsAt,
    };
  }

  // ... existing subscription/free tier logic
}
```

### 7. Increment Trial Usage on Generation

```typescript
// In section generation handler
import { incrementTrialUsage, getTrialStatus } from "../services/trial.server";

// Before generation
const trial = await getTrialStatus(session.shop);
if (trial.isInTrial) {
  const canGenerate = await incrementTrialUsage(session.shop);
  if (!canGenerate) {
    return json({
      error: "Trial limit reached. Upgrade to continue generating.",
      trialExpired: true
    }, { status: 403 });
  }
}
```

### 8. Convert Trial on Subscription

```typescript
// app/services/billing.server.ts - createSubscription()
export async function createSubscription(...) {
  // ... existing code ...

  // Convert trial if active
  await convertTrial(shop, planName);

  // ... rest of subscription creation
}
```

## Todo List

- [ ] Add Trial model to Prisma schema
- [ ] Run migration: `npx prisma migrate dev --name add-trial`
- [ ] Create trial.server.ts with startTrial(), getTrialStatus(), incrementTrialUsage()
- [ ] Update hasFeature() to check trial status
- [ ] Update checkQuota() for trial users
- [ ] Create TrialBanner component
- [ ] Add trial auto-start in app loader
- [ ] Increment trial usage on generation
- [ ] Convert trial on subscription creation
- [ ] Test trial expiry -> free tier downgrade
- [ ] Test reinstall (no second trial)

## Success Criteria

1. New installs auto-start 7-day trial
2. Trial users get Pro features (live preview, publish)
3. Trial limited to 10 generations
4. Trial banner shows countdown + usage
5. Trial expires gracefully to free tier
6. Subscription converts trial to "converted" status
7. Reinstalls do not get second trial
