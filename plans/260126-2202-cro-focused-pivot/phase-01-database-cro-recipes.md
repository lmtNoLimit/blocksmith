---
title: "Phase 01: Database & CRO Recipes"
status: completed
effort: 3h
dependencies: none
completed_date: 2026-01-27T15:25:00Z
---

# Phase 01: Database & CRO Recipes

**Parent Plan**: [CRO-Focused Pivot](./plan.md)
**Dependencies**: None (foundation phase)

---

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-26 |
| Priority | P1 |
| Implementation Status | ✅ Completed (2026-01-27) |
| Review Status | ✅ Approved - Production Ready |
| Review Report | [code-reviewer-260127-1521-phase01-cro-database.md](../reports/code-reviewer-260127-1521-phase01-cro-database.md) |

---

## Key Insights (from Research)

- Store recipes in database for A/B testing and iteration without deploys
- Each recipe needs: business problem, CRO principles, prompt template, context questions
- 8 core recipes cover highest-impact conversion problems
- Recipe quality directly determines pivot success

---

## Requirements

### Functional Requirements

1. CRORecipe Prisma model with all fields from brainstorm
2. Seed script populating 8 recipes with CRO-researched content
3. Service layer for CRUD operations
4. API endpoint to fetch active recipes

### Acceptance Criteria

- [x] `CRORecipe` model defined in `prisma/schema.prisma` ✅
- [x] Seed data includes all 8 recipes with complete prompts ✅
- [x] `cro-recipe.server.ts` service exports `getActiveRecipes()`, `getRecipeBySlug()` ✅
- [x] Each recipe includes `promptTemplate` with CRO principle placeholders ✅
- [x] Migration runs without errors ✅

---

## Architecture

### Data Model

```prisma
model CRORecipe {
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique
  icon              String   // Polaris icon name
  businessProblem   String
  croPrinciples     String[] // e.g., ["urgency", "trust", "scarcity"]
  promptTemplate    String   @db.Text
  requiredElements  String[] // e.g., ["cta", "testimonial", "guarantee"]
  contextQuestions  Json?    // Optional: {field, label, options}[]
  active            Boolean  @default(true)
  order             Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Service Interface

```typescript
// app/services/cro-recipe.server.ts
export async function getActiveRecipes(): Promise<CRORecipe[]>
export async function getRecipeBySlug(slug: string): Promise<CRORecipe | null>
export async function buildRecipePrompt(recipe: CRORecipe, context?: RecipeContext): string
```

---

## Related Code Files

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add CRORecipe model |
| `prisma/seed.ts` | Modify | Add recipe seed data |
| `app/services/cro-recipe.server.ts` | Create | Service layer |
| `app/utils/prompt-templates.ts` | Reference | Migrate patterns to recipes |

---

## Implementation Steps

### Step 1: Add Prisma Model (15 min)
Add `CRORecipe` model to `prisma/schema.prisma` with all fields.

### Step 2: Create Migration (5 min)
```bash
npx prisma migrate dev --name add-cro-recipes
```

### Step 3: Create Seed Data (90 min)
Update `prisma/seed.ts` with 8 recipes. Each recipe needs:
- Name, slug, icon
- Business problem description
- CRO principles array
- Full prompt template (~200-400 chars)
- Required elements for validation
- Optional context questions

**Recipe Prompt Template Example (Cart Abandonment)**:
```
You are creating a Shopify section to REDUCE CART ABANDONMENT.

BUSINESS CONTEXT:
- Visitors add products to cart but don't complete purchase
- Goal: Recover abandoned carts via urgency and trust signals

CRO PRINCIPLES TO APPLY:
- URGENCY: Show scarcity (stock counts, time-limited offers)
- TRUST: Display guarantees, security badges, return policies
- SOCIAL PROOF: Recent purchases, customer reviews

REQUIRED ELEMENTS:
- Hero with cart item preview
- Trust row (guarantees, security, shipping info)
- Urgency indicator (stock count or time limit)
- Clear CTA button above the fold

{{CONTEXT}}
```

### Step 4: Create Service Layer (30 min)
Create `app/services/cro-recipe.server.ts`:
- `getActiveRecipes()` - fetch all active, ordered
- `getRecipeBySlug()` - fetch single by slug
- `buildRecipePrompt()` - inject context into template

### Step 5: Run Seed & Verify (15 min)
```bash
npx prisma db seed
```
Verify all 8 recipes exist with correct data.

---

## Recipe Seed Data Reference

| Slug | Icon | CRO Principles |
|------|------|----------------|
| `cart-abandonment` | CartIcon | urgency, trust, scarcity |
| `high-ticket-trust` | ShieldIcon | authority, social-proof |
| `page-engagement` | ViewIcon | visual-hierarchy, f-pattern |
| `email-signup` | EmailIcon | value-exchange, micro-commitment |
| `upsell-crosssell` | PlusIcon | anchoring, bundle-psychology |
| `promotion-highlight` | DiscountIcon | scarcity, contrast |
| `homepage-conversion` | HomeIcon | clear-cta, progressive-disclosure |
| `objection-handling` | QuestionIcon | objection-reversal, guarantees |

---

## Success Criteria

1. ✅ `CRORecipe` model exists and migrates cleanly
2. ✅ All 8 recipes seeded with complete data (verified execution)
3. ✅ `getActiveRecipes()` returns ordered list
4. ✅ Prompt templates include CRO principles and required elements
5. ✅ No TypeScript errors in service layer (typecheck passed)

---

## Implementation Complete

**Date Completed**: 2026-01-27
**Files Modified**:
- `prisma/schema.prisma` (+20 lines, model added)
- `prisma/seed-cro-recipes.ts` (328 lines, new file)
- `app/services/cro-recipe.server.ts` (128 lines, new file)

**Validation Results**:
- ✅ Seed script executed successfully (8 recipes created)
- ✅ TypeScript typecheck: 0 errors
- ✅ Build: Passed (625.74 kB server bundle)
- ✅ Prisma schema validation: Passed
- ✅ Security review: 0 critical issues
- ✅ Performance: Optimal indexes

**Code Review**: ✅ **APPROVED FOR PRODUCTION**

**Optional Improvements** (non-blocking):
1. Integrate seed script into main `prisma db seed` workflow
2. Add error handling to service layer functions
3. Add JSDoc comments for better IDE support

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Prompt quality insufficient | Medium | High | Research-backed templates from CRO report | ✅ Mitigated |
| Icon names invalid | Low | Low | Verify against Polaris icon library | ⚠️ To verify in Phase 02 |
| Migration conflicts | Low | Medium | Test on fresh database first | ✅ No conflicts |

---

## Next Steps

**Ready for Phase 02**: Recipe Selection UI
- Use `getActiveRecipes()` in loader
- Display recipes with Polaris `Card` or `ResourceList`
- Sanitize context inputs with existing `input-sanitizer.ts`
- Reference: [phase-02-recipe-selection-ui.md](./phase-02-recipe-selection-ui.md)
