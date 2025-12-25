# App Proxy Rendering Analysis

## Executive Summary
The app uses a 3-layer preview pipeline: client → internal proxy → app proxy → native Liquid. Settings flow from the SettingsPanel through base64 encoding to the internal proxy, which stores via token or URL params, then injects into Liquid as individual `settings_*` assigns. This avoids App Proxy's lack of parse_json filter.

## Current Architecture

### 1. App Proxy Endpoint (`api.proxy.render.tsx`, lines 31-119)
**Location**: `/apps/blocksmith-preview` on Shopify storefront

**Input Methods**:
- **Token-based** (for large payloads): `?token=abc123` retrieves code/settings/blocks from server cache
- **URL params** (for small payloads): `?code=...&settings=...&blocks=...&product=...&collection=...&section_id=...`

**Flow**:
1. Validates HMAC via `authenticate.public.appProxy(request)` (line 33)
2. Retrieves cached data from token store if token present (lines 53-79)
3. Falls back to URL param parsing via `parseProxyParams()` (line 88)
4. Wraps Liquid code with context via `wrapLiquidForProxy()` (lines 105-112)
5. Returns as `application/liquid` for native rendering

**Security**:
- Max code length: 100KB (line 25)
- Validates handle format (VALID_HANDLE_REGEX, lines 38-39)
- Section ID validation: alphanumeric + underscore + hyphen, max 64 chars

### 2. Internal Proxy Endpoint (`api.preview.render.tsx`, lines 80-310)
**Location**: `/api/preview/render` (POST only)

**Purpose**: Client-side fetch gateway that:
- Prevents CORS/CSP issues by fetching server-side
- Uses session auth for password-protected stores
- Auto-selects token or URL params based on size (line 134)
- Sanitizes HTML via DOMPurify (line 291)

**Request Body**:
```json
{
  "shopDomain": "...",     // Ignored - uses session.shop (line 90)
  "code": "base64-encoded-liquid",
  "settings": "base64-json",
  "blocks": "base64-json-array",
  "product": "product-handle",
  "collection": "collection-handle",
  "section_id": "preview"
}
```

**Logic** (lines 124-153):
- Builds full URL with all params
- If URL > 2000 chars: stores data via `storePreviewData()`, uses token instead
- If URL ≤ 2000 chars: includes params directly in URL

**Response**:
```json
{
  "html": "sanitized-html",
  "mode": "native|fallback",
  "error": "error-message"  // Only if mode=fallback
}
```

### 3. Settings Data Flow

#### 3a. Client Collection (SettingsPanel.tsx, lines 36-54)
- User changes settings via individual SettingField components
- onChange callback updates parent state: `SettingsState` (simple KV map)
- Each setting value is primitive: string | number | boolean | null

#### 3b. Client Encoding (useNativePreviewRenderer.ts, lines 73-96)
```typescript
// buildProxyBody() creates request:
{
  code: base64Encode(liquidCode),
  settings: base64Encode(JSON.stringify(settings)),  // Line 82
  blocks: base64Encode(JSON.stringify(blocks)),      // Line 87
  product: productHandle,
  collection: collectionHandle
}
```

#### 3c. Server Processing (api.preview.render.tsx, lines 104-153)
- Receives base64-encoded strings
- Passes as-is to App Proxy (no decoding)
- Size check determines token vs URL params

#### 3d. App Proxy Decoding (api.proxy.render.tsx, lines 62-70)
```typescript
// Decode base64 from URL/token:
settings = JSON.parse(Buffer.from(previewData.settings, "base64").toString("utf-8"))
blocks = JSON.parse(Buffer.from(previewData.blocks, "base64").toString("utf-8"))
```

#### 3e. Liquid Injection (liquid-wrapper.server.ts, lines 63-107)
```typescript
// generateSettingsAssigns() converts to Liquid assigns:
// Input: { title: "Featured", columns: 3 }
// Output:
//   {% assign settings_title = 'Featured' %}
//   {% assign settings_columns = 3 %}
```

**Why assigns instead of parse_json?**
- App Proxy Liquid lacks `parse_json` filter (line 5 comment)
- Can't do `{{ section.settings.title }}`
- Must use flat namespace: `{{ settings_title }}`

### 4. Preview Frame Setup (AppProxyPreviewFrame.tsx)

**Rendering**:
- Fetches HTML via internal proxy (line 66)
- Injects into iframe via `srcDoc` property (line 241)
- NOT via direct iframe src to App Proxy (security: bypass CORS)

**HTML Document** (lines 119-149):
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport">
    <style> /* Base styles */ </style>
  </head>
  <body>
    ${html}  <!-- Sanitized response from internal proxy -->
    <script>
      // Height reporting via postMessage with nonce validation
      window.parent.postMessage({
        type: 'PREVIEW_HEIGHT',
        height: document.body.scrollHeight,
        nonce: '${messageNonce}'
      }, '*');
    </script>
  </body>
</html>
```

**Sandbox**: `allow-scripts` only (line 244) - isolates iframe from parent DOM

### 5. Context Injection (liquid-wrapper.server.ts, lines 72-88)

**Product/Collection Context**:
```liquid
{% assign product = all_products['product-handle'] %}
{% assign collection = collections['collection-handle'] %}
```
Used for `{{ product.title }}`, `{{ collection.title }}` etc.

**CSS Isolation**:
```html
<div class="blocksmith-preview" id="shopify-section-${sectionId}">
  ${liquidCode}
</div>
<style>
  .blocksmith-preview { font-family: system-ui; }
  .blocksmith-preview img { max-width: 100%; }
</style>
```

## Current Limitations

1. **No Complex Settings**: Only primitive types (string, number, boolean, null) → arrays/objects skipped (settings-transform.server.ts, line 75)
2. **Section.settings Rewrite**: Heuristic-based, brittle with edge cases (line 136-141)
3. **Block Iteration**: `for block in section.blocks` not auto-transformed; templates must use `block_N_X` pattern directly (settings-transform.server.ts, lines 144-156)
4. **4KB Payload Limit**: Settings JSON assumed ≤ 4KB (MAX_SETTINGS_SIZE, line 13)
5. **No Resource Drops**: Settings can't be product/collection references directly; only handles stored as strings

## Key Files & Line Numbers

| File | Purpose | Key Lines |
|------|---------|-----------|
| `api.proxy.render.tsx` | App Proxy endpoint | 31-119 |
| `api.preview.render.tsx` | Internal proxy | 80-153 |
| `AppProxyPreviewFrame.tsx` | Preview iframe | 48-261 |
| `useNativePreviewRenderer.ts` | Settings fetch hook | 29-185 |
| `SettingsPanel.tsx` | Settings UI | 36-54 |
| `liquid-wrapper.server.ts` | Settings→Liquid | 63-107 |
| `settings-transform.server.ts` | Assign generation | 50-123 |
| `preview-token-store.server.ts` | Token cache | 63-97 |

## Data Flow Summary

```
SettingsPanel (user input)
    ↓
useNativePreviewRenderer (base64 encode)
    ↓
/api/preview/render (size check, token storage)
    ↓
App Proxy /apps/blocksmith-preview (base64 decode)
    ↓
wrapLiquidForProxy (generate assigns)
    ↓
{% assign settings_* = value %}
    ↓
Shopify native Liquid rendering
    ↓
AppProxyPreviewFrame (iframe srcDoc injection)
```

## Unresolved Questions

- Does `rewriteSectionSettings()` handle all edge cases (nested properties, whitespace)?
- How do merchants currently reference blocks in templates without iteration?
- Is 4KB settings limit enforced or estimated?
