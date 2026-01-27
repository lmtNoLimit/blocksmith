---
title: "CRO-Focused Pivot: Goal-Based Prompting"
description: "Replace blank canvas with CRO recipe cards for conversion-focused section generation"
status: in-progress
priority: P1
effort: 16h (3h complete, 13h remaining)
branch: main
tags: [cro, pivot, recipes, ui]
created: 2026-01-26
last_updated: 2026-01-27
---

# CRO-Focused Pivot: Goal-Based Prompting

## Problem
Current flow asks "What section do you want?" - assumes merchants know design solutions. Competitors saturate "section builder" space. Pivot to **goal-based prompting** that asks about business problems, not designs.

## Solution
Replace blank canvas with 8 CRO recipe cards. AI generates sections + explains WHY design choices work (CRO Reasoning panel).

## Execution Options

### Option A: Sequential (1 person/AI)
Total: 16h sequential

| # | Phase | Effort | Status | Description |
|---|-------|--------|--------|-------------|
| 1 | [Database & CRO Recipes](./phase-01-database-cro-recipes.md) | 3h | ✅ Complete | CRORecipe model, seed data, service layer |
| 2 | [Recipe Selection UI](./phase-02-recipe-selection-ui.md) | 5h | ⏳ Pending | Replace PromptInput with recipe cards grid |
| 3 | [AI CRO Integration](./phase-03-ai-cro-integration.md) | 4h | ⏳ Pending | Update prompts, structured reasoning output |
| 4 | [CRO Reasoning Panel](./phase-04-cro-reasoning-panel.md) | 4h | ⏳ Pending | New component showing design explanations |

### Option B: Parallel (2 people/AI) - RECOMMENDED
Total: 8h per track (50% faster)
See: [**parallel-plan.md**](./parallel-plan.md)

| Track | Phases | Owner | Effort |
|-------|--------|-------|--------|
| A: Data | Phase 1 + Phase 3 | Person/AI 1 | 7h |
| B: UI | Phase 2 + Phase 4 | Person/AI 2 | 8h |
| Merge | Integration | Both | 1h |

**Shared Contract**: [interface-contracts.md](./interface-contracts.md)

## 8 CRO Recipes

| Recipe | Business Problem | CRO Principle |
|--------|------------------|---------------|
| Reduce Cart Abandonment | Visitors add to cart but don't buy | Urgency + Trust |
| Build Trust (High-Ticket) | Expensive products don't convert | Social proof + Authority |
| Increase Page Engagement | Visitors bounce from product pages | Visual hierarchy + F-pattern |
| Drive Email Signups | Not capturing visitor emails | Value exchange + Micro-commitment |
| Upsell/Cross-sell | Low average order value | Anchoring + Bundle psychology |
| Highlight Promotions | Sales campaigns underperform | Scarcity + Contrast |
| Homepage Conversion | High traffic, low navigation | Clear CTA + Progressive disclosure |
| Address Objections | FAQ/returns questions kill deals | Objection reversal + Guarantees |

## User Flow

```
Step 1: Choose Goal → [8 Recipe Cards]
         ↓
Step 2: Quick Context (Optional) → Product type? Price range?
         ↓
Step 3: Generate → Live Preview + CRO Reasoning Panel
```

## Architecture

- **Storage**: MongoDB `cro-recipes` collection (updates without deploys)
- **UI**: Polaris s-grid + s-box + s-clickable (no Card component)
- **AI**: Gemini 2.5 Flash + CRO prompt injection + JSON reasoning
- **Reuse**: Chat refinement flow unchanged, editor layout extended

## Files to Modify

- `app/routes/app.sections.new.tsx` - Replace with recipe selection
- `app/services/ai.server.ts` - Add CRO prompt templates, reasoning output
- `app/utils/context-builder.ts` - Extend with recipe context
- `prisma/schema.prisma` - Add CRORecipe model

## Success Metrics

1. Section creation completion rate increases
2. Time to first section decreases
3. "CRO-powered" differentiation in app store

## Validation Summary

**Validated**: 2026-01-26
**Questions Asked**: 7

### Confirmed Decisions

| Decision | User Choice | Impact |
|----------|-------------|--------|
| Recipe analytics | Yes, store `croRecipeSlug` | Track conversions per recipe |
| Edge case fallback | Hidden 'advanced' mode | Link at bottom for power users |
| Context step | Show modal, easy skip | Low friction, optional context |
| Panel position | Right sidebar | Persistent visibility |
| Reasoning updates | Only on major regeneration | Stable reasoning, less token usage |
| Recipe count | 8 recipes confirmed | Quality over quantity |
| Seed quality | Research-backed, polished | Invest in prompt quality |

### Action Items (Plan Updates Needed)

- [ ] Phase 2: Add hidden "Advanced Mode" link below recipe cards
- [ ] Phase 2: Context modal with Skip/Continue buttons
- [ ] Phase 4: Reasoning updates only on regeneration (not every chat message)

### Resolved Questions

1. ~~Recipe selection persist for analytics?~~ → Yes, store croRecipeSlug
2. ~~Fallback for edge cases?~~ → Hidden advanced mode link
3. ~~Default context behavior?~~ → Modal with easy skip
