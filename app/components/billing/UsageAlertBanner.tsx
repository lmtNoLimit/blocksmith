/**
 * Multi-threshold usage alert banner
 * Shows alerts at 50%, 75%, 90% usage thresholds
 * Dismissible with local storage persistence per threshold
 */

import { useState, useEffect } from "react";
import type { QuotaCheck } from "../../types/billing";

interface UsageAlertBannerProps {
  quota: QuotaCheck;
  onUpgradeClick: () => void;
}

const THRESHOLDS = [
  { percent: 50, tone: "info" as const, message: "You've used half your monthly quota" },
  { percent: 75, tone: "warning" as const, message: "You're approaching your quota limit" },
  { percent: 90, tone: "critical" as const, message: "Almost at quota - overages will apply soon" },
];

export function UsageAlertBanner({ quota, onUpgradeClick }: UsageAlertBannerProps) {
  const [dismissedThreshold, setDismissedThreshold] = useState<number | null>(null);

  // Find the highest applicable threshold
  const activeThreshold = [...THRESHOLDS]
    .reverse()
    .find((t) => quota.percentUsed >= t.percent);

  // Load dismissed state from localStorage (wrapped in try/catch for private browsing)
  useEffect(() => {
    if (!activeThreshold) return;

    try {
      const key = `usage-alert-dismissed-${activeThreshold.percent}`;
      const isDismissed = localStorage.getItem(key) === "true";
      if (isDismissed) {
        setDismissedThreshold(activeThreshold.percent);
      } else {
        setDismissedThreshold(null);
      }
    } catch {
      // localStorage not available (private browsing) - show banner
      setDismissedThreshold(null);
    }
  }, [activeThreshold?.percent]);

  // Don't show if no threshold reached or dismissed
  if (!activeThreshold || dismissedThreshold === activeThreshold.percent) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedThreshold(activeThreshold.percent);
    try {
      const key = `usage-alert-dismissed-${activeThreshold.percent}`;
      localStorage.setItem(key, "true");
    } catch {
      // localStorage not available - dismiss for this session only
    }
  };

  const isCritical = activeThreshold.percent >= 90;
  const showUpgradeButton = activeThreshold.percent >= 75;

  return (
    <s-banner tone={activeThreshold.tone} onDismiss={handleDismiss}>
      <s-grid gap="small-200">
        <s-paragraph>
          {activeThreshold.message} ({Math.round(quota.percentUsed)}% used)
        </s-paragraph>

        {showUpgradeButton && (
          <s-stack direction="inline" gap="small-200">
            <s-button
              variant={isCritical ? "primary" : "secondary"}
              onClick={onUpgradeClick}
              accessibilityLabel="Upgrade your plan"
            >
              Upgrade Plan
            </s-button>
            <s-button variant="tertiary" href="/docs/billing">
              Learn more
            </s-button>
          </s-stack>
        )}
      </s-grid>
    </s-banner>
  );
}
