/**
 * Trial Banner Component
 *
 * Shows countdown and usage for trial users.
 * Becomes urgent when days <= 2 or usage remaining <= 2.
 */

interface TrialBannerProps {
  daysRemaining: number;
  usageRemaining: number;
  maxUsage: number;
  onUpgrade: () => void;
}

export function TrialBanner({
  daysRemaining,
  usageRemaining,
  maxUsage,
  onUpgrade,
}: TrialBannerProps) {
  const isUrgent = daysRemaining <= 2 || usageRemaining <= 2;
  const usageCount = maxUsage - usageRemaining;

  // Format days text
  const daysText = daysRemaining === 1 ? "1 day" : `${daysRemaining} days`;

  return (
    <s-banner tone={isUrgent ? "warning" : "info"}>
      <s-grid gap="small-200">
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-text>
            <s-text type="strong">Free Trial</s-text>
            {" "}{daysText} left • {usageCount}/{maxUsage} generations used
          </s-text>
        </s-stack>

        <s-stack direction="inline" gap="small-200">
          <s-button
            variant={isUrgent ? "primary" : "secondary"}
            onClick={onUpgrade}
            accessibilityLabel="Upgrade to keep all features"
          >
            Upgrade Now
          </s-button>
          {usageRemaining === 0 && (
            <s-text color="subdued">
              Trial generations exhausted. Upgrade to continue.
            </s-text>
          )}
        </s-stack>
      </s-grid>
    </s-banner>
  );
}
