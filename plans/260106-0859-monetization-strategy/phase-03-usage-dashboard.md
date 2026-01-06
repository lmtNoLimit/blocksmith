# Phase 3: Usage Dashboard

## Context

- [Plan Overview](plan.md)
- Depends on: [Phase 1 - Pricing Config](phase-01-pricing-config.md)

## Overview

Enhance existing UsageDashboard with real-time usage tracking, overage projections, and billing alerts. Existing components provide foundation; add deeper analytics and cost transparency.

**Effort**: 4 hours

## Requirements

1. Real-time usage display (current cycle)
2. Overage cost projection based on usage trend
3. Generation history with timestamps
4. Usage alerts at 50%, 75%, 90% thresholds
5. Monthly comparison charts (nice-to-have)

## Related Code Files

| File | Purpose |
|------|---------|
| `app/components/billing/UsageDashboard.tsx` | Enhance existing component |
| `app/components/billing/QuotaProgressBar.tsx` | Add threshold markers |
| `app/components/billing/UsageAlertBanner.tsx` | Multi-threshold alerts |
| `app/components/billing/UsageHistory.tsx` | New: generation log |
| `app/components/billing/CostProjection.tsx` | New: overage forecast |
| `app/services/usage-analytics.server.ts` | New: analytics queries |
| `app/routes/app.billing.tsx` | Add history/projection data |

## Implementation Steps

### 1. Create Usage Analytics Service

```typescript
// app/services/usage-analytics.server.ts
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

export async function getUsageStats(shop: string): Promise<UsageStats> {
  const subscription = await prisma.subscription.findFirst({
    where: { shop, status: "active" },
  });

  // Get recent generations for this billing cycle
  const cycleStart = subscription
    ? new Date(subscription.currentPeriodEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentGenerations = await prisma.section.findMany({
    where: {
      shop,
      createdAt: { gte: cycleStart },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, name: true, createdAt: true },
  });

  // Calculate projection based on daily average
  const daysElapsed = Math.max(1, Math.ceil(
    (Date.now() - cycleStart.getTime()) / (24 * 60 * 60 * 1000)
  ));
  const daysRemaining = 30 - daysElapsed;
  const dailyAverage = (subscription?.usageThisCycle ?? 0) / daysElapsed;
  const estimatedTotal = Math.round(dailyAverage * 30);

  const includedQuota = subscription?.includedQuota ?? 5;
  const estimatedOverages = Math.max(0, estimatedTotal - includedQuota);
  const overagePrice = subscription?.overagePrice ?? 0;
  const estimatedCost = (subscription?.basePrice ?? 0) + (estimatedOverages * overagePrice);

  return {
    currentCycle: {
      used: subscription?.usageThisCycle ?? 0,
      included: includedQuota,
      overages: subscription?.overagesThisCycle ?? 0,
      overageCost: (subscription?.overagesThisCycle ?? 0) * overagePrice,
    },
    recentGenerations: recentGenerations.map((g, idx) => ({
      id: g.id,
      name: g.name ?? `Section ${idx + 1}`,
      createdAt: g.createdAt,
      wasOverage: idx < (subscription?.overagesThisCycle ?? 0),
    })),
    projection: {
      estimatedTotal,
      estimatedOverages,
      estimatedCost,
      daysRemaining,
    },
    trend: dailyAverage > 1.5 ? "increasing" : dailyAverage < 0.5 ? "decreasing" : "stable",
  };
}
```

### 2. Enhance UsageDashboard

```typescript
// app/components/billing/UsageDashboard.tsx
interface UsageDashboardProps {
  quota: QuotaCheck;
  subscription: Subscription | null;
  stats?: UsageStats;
}

export function UsageDashboard({ quota, subscription, stats }: UsageDashboardProps) {
  return (
    <s-section heading="Usage This Cycle">
      <s-grid gap="base" gridTemplateColumns="1fr 1fr">
        {/* Left: Progress + Quick Stats */}
        <s-box border="base" borderRadius="base" padding="base">
          <s-stack gap="base">
            <QuotaProgressBar
              used={quota.usageThisCycle}
              total={quota.includedQuota}
              showThresholds
            />
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <StatCard label="Included" value={quota.includedQuota} />
              <StatCard label="Used" value={quota.usageThisCycle} />
              <StatCard label="Overages" value={quota.overagesThisCycle} />
              <StatCard label="Overage Cost" value={`$${stats?.currentCycle.overageCost ?? 0}`} />
            </s-grid>
          </s-stack>
        </s-box>

        {/* Right: Projection */}
        {stats && (
          <CostProjection
            estimatedTotal={stats.projection.estimatedTotal}
            estimatedCost={stats.projection.estimatedCost}
            daysRemaining={stats.projection.daysRemaining}
            trend={stats.trend}
          />
        )}
      </s-grid>

      {/* Generation History */}
      {stats && <UsageHistory generations={stats.recentGenerations} />}
    </s-section>
  );
}
```

### 3. Create Cost Projection Component

