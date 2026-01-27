# Shopify Polaris Card Selection UI - Research Report

**Date**: 2026-01-26
**Project**: Blocksmith CRO Recipe Selection Pivot
**Status**: Research Complete

---

## Executive Summary

Shopify Polaris lacks a dedicated "Card" component for app-home extensions. Instead, use **s-grid + s-box + s-clickable** pattern to build selectable recipe cards. Combine with **s-choice-list** for accessible single/multi-select logic.

---

## 1. Recommended Component Stack

### Layout Foundation: s-grid
- **Purpose**: Organize 8 recipe cards in responsive 2-4 column layout
- **Properties**:
  - `gridTemplateColumns="repeat(4, 1fr)"` for desktop (4 cards)
  - `gridTemplateColumns="repeat(2, 1fr)"` for tablet (2 cards)
  - `gridTemplateColumns="1fr"` for mobile (1 card)
- **Responsive**: Use container queries: `@container (inline-size > 600px) repeat(4, 1fr), repeat(2, 1fr)`
- **Spacing**: `gap="base"` or `gap="large"` for visual breathing room

### Card Container: s-box
- **Purpose**: Card wrapper with borders, padding, background
- **Key Props**:
  - `border="base"` (gray outline)
  - `borderRadius="base"` (rounded corners)
  - `padding="base"` or `padding="large"`
  - `background="subdued"` (optional subtle background)

### Selection Pattern: s-clickable + Hidden s-choice
- **s-clickable**: Makes entire card tappable
- **s-choice** (hidden): Provides radio/checkbox state management
  - Use `accessibilityVisibility="exclusive"` to hide visually but keep for screen readers
  - Wraps the actual checkbox input

### Icon Display: s-icon
- **Purpose**: Recipe type/category visual indicator
- **Usage**: Place at card top or inline with title
- **Sizing**: Default size works; avoid custom CSS

### Text Elements: s-text, s-heading
- **Recipe name**: `s-heading` with level 3 or 4
- **Description**: `s-text` with optional `type="subdued"`

---

## 2. Architecture Pattern

### Single Selection (Radio-style)
```html
<s-choice-list name="recipe" value="">
  <!-- For each recipe: -->
  <s-grid-item>
    <s-clickable>
      <s-box border="base" borderRadius="base" padding="base">
        <s-stack gap="small">
          <!-- Card content -->
          <s-heading>Recipe Name</s-heading>
          <s-text type="subdued">Description</s-text>
        </s-stack>
      </s-box>
      <s-choice
        id="recipe-1"
        accessibilityLabel="Recipe name"
        accessibilityVisibility="exclusive" />
    </s-clickable>
  </s-grid-item>
</s-choice-list>
```

### Multiple Selection (Checkbox-style)
- Replace `s-choice-list` with individual `s-checkbox` per card
- Use `accessibilityVisibility="exclusive"` to hide checkbox visually
- Apply visual "selected" state via `background="strong"` or border color change on parent box

---

## 3. Selection State Management

### Visual Feedback
- **Selected card**: `background="strong"` or `border="base" borderColor="strong"`
- **Hover state**: Use CSS `:hover` on s-clickable (inherent)
- **Focus state**: Keyboard navigation handled by Polaris automatically

### Implementation Notes
- Polaris manages focus automatically for accessibility
- Event handler: `onchange` on s-choice-list captures selection
- Value: Unique recipe ID (e.g., "recipe-pasta", "recipe-salad")

---

## 4. Accessibility Best Practices

### WCAG Compliance
1. **Labels**: Each s-choice has `accessibilityLabel` describing the recipe
2. **Semantics**: s-choice-list has implicit `role="group"`
3. **Keyboard**: Tab/Enter/Space navigation built-in
4. **Focus**: Visible focus ring on s-clickable (native browser)
5. **Color contrast**: Polaris ensures sufficient contrast on borders/backgrounds

### Screen Reader Optimization
- Use `accessibilityVisibility="exclusive"` on hidden checkboxes
- Keep descriptive labels short but meaningful
- Avoid icon-only cards; always include text labels
- Use `accessibilityRole="option"` if needed for clarity

### Touch Accessibility
- Min touch target: 44px (Polaris s-box default padding provides this)
- Spacing between cards: `gap="base"` (16px) minimum

---

## 5. Code Patterns

