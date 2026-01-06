# AI Prompt Resource Picker Analysis
**Date**: 2026-01-06 | **Status**: Research Complete

## Executive Summary
Current AI prompt (SYSTEM_PROMPT in `ai.server.ts`) documents resource pickers but lacks **preview_settings** definitions. The prompt distinguishes single vs. list resource types but provides minimal guidance on how section generators should handle Shopify context (products, collections, etc.) during live preview.

## Current AI Prompt Structure

### Core Organization
- **Lines 1-10**: Section structure rules (schema first, then style, then markup)
- **Lines 15-120**: Input type reference (detailed taxonomy)
- **Lines 71-107**: Image patterns (content vs. background distinction)
- **Lines 121-202**: Validation rules & common errors

### Resource Picker Documentation (Lines 55-66)

**Single Resource Pickers** (no defaults):
```
- article, blog, collection, page, product
```
Limitation: "RESOURCES (NO defaults supported)" - no conditional rendering guidance

**Resource Lists** (arrays with limit):
```
- article_list, blog_list, collection_list, product_list: Arrays with limit (max 50)
- link_list: Menu picker
```

**Metaobjects**:
```
- metaobject, metaobject_list: With metaobject_type requirement
```

## Gaps in Current Implementation

| Issue | Impact | Example |
|-------|--------|---------|
| No preview_settings documented | AI can't optimize preview rendering | No guidance: "When user picks product, render which product data?" |
| No preview_defaults pattern | Preview shows undefined/placeholder states | Product picker field empty on first load |
| No conditional rendering for resources | Markup may reference undefined data | `{{ section.settings.product.title }}` without null check |
| Single resource handling unclear | Different from list-based resources | List pattern (loop) documented, single pattern not |
| No context drop patterns for resources | AI doesn't know what data is available | Should AI generate `{{ section.settings.product | link_to }}` or custom markup? |

## Pattern Analysis from Codebase

### SYSTEM_PROMPT Patterns
1. **Image conditional**: Clear `{% if section.settings.image %}` pattern (lines 75-80)
2. **Background image**: CSS-based with position/size controls (lines 82-96)
3. **Metadata handling**: No examples for resource pickers
4. **List iteration**: No template for `for product in section.settings.product_list`

### Missing from Prompt
- `preview_settings` - Shopify schema property for default preview data
- Preview context initialization for resource pickers
- Example: Product picker section without merchant having products selected

## Shopify Standards Observed
✓ Correct resource picker syntax (`product`, `product_list`)
✓ Array limit documentation (`max 50`)
✓ No defaults rule enforced
✗ Missing preview_settings field definition
✗ No preview context architecture

## Recommendations

### Phase 1: Document Preview Settings
Add to SYSTEM_PROMPT after line 142 (preset config):
```
=== PREVIEW SETTINGS (for live preview) ===
preview_settings: Define default data for preview without merchant selection
- product_picker: Use preview_settings.products with at least 1 product
- collection_picker: Use preview_settings.collections with at least 1 collection
- No effect on merchant UI - only preview display
```

### Phase 2: Add Resource Rendering Examples
Extend validation rules with resource patterns:
- Single resource conditional: `{% if section.settings.product %}`
- List resource iteration: `{% for item in section.settings.product_list %}`

### Phase 3: Context Integration
Align prompt with preview context drops (18 available per codebase):
- Products, collections, articles (IDs, titles, images, handles)
- Blog, pages, themes

## Current Tool Behavior
- **ai.server.ts lines 217-240**: generateSection() returns raw Liquid
- **ai.server.ts lines 307-345**: generateWithContext() includes conversation history
- **context-builder.ts**: Adds 18 context drops (inferred from README)
- **No preview_settings transformation** in AI pipeline

## File References
- `app/services/ai.server.ts`: SYSTEM_PROMPT definition (lines 6-203)
- `app/utils/prompt-templates.ts`: Template examples (no resource pickers)
- `app/components/preview/schema/`: Schema parsing (resource type handling unclear)

## Unresolved Questions
1. How are resource pickers currently rendered in preview without defaults?
2. What preview context is available at generation time vs. preview time?
3. Should preview_settings be AI-generated or user-configured?
4. Are there existing examples of product_list/collection_list in generated sections?
