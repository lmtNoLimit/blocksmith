---
title: "Template Pre-Built Liquid Enhancement"
description: "AI pre-generation of 102 Shopify Liquid templates for instant merchant use"
status: in-progress
phase-02-completed: 2026-01-10
phase-03-completed: 2026-01-10
priority: P1
effort: 8h
branch: main
tags: [templates, ai, liquid, shopify]
created: 2026-01-10
phase-01-completed: 2026-01-10
---

# Template Pre-Built Liquid Enhancement

## Overview

Pre-generate Liquid code for all 102 templates using Gemini AI. Currently only 3/102 templates have pre-built code. Goal: instant gratification - merchants click template, get working section immediately.

## Current State

- **102 templates** in `app/data/default-templates.ts`
- **3 templates** have `code` property (Hero w/ Background, Split Hero, Feature Grid)
- **99 templates** require AI generation on use
- Existing validation: 9 rules in `validation-rules.ts`

## Selected Approach

**AI Pre-Generation (Option B)** - batch generate via Gemini, validate, store as static code.

## Phase Summary

| Phase | Scope | Effort | Output |
|-------|-------|--------|--------|
| [Phase 1](./phase-01-batch-generation-script.md) | Batch Generation Script | 2.5h | `scripts/batch-generate-templates.ts` |
| [Phase 2](./phase-02-validation-system.md) | Validation Pipeline | 1.5h | `scripts/validate-templates.ts` |
| [Phase 3](./phase-03-template-integration.md) | Template Integration | 2h | Updated `default-templates.ts` |
| [Phase 4](./phase-04-ux-flow-updates.md) | UX Flow Updates | 2h | "Use As-Is" enabled for all |

## Phased Rollout

- **Phase 1 (32)**: Hero (12) + Features (12) + CTA (12) - high visibility
- **Phase 2 (32)**: Testimonials (12) + Pricing (10) + FAQ (10) - trust builders
- **Phase 3 (38)**: Team (10) + Gallery (12) + Content (12) + Footer (10) - supplementary

## Success Criteria

1. 100% of templates have valid pre-built Liquid code
2. All templates pass schema validation (9 rules)
3. "Use As-Is" button works for all templates
4. Preview renders correctly for all templates
5. Existing merchants receive updated templates via seeder

## Key Files

```
scripts/
  batch-generate-templates.ts   # New - AI generation
  validate-templates.ts         # New - validation pipeline
app/data/
  default-templates.ts          # Update - add code to 99 templates
app/services/
  template-seeder.server.ts     # Update - handle migrations
```

## Dependencies

- Gemini API key (`GEMINI_API_KEY`)
- Existing `AIService.generateSection()` method
- Existing `parseSchema()` and validation rules

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI generates invalid code | Medium | Low | Automated validation + retry |
| API rate limits | Low | Medium | Sequential processing, backoff |
| Schema parsing fails | Low | High | Existing validation rules |
| CSS conflicts with themes | Low | Medium | Scoped CSS with `ai-` prefix |

## Validation Summary

**Validated:** 2026-01-10
**Questions asked:** 7

### Confirmed Decisions

| Decision | User Choice | Impact |
|----------|-------------|--------|
| Rate limiting | Sequential 1 RPS | Safe for free tier, ~2-3 min total |
| URL length handling | Store code temporarily, pass ID | Handles >2KB templates via ?template_id= |
| Failure handling | Skip and log | Continue with valid templates, report failures |
| CSS naming | Section-name prefix | Match existing: hero-bg-, testimonial-, etc. |
| Migration strategy | Auto on visit | Seeder updates silently when shop accesses |
| Code format | Readable, <256KB | Human-readable with Shopify limit check |
| Size validation | Warn 200KB, reject 256KB | Hard size check during validation |

### Action Items (Plan Updates Needed)

- [ ] Phase 1: Add section-name CSS prefix pattern (not ai-)
- [ ] Phase 2: Add size validation rule (warn 200KB, reject 256KB)
- [ ] Phase 4: Implement temp storage for ?template_id= instead of ?code=

### Constraints Surfaced

- **Shopify limit**: 256KB per section file (typical templates 2-5KB, safe margin)
- **URL limit**: ~2000 chars max, need temp storage pattern for large templates

## Next Steps

1. Implement Phase 1: Batch generation script
2. Run on Phase 1 categories (32 templates)
3. Validate output, iterate on prompt engineering
4. Proceed to remaining phases
