---
title: "AI Prompt Resource Picker Preview Settings"
description: "Update SYSTEM_PROMPT to include preview_settings patterns for resource pickers"
status: pending
priority: P2
effort: 2h
branch: main
tags: [ai, prompt, shopify, resource-pickers, preview]
created: 2026-01-06
---

# AI Prompt Resource Picker Preview Settings

## Problem Statement
SYSTEM_PROMPT documents resource pickers (lines 55-66) but lacks:
- preview_settings for live preview rendering
- Conditional rendering patterns for single resources
- Iteration patterns for resource lists
- Relationship handling (blog→articles, collection→products)

## Solution Overview
Add 3 sections to SYSTEM_PROMPT after line 142 (preset config):
1. Preview settings schema documentation
2. Single resource rendering patterns
3. Multiple resource iteration patterns

## Phases

### Phase 1: Preview Settings Documentation (30min)
Add `=== PREVIEW SETTINGS ===` section with schema format and examples.
- File: `phase-01-preview-settings-docs.md`

### Phase 2: Single Resource Patterns (45min)
Add rendering patterns for product, collection, article, blog, page pickers.
- File: `phase-02-single-resource-patterns.md`

### Phase 3: Multiple Resource Patterns (45min)
Add iteration patterns for product_list, collection_list, article_list + relationships.
- File: `phase-03-multiple-resource-patterns.md`

## Dependencies
- None (self-contained SYSTEM_PROMPT update)

## Validation
- AI generates sections with proper preview_settings when resource pickers used
- Conditional checks prevent undefined reference errors
- List patterns include proper iteration with limits

## File Changes
| File | Action | Lines |
|------|--------|-------|
| `app/services/ai.server.ts` | Modify | Add ~60 lines after L142 |

## Success Criteria
- [x] preview_settings documented with schema format
- [ ] Single resource conditionals match image pattern style
- [ ] List iteration includes pagination guidance
- [ ] Blog→articles and collection→products relationships documented

## Validation Summary

**Validated:** 2026-01-06
**Questions asked:** 5

### Confirmed Decisions
1. **Grid approach**: Prefer collection picker (collection.products) over product_list for dynamic grids
2. **Prompt size**: Not concerned (~60 lines addition acceptable, current 203 lines is reasonable)
3. **Empty state**: Instructional text (e.g., "Select a product") with better UI feedback
4. **Article source**: Blog picker for lists (v1); later add article_list for curated selections
5. **Validation rule**: Add error #13 for resource pickers without conditionals

### Action Items
- [ ] Phase 2: Emphasize collection picker as preferred for product grids
- [ ] Phase 2-3: Improve empty state fallback UI (not just text, consider placeholder styling)
- [ ] Phase 3: Document blog picker as primary for article lists (defer article_list to v2)
- [ ] Add to COMMON ERRORS: "13. Resource picker without conditional → Always wrap in {% if %}"
