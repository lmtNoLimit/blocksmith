/**
 * Upgrade Prompt Component
 *
 * Modal/banner prompting users to upgrade their plan to access gated features.
 * Used throughout the app when users hit feature limits.
 */

import type { PlanTier } from "../../types/billing";

interface UpgradePromptProps {
  /** Feature name that triggered the prompt */
  feature: string;
  /** Minimum plan required for the feature */
  requiredPlan: PlanTier;
  /** Navigate to billing page */
  onUpgrade: () => void;
  /** Dismiss the prompt */
  onDismiss: () => void;
  /** Display mode */
  variant?: "modal" | "banner";
  /** Modal ID for triggering */
  modalId?: string;
}

/**
 * Plan display names for UI
 */
const PLAN_NAMES: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  agency: "Agency",
};

/**
 * Feature descriptions for upgrade prompts
 */
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  publish_theme: "Publish sections directly to your Shopify theme",
  chat_refinement: "Refine your sections with AI-powered follow-up prompts",
  team_seats: "Invite team members to collaborate",
  batch_generation: "Generate multiple sections at once",
  custom_templates: "Create custom templates for your brand",
};

/**
 * Upgrade prompt modal for gated features
 */
export function UpgradePrompt({
  feature,
  requiredPlan,
  onUpgrade,
  onDismiss,
  variant = "modal",
  modalId = "upgrade-prompt-modal",
}: UpgradePromptProps) {
  const planName = PLAN_NAMES[requiredPlan];
  const description = FEATURE_DESCRIPTIONS[feature] || `${feature} is a premium feature`;

  if (variant === "banner") {
    return (
      <s-banner tone="info" dismissible onDismiss={onDismiss}>
        <s-stack gap="small">
          <s-text type="strong">{feature} requires {planName} plan</s-text>
          <s-text>{description}</s-text>
          <s-button variant="primary" onClick={onUpgrade}>
            View Plans
          </s-button>
        </s-stack>
      </s-banner>
    );
  }

  return (
    <s-modal id={modalId} heading={`Upgrade to ${planName}`}>
      <s-stack gap="base">
        <s-text>
          <s-text type="strong">{feature}</s-text> is available on {planName} and higher plans.
        </s-text>
        <s-text tone="neutral">{description}</s-text>
        <s-banner tone="info">
          <s-text>
            Upgrade now to unlock advanced features and increase your generation limit.
          </s-text>
        </s-banner>
      </s-stack>
      <s-button
        slot="secondary-actions"
        variant="secondary"
        commandFor={modalId}
        command="--hide"
        onClick={onDismiss}
      >
        Maybe Later
      </s-button>
      <s-button slot="primary-action" onClick={onUpgrade}>
        View Plans
      </s-button>
    </s-modal>
  );
}

/**
 * Inline upgrade prompt for disabled buttons
 */
export function UpgradeTooltip({
  feature,
  requiredPlan,
  children,
  tooltipId = "upgrade-tooltip",
}: {
  feature: string;
  requiredPlan: PlanTier;
  children: React.ReactNode;
  tooltipId?: string;
}) {
  const planName = PLAN_NAMES[requiredPlan];
  return (
    <s-tooltip id={tooltipId}>
      <span slot="content">Upgrade to {planName} to {feature.toLowerCase()}</span>
      {children}
    </s-tooltip>
  );
}