### Pattern A: Single-Select Recipe Grid
```jsx
<s-stack gap="large">
  <s-section>
    <s-heading level="2">Select a recipe template</s-heading>
    <s-text type="subdued">Choose from 8 starter recipes</s-text>
  </s-section>

  <s-choice-list name="selectedRecipe" value="" onChange={handleRecipeSelect}>
    <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="base">
      {recipes.map(recipe => (
        <s-grid-item key={recipe.id}>
          <s-clickable>
            <s-box
              border="base"
              borderRadius="base"
              padding="base"
              background={selectedRecipe === recipe.id ? "strong" : "subdued"}
            >
              <s-stack gap="small" alignItems="center">
                <s-icon source={recipe.icon} />
                <s-heading level="3">{recipe.name}</s-heading>
                <s-text type="subdued">{recipe.description}</s-text>
              </s-stack>
            </s-box>
            <s-choice
              id={`recipe-${recipe.id}`}
              accessibilityLabel={recipe.name}
              accessibilityVisibility="exclusive"
            />
          </s-clickable>
        </s-grid-item>
      ))}
    </s-grid>
  </s-choice-list>
</s-stack>
```

### Pattern B: Visual Selection Indicator
- Instead of checkbox, use border highlight: `border="base" borderColor={isSelected ? "strong" : "base"}`
- Or background change: Apply conditional styling via wrapper

---

## 6. Responsive Behavior

### Desktop (>1200px)
- 4 columns: `gridTemplateColumns="repeat(4, 1fr)"`
- Full recipe descriptions visible

### Tablet (768px-1200px)
- 2-3 columns: `gridTemplateColumns="repeat(2, 1fr)"`
- Descriptions may wrap

### Mobile (<768px)
- 1 column: `gridTemplateColumns="1fr"`
- Stack layout, full-width cards
- **Use container queries for automatic adjustment**

### Container Query Syntax
```
gridTemplateColumns="@container (inline-size > 1200px) repeat(4, 1fr),
                     @container (inline-size > 768px) repeat(2, 1fr),
                     1fr"
```

---

## 7. Integration with Blocksmith

### Recipe Card Data Model
```ts
interface Recipe {
  id: string;
  name: string;
  description: string;
  icon: string; // Polaris icon source
  category: 'testimonial' | 'product' | 'faq' | 'etc';
  templateId: string;
}
```

### State Management
- Use React state: `const [selectedRecipe, setSelectedRecipe] = useState('')`
- Sync to existing draft/save flow
- Pass selected recipe ID to AI generation prompt

### Accessibility Props Required
- Every s-choice: `accessibilityLabel={recipe.name}`
- Every s-grid-item: Consider `accessibilityRole="option"` if not covered by s-choice-list
- Parent section: `accessibilityRole="group"` (implicit from s-choice-list)

---

## 8. Limitations & Workarounds

| Issue | Workaround |
|-------|-----------|
| No native Card component | Compose from s-box + s-stack + s-clickable |
| Icon sizing limited | Use default size; size is optimized for admin |
| Custom card styling restricted | Leverage Polaris props (border, background, padding, borderRadius) |
| Focus visibility | Browser handles; test with keyboard nav |
| Multiple icon types | Polaris provides 100+ icons; verify recipe icons available |

---

## 9. Testing Checklist

- [ ] Tab navigation through all 8 cards
- [ ] Enter/Space selects card (radio/checkbox activates)
- [ ] Screen reader announces recipe name + description
- [ ] Touch targets minimum 44px (verified by design)
- [ ] Responsive grid adjusts on window resize
- [ ] Selected state visually clear (color + border contrast WCAG AA)
- [ ] Focus ring visible on all interactive elements
- [ ] Mobile: Single column, cards full-width

---

## Key Takeaways

1. **No dedicated Card component**: Use s-grid + s-box + s-clickable
2. **Selection handling**: s-choice-list for single, s-checkbox for multi
3. **Accessibility first**: Polaris handles most; add labels + roles
4. **Responsive**: Container queries or media breakpoints with gridTemplateColumns
5. **Icons**: Use s-icon with Polaris library; check availability
6. **Visual feedback**: Border + background changes indicate selection state

---

## Unresolved Questions

1. Which recipe icons are available in Polaris icon library? (Need icon audit)
2. Multi-select vs single-select for final CRO pivot? (Affects checkbox vs radio)
3. Default recipe selection behavior? (Pre-select first recipe?)
4. Card height consistency? (Min-height or natural flow?)
