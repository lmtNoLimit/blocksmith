# Settings Test Prompts Guide

**Date**: 2025-12-26
**Purpose**: Example prompts to generate sections containing all 7 input setting types
**Related Plan**: `plans/251225-2131-shopify-section-settings/plan.md`

## Quick Reference: 7 Input Settings

| Setting | Type | Component | Key Props |
|---------|------|-----------|-----------|
| Checkbox | Boolean | `<s-checkbox>` | `default: true/false` |
| Number | Integer/Float | `<s-number-field>` | `default: number` |
| Radio | Choice | `<s-choice-list>` | `options: [{value, label}]` |
| Range | Slider | Custom HTML5 | `min, max, step, unit` |
| Select | Dropdown | `<s-select>` / `<s-button-group>` | `options: [{value, label}]` |
| Text | Single line | `<s-text-field>` | `placeholder, default` |
| Textarea | Multi-line | `<s-text-area>` | `placeholder, default` |

---

## Example Prompts

### 1. **All-In-One Settings Demo** (Best for Testing All 7)

```
Create a configurable product showcase section with these exact settings:

1. TEXT: "heading" - Section title
2. TEXTAREA: "description" - Product description (multi-line)
3. NUMBER: "columns" - Number of columns (1-6)
4. RANGE: "padding" - Section padding (0-100px, step 5)
5. CHECKBOX: "show_border" - Toggle border visibility
6. SELECT: "layout" - Layout style (grid, list, masonry, carousel)
7. RADIO: "alignment" - Text alignment (left, center, right)

Include a simple grid of placeholder product cards that responds to these settings.
```

**Why it works**: Explicitly requests each setting type by name.

---

### 2. **Hero Section with Full Controls**

```
Create a hero banner section with comprehensive customization:

- Heading text input
- Subheading textarea for longer descriptions
- Background overlay opacity slider (0-100%)
- Number of CTA buttons to show (1-3)
- Enable/disable parallax effect checkbox
- Text position dropdown (top-left, top-center, top-right, center, bottom-left, bottom-center, bottom-right)
- Content alignment radio buttons (left, center, right)

Make it mobile responsive with a dark overlay for text readability.
```

---

### 3. **Feature Grid with Settings**

```
Build a features grid section with these controls:

Settings needed:
- Section title (text field)
- Section intro paragraph (textarea)
- Features per row: slider from 2-6, step of 1
- Total features to display: number input
- Show feature icons: checkbox toggle
- Card style: select dropdown with options "minimal", "bordered", "shadowed", "gradient"
- Icon position: radio with "top", "left", "inline" options

Use CSS grid and make cards have hover effects.
```

---

### 4. **Testimonials Carousel**

```
Create a testimonials section with full customization:

TEXT inputs: Section heading, CTA button text
TEXTAREA: Section description
NUMBER: Testimonials per slide (1-4)
RANGE: Auto-scroll interval (0-10 seconds, 0 = disabled)
CHECKBOX: Show customer photos, Show star ratings, Enable autoplay
SELECT: Animation style (fade, slide, zoom)
RADIO: Quote style (standard, large-quote, minimal)

Include 3 sample testimonial blocks with name, role, company, quote, and rating.
```

---

### 5. **Pricing Table**

```
Design a pricing comparison section with these settings:

- Table title: text input
- Table description: textarea
- Number of pricing tiers: number (2-5)
- Card spacing: range slider (10-50px)
- Highlight popular plan: checkbox
- Currency display: select (USD, EUR, GBP, CAD)
- Price alignment: radio (left, center, right)

Create 3 pricing blocks with plan name, price, features list, and CTA button.
```

---

### 6. **Image Gallery**

```
Build a responsive image gallery with these configuration options:

TEXT: Gallery title
TEXTAREA: Gallery description
NUMBER: Images per row on desktop (2-8)
RANGE: Image gap spacing (0-40px, step 4)
CHECKBOX: Enable lightbox, Show captions, Lazy load images
SELECT: Layout mode (grid, masonry, justified, slider)
RADIO: Thumbnail shape (square, portrait, landscape, circle)

Support up to 12 image blocks with optional caption and link.
```

---

### 7. **Newsletter Signup**

```
Create a newsletter subscription section with:

- Heading text field
- Description textarea explaining benefits
- Form width percentage: range (50-100%, step 10)
- Input fields count: number (1 = email only, 2 = name+email, 3 = full)
- Show privacy notice: checkbox
- Button style: select (solid, outline, gradient, minimal)
- Form layout: radio (stacked, inline, split)

Include success/error message placeholders.
```

---

### 8. **FAQ Accordion**

```
Build an FAQ accordion section with these settings:

TEXT: Section title
TEXTAREA: Intro text above questions
NUMBER: Maximum expanded items at once (0 = unlimited)
RANGE: Animation duration (100-500ms, step 50)
CHECKBOX: Start all collapsed, Allow multiple open, Show expand all button
SELECT: Icon style (plus-minus, chevron, arrow, caret)
RADIO: Layout width (narrow, medium, full-width)

Include 4 FAQ blocks with question and answer fields.
```

---

## Tips for Testing

### To Verify Each Setting Type:

1. **Checkbox**: Look for toggle switches that enable/disable features
2. **Number**: Look for numeric inputs with +/- controls
3. **Radio**: Look for button groups (≤5 options) or choice lists
4. **Range**: Look for sliders with track and thumb
5. **Select**: Look for dropdowns (6+ options) or segmented buttons (≤5 options)
6. **Text**: Look for single-line input fields
7. **Textarea**: Look for multi-line text areas

### Quick Validation Checklist:

- [ ] All settings render in Settings Panel
- [ ] Default values populate correctly
- [ ] Changes update preview in real-time
- [ ] Range sliders show current value
- [ ] Select with ≤5 options shows segmented buttons
- [ ] Radio uses Polaris `<s-choice-list>`
- [ ] Checkbox uses Polaris `<s-checkbox>`

---

## Schema Examples (Expected Output)

### Minimal Schema with All 7 Types:

```json
{
  "name": "Settings Demo",
  "settings": [
    {"type": "text", "id": "heading", "label": "Heading", "default": "Welcome"},
    {"type": "textarea", "id": "description", "label": "Description", "default": "Enter description here"},
    {"type": "number", "id": "columns", "label": "Columns", "default": 3},
    {"type": "range", "id": "padding", "label": "Padding", "min": 0, "max": 100, "step": 5, "unit": "px", "default": 20},
    {"type": "checkbox", "id": "show_border", "label": "Show Border", "default": false},
    {"type": "select", "id": "layout", "label": "Layout", "options": [
      {"value": "grid", "label": "Grid"},
      {"value": "list", "label": "List"},
      {"value": "masonry", "label": "Masonry"}
    ], "default": "grid"},
    {"type": "radio", "id": "alignment", "label": "Alignment", "options": [
      {"value": "left", "label": "Left"},
      {"value": "center", "label": "Center"},
      {"value": "right", "label": "Right"}
    ], "default": "center"}
  ],
  "presets": [{"name": "Settings Demo"}]
}
```

---

## Unresolved Questions

1. **E2E Testing**: Should we create Playwright tests for visual regression of settings UI?
2. **Component Unit Tests**: 0% coverage on settings components - is this acceptable?
3. **AI Consistency**: Does AI reliably generate all 7 types when explicitly requested?
