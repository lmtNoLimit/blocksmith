# Polaris Web Components Research Report
## Form Input Components for Shopify Section Settings

**Date**: 2025-12-25 | **Status**: Complete | **Scope**: Form inputs for section settings

---

## Executive Summary

Polaris web components provide framework-agnostic form inputs with `s-*` prefix. Five target components identified: **Checkbox**, **TextField**, **ChoiceList** (radio), **Select**, and **NumberField** (slider alternative). **Critical**: RangeSlider NOT available in web components; use NumberField or custom slider.

---

## 1. Checkbox (`<s-checkbox>`)

**Purpose**: Boolean toggle for settings

| Aspect | Details |
|--------|---------|
| **Tag** | `<s-checkbox>` |
| **Key Props** | `label`, `checked`, `disabled`, `error`, `details`, `indeterminate` |
| **Event** | `input` (on toggle), `change` (on blur) |
| **A11y** | ARIA labels auto-applied; supports `indeterminate` for "select all" patterns |
| **Example** | `<s-checkbox label="Enable feature" checked={true} onChange={handler} />` |

**Notes**:
- Works independently from other checkboxes
- Use positive framing: "Publish store" not "Hide store"
- Supports `details` prop for supplementary guidance text
- For multiple checkboxes, use ChoiceList component instead

---

## 2. TextField (`<s-text-field>`)

**Purpose**: Single-line text/number input for settings

| Aspect | Details |
|--------|---------|
| **Tag** | `<s-text-field>` |
| **Key Props** | `label`, `value`, `placeholder`, `error`, `disabled`, `icon`, `prefix`, `suffix` |
| **Validation Props** | `minLength`, `maxLength`, `required` |
| **Events** | `input` (keystroke), `change` (blur/Enter), `focus`, `blur` |
| **A11y** | ARIA labels via `label` prop; auto-generated `id` if omitted |
| **Example** | `<s-text-field label="Section title" value={val} onChange={e => setVal(e.target.value)} />` |

**Notes**:
- Follows HTML standard attributes (`name`, `type`, `inputMode`)
- Supports prefix (e.g., "+353") and suffix (e.g., "@domain")
- Character limits via `minLength`/`maxLength`
- Icon support for visual context (search, edit, etc.)
- Auto-generates unique `id` if not provided

---

## 3. ChoiceList (`<s-choice-list>`)

**Purpose**: Radio buttons (single) or checkboxes (multiple)

| Aspect | Details |
|--------|---------|
| **Tag** | `<s-choice-list>` |
| **Key Props** | `label`, `multiple`, `values`, `error`, `disabled` |
| **Child Elements** | `<s-choice>` with `value` attribute per option |
| **Events** | `input`, `change` (fires with `event.currentTarget.values`) |
| **A11y** | ARIA roles auto-applied; label extracted from text nodes |
| **Radio Example** | `<s-choice-list label="Style"><s-choice value="modern">Modern</s-choice></s-choice-list>` |
| **Checkbox Example** | `<s-choice-list label="Features" multiple><s-choice value="feat1">Feature 1</s-choice></s-choice-list>` |

**Notes**:
- Default: radio buttons (single selection)
- Set `multiple={true}` for checkboxes (multi-select)
- Label extracted from text nodes; markup ignored
- Best practice: use for 2+ options; Checkbox for single toggle
- No dedicated radio button component; ChoiceList is the standard

---

## 4. Select (`<s-select>`)

**Purpose**: Dropdown menu for single option selection

| Aspect | Details |
|--------|---------|
| **Tag** | `<s-select>` |
| **Key Props** | `label`, `value`, `placeholder`, `error`, `disabled`, `icon`, `required` |
| **Child Elements** | `<s-option>` (single items), `<s-option-group>` (organized) |
| **Events** | `input`, `change` |
| **A11y** | ARIA labels via `label` prop; `labelAccessibilityVisibility` for hidden labels |
| **Example** | `<s-select label="Theme"><s-option value="light">Light</s-option><s-option value="dark">Dark</s-option></s-select>` |