```typescript
// app/components/billing/CostProjection.tsx
interface CostProjectionProps {
  estimatedTotal: number;
  estimatedCost: number;
  daysRemaining: number;
  trend: "increasing" | "stable" | "decreasing";
}

export function CostProjection({ estimatedTotal, estimatedCost, daysRemaining, trend }: CostProjectionProps) {
  const trendIcon = trend === "increasing" ? "arrow-up" : trend === "decreasing" ? "arrow-down" : "minus";
  const trendTone = trend === "increasing" ? "warning" : "subdued";

  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack gap="base">
        <s-heading>Projected Usage</s-heading>
        <s-grid gridTemplateColumns="1fr 1fr" gap="small-200">
          <s-text color="subdued">Est. generations</s-text>
          <s-text type="strong">{estimatedTotal}</s-text>
          <s-text color="subdued">Est. total cost</s-text>
          <s-text type="strong">${estimatedCost.toFixed(2)}</s-text>
          <s-text color="subdued">Days remaining</s-text>
          <s-text>{daysRemaining}</s-text>
        </s-grid>
        <s-badge tone={trendTone}>
          Usage {trend}
        </s-badge>
      </s-stack>
    </s-box>
  );
}
```

### 4. Create Usage History Component

```typescript
// app/components/billing/UsageHistory.tsx
interface UsageHistoryProps {
  generations: Array<{
    id: string;
    name: string;
    createdAt: Date;
    wasOverage: boolean;
  }>;
}

export function UsageHistory({ generations }: UsageHistoryProps) {
  if (generations.length === 0) {
    return (
      <s-empty-state heading="No generations yet">
        <s-paragraph>Start generating sections to see your usage history.</s-paragraph>
      </s-empty-state>
    );
  }

  return (
    <s-section heading="Recent Generations">
      <s-box border="base" borderRadius="base" padding="none">
        {generations.slice(0, 10).map((gen, idx) => (
          <s-grid
            key={gen.id}
            gridTemplateColumns="1fr auto auto"
            alignItems="center"
            padding="base"
            style={{ borderBottom: idx < 9 ? "1px solid var(--s-border-color-base)" : "none" }}
          >
            <s-text>{gen.name}</s-text>
            <s-text color="subdued">
              {new Date(gen.createdAt).toLocaleDateString()}
            </s-text>
            {gen.wasOverage && <s-badge tone="warning">Overage</s-badge>}
          </s-grid>
        ))}
      </s-box>
    </s-section>
  );
}
```

### 5. Update Loader with Stats

```typescript
// app/routes/app.billing.tsx
import { getUsageStats } from "../services/usage-analytics.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const [plans, subscription, quota, stats] = await Promise.all([
    getActivePlans(),
    getSubscription(session.shop),
    checkQuota(session.shop),
    getUsageStats(session.shop),
  ]);

  return { plans, subscription, quota, stats, shop: session.shop };
}
```

### 6. Enhance Alert Banner with Thresholds

```typescript
// app/components/billing/UsageAlertBanner.tsx
const thresholds = [
  { percent: 50, tone: "info", message: "You've used half your monthly quota" },
  { percent: 75, tone: "warning", message: "You're approaching your quota limit" },
  { percent: 90, tone: "critical", message: "Almost at quota - overages will apply soon" },
];

export function UsageAlertBanner({ quota, onUpgradeClick }: UsageAlertBannerProps) {
  const percentUsed = (quota.usageThisCycle / quota.includedQuota) * 100;
  const threshold = thresholds.reverse().find(t => percentUsed >= t.percent);

  if (!threshold) return null;

  return (
    <s-banner tone={threshold.tone}>
      <s-paragraph>{threshold.message}</s-paragraph>
      <s-button slot="actions" variant="secondary" onClick={onUpgradeClick}>
        Upgrade Plan
      </s-button>
    </s-banner>
  );
}
```

## Todo List

- [x] Create usage-analytics.server.ts with getUsageStats()
- [x] Create CostProjection component
- [x] Create UsageHistory component
- [x] Enhance UsageDashboard with stats prop
- [x] Add threshold markers to QuotaProgressBar
- [x] Update UsageAlertBanner for multi-threshold
- [x] Update billing loader with stats data
- [x] Add index exports for new components
- [ ] Test with varying usage levels
- [ ] Fix overage detection logic (High Priority #2 from code review)
- [ ] Add try/catch to localStorage (Medium Priority #7 from code review)

## Success Criteria

1. ✅ Dashboard shows real-time usage count
2. ✅ Overage costs displayed clearly
3. ✅ Projection shows estimated month-end cost
4. ⚠️ Recent generations listed with overage badges (bug in overage detection logic)
5. ✅ Alerts fire at 50%, 75%, 90% usage
6. ✅ Upgrade CTA visible when approaching limits

## Implementation Status

**Status**: ✅ Implementation Complete (with bugs to fix)

**Completed**: 2026-01-06

**Code Review**: See [code-reviewer-260106-1055-phase3-usage-dashboard.md](../reports/code-reviewer-260106-1055-phase3-usage-dashboard.md)

**Critical Issues Found**:
1. **High Priority #2**: Overage detection logic marks first N items instead of most recent N (functional bug)
2. **Medium Priority #7**: localStorage operations lack error handling (crash risk in private browsing)

**Next Steps**:
1. Fix overage detection in `usage-analytics.server.ts` before merging
2. Add error handling to localStorage operations
3. Consider optimizations from code review (parallel queries, better trend calculation)
4. Add unit tests for usage analytics service
