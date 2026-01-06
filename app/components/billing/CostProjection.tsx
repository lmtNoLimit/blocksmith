/**
 * Cost Projection Component
 * Displays estimated usage and costs for the current billing cycle
 */

interface CostProjectionProps {
  estimatedTotal: number;
  estimatedCost: number;
  daysRemaining: number;
  trend: "increasing" | "stable" | "decreasing";
  basePrice: number;
}

export function CostProjection({
  estimatedTotal,
  estimatedCost,
  daysRemaining,
  trend,
  basePrice,
}: CostProjectionProps) {
  const trendTone =
    trend === "increasing" ? "warning" :
    trend === "decreasing" ? "success" :
    "info";

  const trendLabel =
    trend === "increasing" ? "Usage increasing" :
    trend === "decreasing" ? "Usage decreasing" :
    "Usage stable";

  const estimatedOverageCost = Math.max(0, estimatedCost - basePrice);

  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack gap="base">
        <s-grid gridTemplateColumns="1fr auto" alignItems="center">
          <s-heading>Projected Usage</s-heading>
          <s-badge tone={trendTone}>{trendLabel}</s-badge>
        </s-grid>

        <s-grid gap="small-200">
          <s-grid gridTemplateColumns="1fr auto">
            <s-paragraph color="subdued">Est. generations</s-paragraph>
            <s-text type="strong" fontVariantNumeric="tabular-nums">
              {estimatedTotal}
            </s-text>
          </s-grid>

          <s-grid gridTemplateColumns="1fr auto">
            <s-paragraph color="subdued">Est. total cost</s-paragraph>
            <s-text type="strong" fontVariantNumeric="tabular-nums">
              ${estimatedCost.toFixed(2)}
            </s-text>
          </s-grid>

          {estimatedOverageCost > 0 && (
            <s-grid gridTemplateColumns="1fr auto">
              <s-paragraph color="subdued">Est. overage charges</s-paragraph>
              <s-text fontVariantNumeric="tabular-nums">
                ${estimatedOverageCost.toFixed(2)}
              </s-text>
            </s-grid>
          )}

          <s-divider />

          <s-grid gridTemplateColumns="1fr auto">
            <s-paragraph color="subdued">Days remaining</s-paragraph>
            <s-text fontVariantNumeric="tabular-nums">{daysRemaining}</s-text>
          </s-grid>
        </s-grid>

        <s-paragraph color="subdued">
          Based on your current usage pattern this billing cycle.
        </s-paragraph>
      </s-stack>
    </s-box>
  );
}
