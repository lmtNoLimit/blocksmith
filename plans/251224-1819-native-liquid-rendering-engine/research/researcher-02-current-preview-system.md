# Current Preview System Analysis
**Date**: 2025-12-24 | **Status**: Research Complete

## Architecture Overview

### Core Components
1. **useLiquidRenderer Hook** (`app/components/preview/hooks/useLiquidRenderer.ts`)
   - Single LiquidJS engine instance (per component mount)
   - Registers 60+ custom filters + Shopify-specific filters
   - Processes Liquid template → HTML + CSS extraction
   - Client-side rendering (browser only)

2. **PreviewFrame** (`app/components/preview/PreviewFrame.tsx`)
   - Sandboxed iframe with `srcDoc` (null origin)
   - Message-based parent↔iframe communication
   - Responsive scaling for mobile/tablet/desktop viewports
   - Placeholder image handling for broken images

3. **SectionPreview** (`app/components/preview/SectionPreview.tsx`)
   - Integration component for chat/editor panels
   - Manages render triggers (debounced on code/settings change)
   - Maintains error state, loading state
   - Coordinates with settings/blocks from parent

4. **Drop Classes** (`app/components/preview/drops/`)
   - ProductDrop, CollectionDrop, ShopDrop, etc.
   - Type-safe property chaining for Liquid (e.g., `{{ product.variants[0].price }}`)
   - Mock data binding for preview context

### Integration Points
- **GeneratePreviewColumn**: Chat panel preview (generate workflow)
- **CodePreviewPanel**: Section editor preview (edit/refine workflow)
- Both use same `SectionPreview` + `useLiquidRenderer`

### Rendering Pipeline
```
Liquid Code + Settings
    ↓
LiquidJS Engine (in-browser)
    ↓
Mock Context (products, collections, shop data)
    ↓
HTML + CSS Output
    ↓
PreviewFrame iframe (CSS transform scaling)
    ↓
Visual Preview (mobile/tablet/desktop)
```

## Current Filter Coverage

**Implemented (60+)**:
- Money: `money`, `money_with_currency`, `money_without_currency`, `money_without_trailing_zeros`
- Array: `first`, `last`, `map`, `compact`, `concat`, `join`, `where`, `size`, etc.
- String: `upcase`, `downcase`, `capitalize`, `split`, `replace`, `strip_html`, `escape_once`, `newline_to_br`, etc.
- Math: `abs`, `ceil`, `floor`, `round`, `plus`, `minus`, `times`, `divided_by`, `modulo`
- Color: `color_brightness`, `color_modify`, `color_saturation`, `color_lighten`, `color_darken`, `color_mix`
- Media: `image_tag`, `video_tag`, `media_tag`
- Font: `font_face`, `font_url`, `font_modify`
- Metafield: `metafield_tag`, `metafield_text`
- Utility: `default`, `highlight`, `time_tag`, `weight_with_unit`

**Stubbed (placeholders)**:
- `img_url`, `image_url`, `asset_url`, `file_url`
- `payment_button`
- `product_url`, `collection_url`, `url_for_type`, `url_for_vendor`

## Limitations of Current System

### 1. **Rendering Accuracy**
- No actual Shopify rendering engine - stubs filters instead of true implementations
- Missing liquid tag support: `form`, `paginate`, `section`, `render` (stubs exist but incomplete)
- Filter behavior doesn't match Shopify exactly (e.g., `img_url` signature differs)
- No access to actual store data (products, variants, inventory, etc.)

### 2. **Performance**
- Full template parse + render on every keystroke (debounced to 500ms)
- LiquidJS slower than native Shopify renderer (~2-5x)
- Large templates with loops can cause UI lag
- No caching of parsed templates

### 3. **Missing Shopify Objects**
- Shop: basic stub (name, email, domain)
- Product: synthetic mock data only
- Collection: synthetic mock data only
- Customer: minimal implementation (logged_in, email)
- Page: not implemented
- Blog/Article: minimal support
- Theme: stub (theme name only)
- No metafield access beyond setting values

### 4. **Data Binding Issues**
- Settings resources (product/collection selectors) mock only, not real Shopify data
- No pagination, filtering, or sorting on collections
- No inventory/availability data for products
- No customer account access
- No real theme settings

### 5. **Advanced Features Not Supported**
- Liquid blocks/sections rendering
- Theme CSS asset loading
- Shopify CDN image manipulation
- Payment button rendering (payment_button filter)
- Custom liquid filters from theme
- Multipart form submissions
- Checkout experience preview

## What Native Rendering Would Solve

| Gap | Current | Native Rendering |
|-----|---------|------------------|
| Accuracy | ~60% match | 99%+ match (server-side) |
| Speed | Slow (500ms+) | Instant (pre-rendered) |
| Real Data | Mock only | Live shop data |
| Cache | None | Server-side cache |
| Filters | Stubs | Full Shopify parity |
| Tags | Incomplete | Complete support |
| Objects | Synthetic | Real Shopify context |

## Key Files & Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| useLiquidRenderer.ts | 278 | Engine setup, filter registration |
| PreviewFrame.tsx | 230 | Iframe + scaling + messaging |
| SectionPreview.tsx | 110+ | Integration + state management |
| buildPreviewContext.ts | 197 | Mock context construction |
| Drop classes | 50-150 each | Type-safe Liquid property access |

## Unresolved Questions

1. **Should native rendering support real Shopify data access?**
   - Requires OAuth token flow + API calls
   - Scope: `read:products`, `read:customers`, etc.
   - Implementation: Server-side middleware or direct API calls?

2. **How to handle authentication for live preview?**
   - Current system is unauthenticated (mock only)
   - Native system needs shop credentials

3. **Cache strategy for native rendering?**
   - Redis? In-process? Database?
   - Invalidation on theme/section changes?

4. **Fallback mechanism if native rendering fails?**
   - Revert to LiquidJS? Show error?
   - Graceful degradation needed?

5. **Performance targets?**
   - First render latency goal?
   - Update latency on code change goal?
   - Max template size to support?
