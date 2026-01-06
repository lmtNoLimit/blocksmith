---
title: "Image Picker Placeholder Support"
description: "Fix image_picker settings to show placeholders before user selection"
status: pending
priority: P1
effort: 3h
branch: main
tags: [bugfix, preview, ai-prompt, image-picker]
created: 2026-01-05
---

# Image Picker Placeholder Support

## Overview

Sections with `image_picker` settings show nothing until user selects an image. Expected behavior: placeholder visible first, then replaced by selected image.

## Problem Analysis

**Root Causes:**
1. `buildInitialState()` returns `'placeholder'` string (not empty/nil)
2. AI-generated code lacks `{% if image %}...{% else %}placeholder{% endif %}` conditionals
3. Preview receives literal `'placeholder'` string, fails to render

**Current Flow:**
```
Schema parsed → 'placeholder' string → Liquid fails → broken image fallback (hacky)
```

**Target Flow:**
```
Schema parsed → empty string → AI code checks if empty → shows SVG placeholder
```

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Fix Initial State | Pending | 30m | [phase-01](./phase-01-fix-initial-state.md) |
| 2 | Update AI Prompt | Pending | 1h | [phase-02-update-ai-prompt.md](./phase-02-update-ai-prompt.md) |
| 3 | Preview Placeholder | Pending | 1.5h | [phase-03-preview-placeholder.md](./phase-03-preview-placeholder.md) |

## Dependencies

- Research: Shopify `placeholder_svg_tag` filter usage
- Research: Conditional image rendering patterns

## Success Criteria

1. New sections show placeholder SVG when no image selected
2. Settings panel displays "Select" button for empty state
3. After image selection, preview shows actual image
4. Saved sections store actual URL (not 'placeholder' string)

## Files to Modify

| File | Change |
|------|--------|
| `app/components/preview/schema/parseSchema.ts` | Return `''` for image_picker |
| `app/services/ai.server.ts` | Add conditional rendering instructions |
| `app/utils/settings-transform.server.ts` | Handle empty image → placeholder SVG |

## Validation Summary

**Validated:** 2026-01-05
**Questions asked:** 5

### Confirmed Decisions
- **Placeholder approach:** Use `placeholder_svg_tag` filter (user confirmed)
- **Empty image handling:** Skip assignment entirely in settings-transform (Liquid treats undefined as falsy)
- **Migration:** No migration needed - existing sections have real URLs
- **Block settings:** Apply same conditional pattern to block.settings image_picker
- **PreviewFrame fallback:** Keep MutationObserver as safety net for external URL failures

### Resolved Questions
- ~~Should preview use inline SVG or Shopify `placeholder_svg_tag` filter?~~ → Use `placeholder_svg_tag`
