# Shopify Section Input Settings Research

**Date**: 2025-12-25 | **Source**: [Shopify Dev Docs](https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings)

## Overview

Seven core input types for Shopify theme section schemas. Values accessed in Liquid via `settings.setting_id`.

---

## 1. Checkbox

**Schema**: `{type, id, label, default: boolean}`

**Properties**: Standard only (no min/max, options, etc.)

**Validation**: Default to `false` if unspecified. Always returns boolean.

**Liquid**: `{% if settings.show_announcement %}`

**Special**: Toggle feature on/off. No nil values.

---

## 2. Number

**Schema**: `{type, id, label, default: number, placeholder?}`

**Properties**: Accepts whole numbers and decimals. Placeholder shows only in `settings_schema.json`.

**Validation**: `default` must be numeric (not string). Returns nil if empty.

**Liquid**: `{% assign count = settings.products_per_page %}`

**Special**: Dual-type return (number or nil). Placeholder context-specific.

---

## 3. Radio

**Schema**: `{type, id, label, options: [{value, label}], default?}`

**Properties**: Required `options` array. Each option: `value` (string) + `label` (display text).

**Validation**: First option auto-selects if no default. Always returns string.

**Liquid**: `{% if settings.logo_alignment == 'centered' %}`

**Special**: Renders as segmented buttons. Single selection only.

---

## 4. Range

**Schema**: `{type, id, label, min, max, step?, unit?, default: number}`

**Properties**: `min`/`max` required (numeric). `step` defaults to 1. `unit` optional (displays label).

**Validation**: All numeric values must be numbers, not strings. `default` required. Auto-corrects to boundaries and nearest step.

**Liquid**: `<div style="font-size: {{ settings.font_size }}px">`

**Special**: Dual input (slider + text field). Returns number only. Unit label displayed.

---

## 5. Select

**Schema**: `{type, id, label, options: [{value, label, group?}], default?}`

**Properties**: Required `options`. Optional `group` attribute organizes options.

**Validation**: First option auto-selects if no default. Returns string value.

**Liquid**: `{% case settings.vertical_alignment %} {% when 'top' %}`

**Special**: UI auto-selects: SegmentedControl (2-5 short options) or Dropdown (6+ or grouped). Intelligent rendering.

---

## 6. Text

**Schema**: `{type, id, label, default?, placeholder?}`

**Properties**: Single-line input. Placeholder shows in `settings_schema.json` only.

**Validation**: Returns string or empty drop if blank. Ignores preset changes—maintains independent value.

**Liquid**: `<h2>{{ settings.footer_linklist_title }}</h2>`

**Special**: Short strings (titles, headings). Persists across preset switches.

---

## 7. Textarea

**Schema**: `{type, id, label, default?, placeholder?}`

**Properties**: Multi-line input. Placeholder shows in `settings_schema.json` only.

**Validation**: Returns string or empty drop if blank. Ignores preset changes—maintains independent value.

**Liquid**: `<div class="welcome">{{ settings.home_welcome_message }}</div>`

**Special**: Larger text blocks (messages, descriptions). Persists across preset switches.

---

## Common Patterns

**All Setting Types Include**:
- `type`: Setting type identifier
- `id`: Unique setting identifier (used in Liquid)
- `label`: UI label text
- `default`: Default value (type-dependent)
- `info`: Optional helper text (not explicitly documented for all types)

**Placeholder Behavior**: Visible only in `settings_schema.json` admin UI, not section editor.

**Preset Persistence**: Text and Textarea ignore preset changes; maintain user input independently.

**Nil Handling**: Number (if empty), Text/Textarea (if blank) return empty drop. Boolean/String always have values.

---

## Implementation Priorities

For Section Editor UI development:

1. **Number/Range distinction**: Range has visual slider; Number is text-based
2. **Options rendering**: Radio (segmented) vs Select (auto-smart rendering)
3. **Empty state handling**: Text/Textarea/Number require nil checks
4. **Default behavior**: First option (radio/select), false (checkbox), required for range
5. **Liquid access pattern**: All use `settings.{id}` dot notation

---

## Unresolved Questions

- Does `info` property support all 7 types? (Not explicitly documented in fetched content)
- Are there CSS classes or styling hooks for form inputs in section schemas?
- Does range `unit` support custom suffixes beyond common units (px, em, etc.)?
