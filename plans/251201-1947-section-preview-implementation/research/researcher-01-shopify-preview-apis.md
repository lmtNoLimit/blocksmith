# Shopify Theme Section Preview Capabilities & APIs

**Research Date**: 2025-12-01
**Conversation ID**: 67819a91-a837-4320-a9ca-d0ee4d80cdb8

## Executive Summary

Shopify provides multiple preview mechanisms for themes/sections, but NO direct GraphQL API for previewing individual sections before publishing. Instead, preview functionality is achieved through CLI tools, theme editor integration, and storefront preview links.

---

## Available Preview Mechanisms

### 1. Theme Editor Preview (Visual)
- **Access**: Built-in to Shopify Admin at `/admin/themes/{themeId}/editor`
- **Live Preview**: Renders theme with live CSS/text setting updates
- **Scope**: Full theme preview with section/block selection
- **Limitations**: Only color and text settings support live preview without page reload
- **Key Feature**: Theme editor emits JavaScript events (`shopify:section:load`, `shopify:block:select`, etc.)

**Detection in Code**:
```liquid
{% if request.design_mode %}
  <!-- Running in theme editor -->
{% endif %}
```

```javascript
if (Shopify.designMode) {
  // Running in theme editor
}
```

### 2. Development Theme Preview (Local Hot-Reload)
- **Command**: `shopify theme dev --store {store}`
- **URL**: `http://127.0.0.1:9292` (Chrome only)
- **Features**: Hot-reload CSS & sections, full-page refresh for other changes
- **Advantage**: Real-time preview with store's actual data
- **Limitation**: Only available during development; destroyed on `shopify auth logout`

### 3. Storefront Preview Links
- **Type**: Time-limited, shareable preview URLs
- **Format**: `https://{randomId}.shopifypreview.com/...`
- **Generation**: Via `shopify theme dev`, `shopify theme push`, or `shopify theme share`
- **Lifetime**: Persists beyond logout if pushed to unpublished theme
- **Use Case**: Share unpublished changes with clients

### 4. Theme Editor Preview Inspector
- **Access**: Visual picker within theme editor
- **Function**: Click-to-edit sections directly in preview
- **Events**: `shopify:inspector:activate`, `shopify:inspector:deactivate`
- **Limitation**: CSS outline detection uses `Element.getBoundingClientRect()`

---

## GraphQL Operations & API Endpoints

### No Direct Section Preview Mutation Exists
Shopify Admin GraphQL does NOT provide:
- `previewSection()` mutation
- `generateSectionPreview()` query
- Asset preview API for individual sections

### Theme Management Operations Available
```graphql
query GetThemes {
  shop {
    themes(first: 10) {
      nodes {
        id
        name
        role  # "main", "unpublished", "development"
      }
    }
  }
}

mutation PublishTheme {
  themePublish(input: {themeId: "gid://shopify/OnlineStore/Theme/123"}) {
    theme { id }
  }
}
```

---

## For Embedded Apps: Critical Limitations

1. **No Direct Preview API**
   - Cannot render section preview without pushing to theme first
   - No sandbox/staging endpoint for preview rendering

2. **Access Restrictions**
   - Embedded apps run in Shopify Admin iframe
   - Cannot directly access `http://127.0.0.1:9292`
   - Cannot generate preview links programmatically via GraphQL

3. **Workarounds for Preview Feature**
   - **Option A**: Push generated Liquid to unpublished theme → generate shareable preview link via CLI (external process)
   - **Option B**: Provide code preview only (syntax highlighting, not rendered output)
   - **Option C**: Use Section Rendering API (AJAX) for dynamic section rendering in admin preview

---

## Section Rendering API (AJAX)

**Endpoint**: `POST /cart/render-section`
**Purpose**: Dynamically render Liquid sections client-side
**Key Limitation**: Requires section already saved to theme; cannot preview unsaved code

```javascript
fetch('/cart/render-section', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    section_id: 'featured-product'
  })
}).then(r => r.text()).then(html => {
  // Rendered section HTML
});
```

---

## Theme Editor JavaScript Events

Useful for custom preview interactions:

| Event | Detail | Trigger |
|-------|--------|---------|
| `shopify:section:load` | `{sectionId}` | Section added/re-rendered |
| `shopify:section:select` | `{sectionId, load}` | User selected section |
| `shopify:block:select` | `{blockId, sectionId, load}` | User selected block |
| `shopify:inspector:activate` | — | Preview inspector toggled on |

---

## Recommendations for This App

**For Section Preview Feature**:

1. **Code-Only Preview** (Easiest)
   - Display generated Liquid with syntax highlighting
   - No actual rendering needed

2. **Live Preview via Theme Duplication**
   - Create temporary unpublished theme
   - Push generated section to temp theme
   - Generate preview link via CLI
   - Delete temp theme after preview expires (15 min)
   - *Risk*: API rate limits; overhead for each preview

3. **Section Rendering API** (Limited)
   - Only works for sections already in theme
   - Not suitable for previewing new, unsaved code

**Key Constraint**: Embedded app context prevents direct storefront rendering. Real preview requires pushing to theme first.

---

## Sources

- [Shopify CLI Theme Dev Command](https://shopify.dev/docs/api/shopify-cli/theme/theme-dev)
- [Theme Editor Integration](https://shopify.dev/docs/storefronts/themes/tools/online-editor)
- [Integrate Sections with Theme Editor](https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks)
- [Theme Preview Inspector Best Practices](https://shopify.dev/docs/storefronts/themes/best-practices/editor/preview-inspector)
- [Liquid Request Object](https://shopify.dev/docs/api/liquid/objects/request)
- [Shopify CLI Theme Share](https://shopify.dev/docs/api/shopify-cli/theme/theme-share)

---

## Unresolved Questions

1. Can we use `Section Rendering API` for unpublished sections via Admin API token?
2. Are there rate limits on creating/deleting temporary themes for preview purposes?
3. Is there a "Preview" theme role that persists longer than development themes?
