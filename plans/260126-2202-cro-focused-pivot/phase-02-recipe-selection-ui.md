---
title: "Phase 02: Recipe Selection UI"
status: completed
effort: 5h
dependencies: [phase-01]
completed_date: 2026-01-27T16:01:00Z
---

# Phase 02: Recipe Selection UI

**Parent Plan**: [CRO-Focused Pivot](./plan.md)
**Dependencies**: [Phase 01: Database & CRO Recipes](./phase-01-database-cro-recipes.md)

---

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-26 |
| Priority | P1 |
| Implementation Status | ✅ Completed (2026-01-27) |
| Review Status | ✅ Approved - Production Ready |
| Review Report | [code-reviewer-260127-1601-phase02-recipe-ui.md](../reports/code-reviewer-260127-1601-phase02-recipe-ui.md) |

---

## Key Insights (from Research)

- Polaris lacks dedicated Card component - use `s-grid + s-box + s-clickable`
- Selection handling via `s-choice-list` for radio-style single selection
- Container queries for responsive 4→2→1 column layout
- Visual feedback: border + background changes indicate selection
- Min touch target 44px (Polaris default padding provides this)

---

## Requirements

### Functional Requirements

1. Replace `PromptInput.tsx` with recipe card grid
2. 8 recipe cards with icon, name, description
3. Single selection (radio behavior)
4. Optional context step before generation
5. Responsive grid (4 cols desktop, 2 tablet, 1 mobile)

### Acceptance Criteria

- [x] `app.sections.new.tsx` displays recipe cards instead of prompt textarea ✅
- [x] Clicking card selects it (visual feedback: border/background change) ✅
- [x] Selected recipe passed to action for section creation ✅
- [x] Optional context modal/form appears after selection ✅
- [x] Skip context option available ✅
- [x] Keyboard navigation works (Tab, Enter, Space) ✅
- [x] Screen reader announces recipe name + description ✅

---

## Architecture

### Component Structure

```
app/routes/app.sections.new.tsx
├── RecipeSelector.tsx (new)
│   ├── RecipeCard.tsx (new)
│   └── RecipeContextModal.tsx (new)
└── Remove: PromptInput.tsx, TemplateSuggestions.tsx
```

### Polaris Component Stack

| Purpose | Component |
|---------|-----------|
| Grid layout | `s-grid` with container queries |
| Card wrapper | `s-box` (border, padding, borderRadius) |
| Clickable area | `s-clickable` wrapping s-box |
| Selection state | `s-choice-list` (radio behavior) |
| Icon display | `s-icon` |
| Text | `s-heading` (level 3), `s-text` (subdued) |

---

## Related Code Files

| File | Action | Purpose |
|------|--------|---------|
| `app/routes/app.sections.new.tsx` | Modify | Replace with recipe UI |
| `app/components/generate/PromptInput.tsx` | Remove | Replaced by recipes |
| `app/components/generate/TemplateSuggestions.tsx` | Remove | Merged into recipes |
| `app/components/generate/RecipeSelector.tsx` | Create | Recipe grid component |
| `app/components/generate/RecipeCard.tsx` | Create | Individual card component |
| `app/components/generate/RecipeContextModal.tsx` | Create | Optional context form |

---

## Implementation Steps

### Step 1: Create RecipeCard Component (45 min)

`app/components/generate/RecipeCard.tsx`:
```tsx
interface RecipeCardProps {
  recipe: CRORecipe;
  isSelected: boolean;
  onSelect: (slug: string) => void;
}
```

Structure:
```html
<s-clickable onClick={() => onSelect(recipe.slug)}>
  <s-box
    border="base"
    borderRadius="base"
    padding="base"
    background={isSelected ? "strong" : "subdued"}
  >
    <s-stack gap="small" alignItems="center">
      <s-icon source={recipe.icon} />
      <s-heading level="3">{recipe.name}</s-heading>
      <s-text type="subdued">{recipe.businessProblem}</s-text>
    </s-stack>
  </s-box>
  <s-choice
    id={`recipe-${recipe.slug}`}
    accessibilityLabel={recipe.name}
    accessibilityVisibility="exclusive"
  />
</s-clickable>
```

### Step 2: Create RecipeSelector Component (60 min)

`app/components/generate/RecipeSelector.tsx`:
```tsx
interface RecipeSelectorProps {
  recipes: CRORecipe[];
  onRecipeSelect: (recipe: CRORecipe) => void;
}
```

Features:
- Fetch recipes from loader
- Manage selected state
- Render responsive grid
- Handle selection changes
- Trigger context modal on Continue

Grid layout:
```html
<s-choice-list name="selectedRecipe" value={selectedSlug}>
  <s-grid
    gridTemplateColumns="@container (inline-size > 1200px) repeat(4, 1fr),
                         @container (inline-size > 768px) repeat(2, 1fr),
                         1fr"
    gap="base"
  >
    {recipes.map(recipe => (
      <s-grid-item key={recipe.slug}>
        <RecipeCard ... />
      </s-grid-item>
    ))}
  </s-grid>
</s-choice-list>
```

### Step 3: Create RecipeContextModal Component (45 min)

`app/components/generate/RecipeContextModal.tsx`:
- Modal with context questions from recipe.contextQuestions
- Dynamic fields based on recipe (product type, price range, etc.)
- Skip button + Continue button
- Returns context object

Example context questions:
```typescript
[
  { field: 'productType', label: 'Product Type', options: ['Physical', 'Digital', 'Service'] },
  { field: 'priceRange', label: 'Price Range', options: ['Under $50', '$50-$200', 'Over $200'] }
]
```

### Step 4: Update app.sections.new.tsx (90 min)

Replace current flow:
1. Remove PromptInput, TemplateSuggestions
2. Add loader to fetch active recipes
3. Render RecipeSelector
4. Handle selection → context modal → form submission
5. Update action to accept recipe slug + context

Loader:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const recipes = await getActiveRecipes();
  return json({ recipes });
}
```

Action modification:
```typescript
const recipeSlug = formData.get('recipeSlug') as string;
const recipeContext = formData.get('recipeContext') as string;
const recipe = await getRecipeBySlug(recipeSlug);
const prompt = buildRecipePrompt(recipe, JSON.parse(recipeContext || '{}'));
```

### Step 5: Remove Deprecated Components (15 min)

- Delete `app/components/generate/PromptInput.tsx`
- Delete `app/components/generate/TemplateSuggestions.tsx`
- Delete `app/components/generate/PromptExamples.tsx`
- Update any imports

### Step 6: Add Selection State Styling (30 min)

CSS-in-JS or inline styles for:
- Selected card: `background="strong"` + `borderColor="strong"`
- Hover state: Subtle background change
- Focus ring: Handled by Polaris automatically
- Transition: Smooth 150ms for background/border

### Step 7: Accessibility Testing (30 min)

Verify:
- [ ] Tab through all 8 cards
- [ ] Enter/Space selects card
- [ ] Screen reader announces name + description
- [ ] Touch targets minimum 44px
- [ ] Focus ring visible on all cards

---

## Success Criteria

1. Recipe cards display in responsive grid
2. Single selection works with visual feedback
3. Optional context modal appears after selection
4. Form submission includes recipe slug + context
5. Keyboard navigation functional
6. Screen reader announces correctly
7. No TypeScript errors

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Polaris component API changes | Low | Medium | Pin Polaris version, test thoroughly |
| Container queries not supported | Low | Low | Fallback to media queries |
| Icon names mismatch | Medium | Low | Verify icons in Phase 1 seed |
| Context modal UX confusion | Medium | Medium | Add clear Skip option, minimal fields |
