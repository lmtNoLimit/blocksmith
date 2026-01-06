---
phase: 1
title: "Add Preview Settings Documentation"
status: done
effort: 30min
completed: 2026-01-06T15:16:00Z
---

# Phase 1: Preview Settings Documentation

## Objective
Add `=== PREVIEW SETTINGS ===` section to SYSTEM_PROMPT explaining how to configure default preview data for resource pickers.

## Location
Insert after line 142 (end of PRESET CONFIGURATION section), before CSS RULES.

## Content to Add

```
=== PREVIEW SETTINGS (for resource pickers) ===
preview_settings enables live preview data when no resource selected.

Schema format:
{
  "presets": [{
    "name": "Section Name",
    "settings": {},
    "preview_settings": {
      "products": [{"title": "Product", "price": 1999}],
      "collections": [{"title": "Collection"}],
      "blogs": [{"title": "Blog"}],
      "articles": [{"title": "Article"}],
      "pages": [{"title": "Page"}]
    }
  }]
}

Key rules:
- preview_settings goes inside preset object, NOT at section root
- Use plural keys: products, collections, blogs, articles, pages
- Minimal data: title + 1-2 key fields (price, image, etc.)
- Limit lists to 3-5 items for performance
- Only affects theme editor preview, not live store

When to use:
- Section has product/collection/article/blog/page picker
- Section displays featured resource without merchant selection
- Default empty state would break layout
```

## Implementation Steps
1. Open `app/services/ai.server.ts`
2. Locate line 142 (end of `=== PRESET CONFIGURATION ===`)
3. Add blank line after `}]` closing
4. Insert preview_settings block above `=== CSS RULES ===`

## Validation
- Schema format matches Shopify Online Store 2.0 spec
- Examples show correct nesting (inside preset, not section)
- Guidance prevents overuse (only when needed)