**Notes**:
- Ideal for 4+ options (keeps UI uncluttered)
- Supports icon property (400+ icons available)
- Grouping via `<s-option-group label="Category">`
- `labelAccessibilityVisibility="exclusive"` hides label visually, keeps for screen readers
- Placeholder for empty state guidance

---

## 5. NumberField Alternative (No RangeSlider)

**Purpose**: Numeric slider input (RangeSlider NOT available in web components)

| Status | Component | Usage |
|--------|-----------|-------|
| **UNAVAILABLE** | `<s-range-slider>` | NOT in Polaris web components (feature request pending) |
| **ALTERNATIVE 1** | `<s-number-field>` | Use for numeric input with keyboard; lacks visual slider |
| **ALTERNATIVE 2** | Custom HTML `<input type="range">` | Manual styling/integration required |
| **ALTERNATIVE 3** | Polaris React (legacy) | Fallback if web components insufficient |

**NumberField properties**:
- `label`, `value`, `min`, `max`, `step`, `error`, `disabled`
- Events: `input`, `change`, `focus`, `blur`

**Recommendation**: Use `<s-number-field>` for section settings until RangeSlider web component available.

---

## Event Handling & Framework Integration

**Standard Behavior**:
- `onInput` - Fires every keystroke/interaction (real-time)
- `onChange` - Fires on blur or Enter press (committed value)
- Both events provide access to element via `event.currentTarget`

**React/JSX Pattern**:
```jsx
<s-text-field
  label="Title"
  value={title}
  onInput={(e) => setTitle(e.currentTarget.value)}
  onChange={(e) => validate(e.currentTarget.value)}
/>
```

**Form Integration**:
- All components support `name` attribute for form submission
- Values are always strings (even for numeric inputs)
- Multi-select components use `values` prop (array of strings)

---

## Accessibility Standards

**Built-in Features**:
- Semantic HTML with auto-applied ARIA roles/labels
- Keyboard navigation (Tab, Arrow keys, Enter/Space)
- Required field marking with `required` prop
- Error states with `error` prop (accessible styling)

**Developer Responsibilities**:
- Provide descriptive `label` prop for all form inputs
- Use `details` prop for additional guidance (exposed to screen readers)
- Validate inputs and display errors via `error` prop
- Test keyboard-only navigation
- Use `labelAccessibilityVisibility="exclusive"` for hidden labels (when needed)

---

## Implementation Checklist

- [ ] Checkbox for boolean toggles (e.g., "Enable notifications")
- [ ] TextField for text/string inputs (e.g., section title, description)
- [ ] ChoiceList for single selection (e.g., layout style) - NO `multiple`
- [ ] ChoiceList `multiple` for multi-select (e.g., feature flags)
- [ ] Select for 4+ dropdown options (e.g., color scheme)
- [ ] NumberField for numeric inputs (range slider alternative)
- [ ] Add `name` attributes for form submission
- [ ] Implement validation error display via `error` prop
- [ ] Test keyboard navigation and screen reader compatibility
- [ ] Use `details` prop for complex setting guidance

---

## Sources

- [Polaris Web Components Overview](https://shopify.dev/docs/api/app-home/polaris-web-components)
- [Using Polaris Web Components](https://shopify.dev/docs/api/app-home/using-polaris-components)
- [Checkbox Component](https://shopify.dev/docs/api/app-home/polaris-web-components/forms/checkbox)
- [TextField Component](https://shopify.dev/docs/api/app-home/polaris-web-components/forms/textfield)
- [ChoiceList Component](https://shopify.dev/docs/api/app-home/polaris-web-components/forms/choicelist)
- [Select Component](https://shopify.dev/docs/api/app-home/polaris-web-components/forms/select)
- [Polaris Blog: Unified and for the Web (2025)](https://www.shopify.com/partners/blog/polaris-unified-and-for-the-web)

---

## Unresolved Questions

1. **RangeSlider Timeline**: When will `<s-range-slider>` be available in Polaris web components? (Currently only in Polaris React)
2. **Custom HTML Input Support**: Should NumberField be extended with custom HTML `<input type="range">` for better UX on slider-heavy sections?
3. **Icon Availability**: Complete list of 400+ available icons for TextField/Select components?
