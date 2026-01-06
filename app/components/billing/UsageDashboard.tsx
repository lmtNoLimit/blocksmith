/**
 * Usage Dashboard Component
 * Shows quota usage, progress bars, cost breakdown, projections, and history
 */

import { QuotaProgressBar } from "./QuotaProgressBar";
import { CostProjection } from "./CostProjection";
import { UsageHistory } from "./UsageHistory";
import type { QuotaCheck, Subscription } from "../../types/billing";
import type { UsageStats } from "../../services/usage-analytics.server";

interface UsageDashboardProps {
  quota: QuotaCheck;
  subscription: Subscription | null;
  stats?: UsageStats;
}

export function UsageDashboard({ quota, subscription, stats }: UsageDashboardProps) {
  // Determine progress tone based on percentage
  const progressTone =
    quota.percentUsed >= 90 ? "critical" :
    quota.percentUsed >= 75 ? "warning" :
    "highlight";

  // Format date helper
  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate cost breakdown
  const overageCost = quota.overagesThisCycle * (subscription?.overagePrice ?? 0);
  const totalCost = (subscription?.basePrice ?? 0) + overageCost;

  return (
    <s-section heading="Usage This Month">
      <s-grid gap="base">
        {/* Two-column layout for main stats and projection */}
        <s-grid gap="base" gridTemplateColumns={stats ? "1fr 1fr" : "1fr"}>
          {/* Main Usage Card */}
          <s-box
            border="base"
            borderRadius="base"
            padding="base"
            background="subdued"
          >
            <s-grid gap="base">
              {/* Usage Progress */}
              <s-grid gap="small-200">
                <s-grid
                  gridTemplateColumns="1fr auto"
                  alignItems="baseline"
                >
                  <s-heading>Sections Generated</s-heading>
                  <s-text type="strong" fontVariantNumeric="tabular-nums">
                    {quota.usageThisCycle} / {quota.includedQuota}
                  </s-text>
                </s-grid>
                <QuotaProgressBar
                  used={quota.usageThisCycle}
                  included={quota.includedQuota}
                  tone={progressTone}
                  showThresholds
                />
              </s-grid>

              {/* Quota Breakdown */}
              <s-divider />
              <s-grid gap="small-200">
                <s-grid gridTemplateColumns="1fr auto">
                  <s-paragraph>Included sections</s-paragraph>
                  <s-text fontVariantNumeric="tabular-nums">{quota.includedQuota}</s-text>
                </s-grid>
                <s-grid gridTemplateColumns="1fr auto">
                  <s-paragraph>Sections used</s-paragraph>
                  <s-text fontVariantNumeric="tabular-nums">{Math.min(quota.usageThisCycle, quota.includedQuota)}</s-text>
                </s-grid>
                <s-grid gridTemplateColumns="1fr auto">
                  <s-paragraph color="subdued">Remaining</s-paragraph>
                  <s-text color="subdued" fontVariantNumeric="tabular-nums">
                    {Math.max(0, quota.includedQuota - quota.usageThisCycle)}
                  </s-text>
                </s-grid>

                {/* Overage (if applicable) */}
                {quota.overagesThisCycle > 0 && (
                  <>
                    <s-divider />
                    <s-grid gridTemplateColumns="1fr auto">
                      <s-paragraph>Overage sections</s-paragraph>
                      <s-text fontVariantNumeric="tabular-nums">{quota.overagesThisCycle}</s-text>
                    </s-grid>
                    <s-grid gridTemplateColumns="1fr auto">
                      <s-paragraph color="subdued">
                        Overage cost
                      </s-paragraph>
                      <s-text color="subdued" fontVariantNumeric="tabular-nums">
                        ${overageCost.toFixed(2)}
                      </s-text>
                    </s-grid>
                  </>
                )}
              </s-grid>

              {/* Billing Cycle Info */}
              {subscription && (
                <>
                  <s-divider />
                  <s-paragraph color="subdued">
                    Billing cycle ends: {formatDate(subscription.currentPeriodEnd)}
                  </s-paragraph>
                </>
              )}
            </s-grid>
          </s-box>

          {/* Cost Projection (if stats available) */}
          {stats && (
            <CostProjection
              estimatedTotal={stats.projection.estimatedTotal}
              estimatedCost={stats.projection.estimatedCost}
              daysRemaining={stats.projection.daysRemaining}
              trend={stats.trend}
              basePrice={subscription?.basePrice ?? 0}
            />
          )}
        </s-grid>

        {/* Cost Breakdown Card (if overage exists or show estimate) */}
        {subscription && (
          <s-box
            border="base"
            borderRadius="base"
            padding="base"
            background="base"
          >
            <s-grid gap="base">
              <s-heading>Estimated Total This Cycle</s-heading>
              <s-grid gap="small-200">
                <s-grid gridTemplateColumns="1fr auto">
                  <s-paragraph>Base plan</s-paragraph>
                  <s-text fontVariantNumeric="tabular-nums">${subscription.basePrice.toFixed(2)}</s-text>
                </s-grid>
                {quota.overagesThisCycle > 0 && (
                  <s-grid gridTemplateColumns="1fr auto">
                    <s-paragraph>Usage charges</s-paragraph>
                    <s-text fontVariantNumeric="tabular-nums">
                      ${overageCost.toFixed(2)}
                    </s-text>
                  </s-grid>
                )}
                <s-divider />
                <s-grid gridTemplateColumns="1fr auto">
                  <s-text type="strong">Total</s-text>
                  <s-text type="strong" fontVariantNumeric="tabular-nums">
                    ${totalCost.toFixed(2)}
                  </s-text>
                </s-grid>
              </s-grid>
              <s-paragraph color="subdued">
                Usage charges are billed at the end of your billing cycle.
              </s-paragraph>
            </s-grid>
          </s-box>
        )}

        {/* Usage History (if stats available) */}
        {stats && <UsageHistory generations={stats.recentGenerations} />}
      </s-grid>
    </s-section>
  );
}
