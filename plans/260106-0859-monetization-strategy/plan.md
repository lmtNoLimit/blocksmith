---
title: "Blocksmith Monetization Strategy"
description: "Tiered subscription pricing with free trial, feature gating, and usage dashboard"
status: pending
priority: P1
effort: 16h
branch: main
tags: [monetization, billing, pricing, shopify]
created: 2026-01-06
---

## Overview

Implement hybrid monetization: 3 tiers (Free/Pro/Agency) + usage-based overages. Research shows:
- 92% of AI SaaS uses hybrid pricing; 45.7% of Shopify apps offer free trials
- Avoid $25-50 churn zone (8.7% monthly churn); position at $29 entry or $79+ commitment
- Free tier critical for adoption on Shopify marketplace

## Pricing Strategy

| Tier | Price | Generations | Key Features |
|------|-------|-------------|--------------|
| **Free** | $0 | 5/mo | Basic preview, draft-only saves, 3 chat refinement turns, email support |
| **Pro** | $29/mo | 30/mo | Live preview (18 context drops), publish to theme, unlimited chat refinement, priority support |
| **Agency** | $79/mo | 100/mo | All Pro + team seats (3), unlimited refinement, batch generation, custom templates |
| **Overage** | $2/gen | - | Beyond tier limit (capped at $50/mo) |

**Free Trial**: 7 days Pro-tier access, 10 generations max.

## Phase Summary

| Phase | Title | Effort | Dependencies |
|-------|-------|--------|--------------|
| [Phase 1](phase-01-pricing-config.md) | Pricing Configuration | 3h | None |
| [Phase 2](phase-02-feature-gating.md) | Feature Gating | 5h | Phase 1 |
| [Phase 3](phase-03-usage-dashboard.md) | Usage Dashboard | 4h | Phase 1 |
| [Phase 4](phase-04-trial-flow.md) | Free Trial Flow | 4h | Phase 1, 2 |

## Existing Infrastructure (Leverage)

- `billing.server.ts`: subscription create/cancel, usage recording, quota check
- `PlanConfiguration` model: already supports tiers with features array
- `UsageDashboard`, `PlanSelector`, `UsageAlertBanner` components
- Webhook handler for subscription status updates

## Key Files to Modify

```
prisma/schema.prisma          # Add featureFlags to PlanConfiguration
app/services/billing.server.ts # Feature gate helpers, trial logic
app/types/billing.ts          # FeatureGate enum, trial types
app/routes/app.billing.tsx    # Enhanced UI with trial banner
app/components/billing/*      # Dashboard enhancements
```

## Success Criteria

1. Free tier blocks paid-only features (live preview, publish)
2. Pro/Agency tiers unlock features based on plan config
3. Usage dashboard shows real-time consumption + overage projections
4. 7-day free trial auto-starts on first install
5. Plan upgrade/downgrade flows functional

## Unresolved Questions

1. What Gemini API cost per generation to set accurate overage pricing?

---

## Validation Summary

**Validated:** 2026-01-06
**Questions asked:** 8

### Confirmed Decisions

| Decision | Choice |
|----------|--------|
| Target segment | All segments (Shopify-style tiering: Basic/Pro/Agency) |
| Free tier limits | 5 gens/mo, draft-only (no publish) |
| Free tier refinement | 3 chat turns (updated from 0) |
| Pro/Agency refinement | Unlimited (updated from 5/unlimited) |
| Trial extension | No extension; hard limit at 10 gens |
| Enterprise tier | Not for MVP; 3 tiers sufficient |
| Annual discount | Yes, 20% annual discount |
| Overage pricing | $2/gen with $50/mo cap |
| Free tier watermark | No watermark; clean code output |

### Action Items

- [x] Update pricing table: Free tier gets 3 refinement turns
- [x] Update pricing table: Pro tier gets unlimited refinement
- [ ] Update phase-02 feature gating: Change refinement limits to 3/∞/∞
- [ ] Add annual billing option to Phase 1 pricing config
- [ ] Document 20% annual discount in seed data
