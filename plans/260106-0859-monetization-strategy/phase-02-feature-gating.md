# Phase 2: Feature Gating

## Context

- [Plan Overview](plan.md)
- Depends on: [Phase 1 - Pricing Config](phase-01-pricing-config.md)

## Overview

Implement feature gating by plan tier. Free users see limited functionality; Pro/Agency unlock advanced features. Gate enforcement happens at service + UI layers.

**Effort**: 5 hours

## Requirements

1. Service-level feature checks before operations
2. UI-level gating (hide/disable features)
3. Upgrade prompts when hitting limits
4. Clear messaging on feature availability

## Feature Gates by Tier

| Feature | Free | Pro | Agency |
|---------|------|-----|--------|
| Section generation | 5/mo | 30/mo | 100/mo |
| Live preview (Shopify context) | No | Yes | Yes |
| Publish to theme | No | Yes | Yes |
| Chat refinement turns | 0 | 5 | Unlimited |
| Team seats | 1 | 1 | 3 |
| Batch generation | No | No | Yes |
| Custom templates | No | No | Yes |

## Related Code Files

| File | Purpose |
|------|---------|
| `app/services/billing.server.ts` | Add hasFeature(), getRefinementLimit() |
| `app/services/feature-gate.server.ts` | New: centralized gate logic |
| `app/routes/app.sections.$id.tsx` | Gate publish button, refinement turns |
| `app/routes/api.preview.render.tsx` | Gate live preview |
| `app/components/billing/UpgradePrompt.tsx` | New: upgrade modal component |
| `app/components/sections/SaveActions.tsx` | Gate publish vs draft |

## Implementation Steps

### 1. Create Feature Gate Service

```typescript
// app/services/feature-gate.server.ts
import { getPlanConfig, getSubscription } from "./billing.server";
import type { FeatureFlag, PlanTier } from "../types/billing";

export async function hasFeature(shop: string, feature: FeatureFlag): Promise<boolean> {
  const subscription = await getSubscription(shop);
  const planName: PlanTier = subscription?.planName ?? "free";
  const plan = await getPlanConfig(planName);
  return plan.featureFlags.includes(feature);
}

export async function getRefinementLimit(shop: string): Promise<number> {
  const subscription = await getSubscription(shop);
  if (!subscription) return 0;
  if (subscription.planName === "agency") return Infinity;
  if (subscription.planName === "pro") return 5;
  return 0;
}

export async function getTeamSeatLimit(shop: string): Promise<number> {
  const subscription = await getSubscription(shop);
  if (subscription?.planName === "agency") return 3;
  return 1;
}

export interface FeatureGateResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: PlanTier;
}

export async function checkFeatureAccess(
  shop: string,
  feature: FeatureFlag
): Promise<FeatureGateResult> {
  const hasAccess = await hasFeature(shop, feature);
  if (hasAccess) return { allowed: true };

  const subscription = await getSubscription(shop);
  const currentPlan = subscription?.planName ?? "free";

  // Determine minimum required plan
  const requiredPlan = getRequiredPlan(feature);

  return {
    allowed: false,
    reason: `${feature} requires ${requiredPlan} plan`,
    upgradeRequired: requiredPlan,
  };
}

function getRequiredPlan(feature: FeatureFlag): PlanTier {
  const agencyOnly: FeatureFlag[] = ["team_seats", "batch_generation", "custom_templates"];
  return agencyOnly.includes(feature) ? "agency" : "pro";
}
```

### 2. Gate Live Preview

```typescript
// app/routes/api.preview.render.tsx - loader
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  // Check feature access
  const canUseLivePreview = await hasFeature(session.shop, "live_preview");

  if (!canUseLivePreview) {
    // Return basic preview (no Shopify context)
    return json({
      html: renderBasicPreview(code),
      mode: "basic",
      upgradeRequired: "pro"
    });
  }

  // Full live preview with Shopify context
  // ... existing implementation
}
```

### 3. Gate Publish Action

```typescript
// app/routes/app.sections.$id.tsx - action
if (intent === "save-to-theme") {
  const canPublish = await hasFeature(session.shop, "publish_theme");
  if (!canPublish) {
    return json({
      error: "Publishing to theme requires Pro plan",
      upgradeRequired: "pro"
    }, { status: 403 });
  }
  // ... existing publish logic
}
```

### 4. Create Upgrade Prompt Component

```typescript
// app/components/billing/UpgradePrompt.tsx
interface UpgradePromptProps {
  feature: string;
  requiredPlan: PlanTier;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function UpgradePrompt({ feature, requiredPlan, onUpgrade, onDismiss }: UpgradePromptProps) {
  return (
    <s-modal heading={`Upgrade to ${requiredPlan}`} open>
      <s-stack gap="base">
        <s-paragraph>
          <s-text type="strong">{feature}</s-text> is available on {requiredPlan} and higher plans.
        </s-paragraph>
        <s-banner tone="info">
          <s-paragraph>Upgrade now to unlock advanced features and increase your generation limit.</s-paragraph>
        </s-banner>
      </s-stack>
      <s-button slot="primary-action" variant="primary" onClick={onUpgrade}>
        View Plans
      </s-button>
      <s-button slot="secondary-actions" variant="secondary" onClick={onDismiss}>
        Maybe Later
      </s-button>
    </s-modal>
  );
}
```

### 5. Update Save Actions UI

```typescript
// app/components/sections/SaveActions.tsx
export function SaveActions({ canPublish, onSaveDraft, onPublish }) {
  return (
    <s-stack direction="inline" gap="base">
      <s-button variant="secondary" onClick={onSaveDraft}>
        Save Draft
      </s-button>
      {canPublish ? (
        <s-button variant="primary" onClick={onPublish}>
          Publish to Theme
        </s-button>
      ) : (
        <s-tooltip content="Upgrade to Pro to publish directly to your theme">
          <s-button variant="primary" disabled>
            Publish to Theme
          </s-button>
        </s-tooltip>
      )}
    </s-stack>
  );
}
```

### 6. Gate Chat Refinement

Track refinement count per section; block when limit reached:

```typescript
// In chat stream handler
const refinementCount = await getConversationMessageCount(conversationId);
const limit = await getRefinementLimit(session.shop);

if (refinementCount >= limit) {
  return json({
    error: "Refinement limit reached",
    limit,
    upgradeRequired: subscription?.planName === "pro" ? "agency" : "pro"
  }, { status: 403 });
}
```

## Todo List

- [x] Create `feature-gate.server.ts` with hasFeature(), checkFeatureAccess()
- [x] Add featureFlags query to getPlanConfig()
- [x] Gate live preview in api.preview.render.tsx
- [x] Gate publish action in app.sections.$id.tsx
- [x] Create UpgradePrompt component (created but not wired up - using inline tooltips instead)
- [x] Update SaveActions with canPublish prop (inline tooltip approach used)
- [x] Add refinement limit check to chat stream
- [x] Test free -> pro -> agency upgrade paths (21 unit tests, all passing)
- [x] Add feature gate tests (100% pass rate)

**Status**: ✅ Phase 2 Complete (2026-01-06)
**Report**: [code-reviewer-260106-0953-phase2-feature-gating.md](../reports/code-reviewer-260106-0953-phase2-feature-gating.md)

## Success Criteria

1. Free users cannot access live preview (basic HTML only)
2. Free users can only save drafts, not publish
3. Free users see upgrade prompts when hitting limits
4. Pro users can publish but hit refinement cap at 5
5. Agency users have unlimited refinement
6. All gate checks return clear error messages
