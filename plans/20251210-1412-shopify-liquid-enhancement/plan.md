# Shopify Liquid Enhancement Plan

**Date:** 2025-12-10
**Status:** Phase 2 Complete (2025-12-10 14:30 UTC)
**Priority:** High
**Overall Progress:** Phase 2/4 Complete - 50%

## Overview

Enhance liquidjs implementation for comprehensive Shopify Liquid support in section preview. Current implementation covers ~30% of Shopify Liquid features. This plan closes the gap for production-ready section preview.

## Gap Analysis Summary

### Filters (Current: 27 | Missing: ~40 critical)

| Category | Current | Missing Critical |
|----------|---------|------------------|
| Array | where | compact, concat, find, first/last, map, reject, reverse, sort, sort_natural, uniq |
| String | handle, handleize, pluralize, json | base64, camelize, escape, newline_to_br, remove_first/last, replace_first/last, slice, strip, strip_html, strip_newlines, url_encode/decode |
| Color | 5 stubs | brightness, contrast, mix, saturate, oklch conversions |
| Math | times, divided_by, modulo | abs, at_least, at_most, ceil, floor, round, plus, minus |
| Money | 4 variants | currency_selector, payment_type_svg_tag |
| Media | img_url, image_url, img_tag | external_video_tag, external_video_url, image_tag, media_tag, model_viewer_tag, video_tag |
| Metafield | - | metafield_tag, metafield_text |
| Font | - | font_face, font_modify, font_url |

### Objects/Drops (Current: 8 | Missing: ~12 critical)

| Object | Status | Priority |
|--------|--------|----------|
| cart | Missing | HIGH - cart sections |
| customer | Missing | HIGH - personalization |
| request | Missing | HIGH - design_mode detection |
| routes | Missing | HIGH - URL generation |
| localization | Missing | MEDIUM - i18n |
| paginate | Stub only | MEDIUM - pagination UI |
| forloop | Missing | HIGH - loop metadata |
| tablerowloop | Missing | LOW - table iteration |
| settings | Partial | MEDIUM - global settings |
| theme | Missing | LOW |
| linklists | Missing | LOW - navigation |
| pages/blogs | Types only | LOW |

### Tags (Current: 10 | Missing: ~6)

| Tag | Status | Priority |
|-----|--------|----------|
| tablerow | Missing | MEDIUM |
| content_for | Missing | LOW - theme layouts |
| layout | Missing | LOW |
| style | Regex workaround | HIGH - proper tag |
| liquid | Missing | MEDIUM - multi-statement |
| include | Missing | MEDIUM - snippet include |

### Drop Property Gaps

- **ProductDrop**: Missing ~15 properties (metafields, media[], gift_card?, published_at, created_at, requires_selling_plan, selling_plan_groups, quantity_price_breaks)
- **CollectionDrop**: Missing ~8 properties (featured_image, current_vendor, current_type, filters, template_suffix)
- **ShopDrop**: Missing ~20 properties (brand, metafields, policies, published_locales, products_count, collections_count, types[], vendors[])

## Phases

| Phase | Focus | Status | File | Completed |
|-------|-------|--------|------|-----------|
| 1 | Critical Filters | ✅ DONE | [phase-01-critical-filters.md](./phase-01-critical-filters.md) | 2025-12-10 |
| 2 | Missing Objects/Drops | ✅ DONE | [phase-02-missing-objects.md](./phase-02-missing-objects.md) | 2025-12-10 |
| 3 | Advanced Tags | Pending | [phase-03-advanced-tags.md](./phase-03-advanced-tags.md) | - |
| 4 | Enhancements | Pending | [phase-04-enhancements.md](./phase-04-enhancements.md) | - |

## Success Criteria

1. **Filter Coverage**: 60+ filters implemented (from ~27)
2. **Object Coverage**: 15+ drops/objects (from 8)
3. **Tag Coverage**: All common section tags working
4. **Compatibility**: 90%+ of Dawn theme sections render without errors
5. **Performance**: Render time <100ms for typical sections
6. **Test Coverage**: Unit tests for all new filters/drops

## Implementation Priority

1. **P0 (Blockers)**: forloop, array filters (first/last/map), request.design_mode
2. **P1 (Common)**: cart, customer, routes, string filters
3. **P2 (Important)**: media filters, metafield support, paginate UI
4. **P3 (Nice-to-have)**: font filters, color enhancements, tablerow

## Technical Approach

1. **Filters**: Register via `engine.registerFilter()` in useLiquidRenderer hook
2. **Drops**: Extend ShopifyDrop base class with getter properties
3. **Tags**: Use `engine.registerTag()` with parse/render methods
4. **Context**: Extend buildPreviewContext for new objects

## Related Files

- `app/components/preview/hooks/useLiquidRenderer.ts` - Filter/tag registration
- `app/components/preview/drops/` - Drop class implementations
- `app/components/preview/mockData/types.ts` - Type definitions
- `app/components/preview/utils/buildPreviewContext.ts` - Context builder

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing previews | High | Incremental rollout, feature flags |
| Performance degradation | Medium | Lazy initialization, caching |
| Type complexity | Low | Strict TypeScript, unit tests |
| Shopify API changes | Low | Version pinning, abstraction layer |

## Dependencies

- liquidjs ^10.x (current)
- No new dependencies required

---

**Next Step**: Begin Phase 1 - Critical Filters implementation
