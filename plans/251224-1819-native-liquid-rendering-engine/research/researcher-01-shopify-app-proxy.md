# Shopify App Proxy: Native Liquid Rendering Engine Research

**Date**: 2025-12-24
**Project**: AI Section Generator (Blocksmith)
**Status**: Research Complete

## Executive Summary

App Proxy enables direct Liquid rendering within Shopify's theme context by returning `Content-Type: application/liquid`. This native rendering approach eliminates iframe overhead and provides full access to Shopify Liquid objects (`shop`, `products`, `collections`, etc.). Critical for Blocksmith's live preview feature as alternative to current client-side rendering.

## 1. App Proxy Configuration

### Configuration in shopify.app.toml

```toml
[app_proxy]
url = "/proxy-endpoint"      # Backend endpoint path
prefix = "apps"              # URL prefix (a, apps, community, tools)
subpath = "my-custom-path"   # Second part of URL (30 chars max)
```

**Resulting storefront URL pattern**:
```
https://<shop_url>/{prefix}/{subpath}     → forwards to → https://<app_url>/proxy-endpoint
https://<shop_url>/{prefix}/{subpath}/child-route → https://<app_url>/proxy-endpoint/child-route
```

### Key Constraints

- **One proxy per app**: Single app can only have one proxy route configured
- **Immutable after install**: `prefix` and `subpath` cannot change post-installation (requires uninstall/reinstall)
- **User customizable**: Merchants can adjust via Admin > Settings > Apps > [Your App] > App proxy > Customize URL
- **Required scope**: `write_app_proxy` access scope mandatory
- **Disallowed headers stripped**: Cookie, Set-Cookie, Authorization, and 18 other security headers removed by Shopify

### Request Flow

1. Merchant visits `https://shop.myshopify.com/apps/my-custom-path`
2. Shopify proxies request with added query parameters:
   - `shop`: merchant domain
   - `logged_in_customer_id`: if customer authenticated
   - `path_prefix`: exact proxy prefix
   - `timestamp`: request time
   - `signature`: HMAC verification (SHA256)
3. App receives request, validates signature, processes, returns response

## 2. HMAC Signature Validation

### Signature Verification Critical for Security

**Important**: Unlike OAuth/webhooks which use `hmac` param, app proxy uses `signature` query param.

### Node.js Implementation (Timing-Safe)

```javascript
import { createHmac } from "crypto";
import { timingSafeEqual } from "crypto";

export function validateAppProxyRequest(query, apiSecret) {
  const signature = query.signature;

  // Build verification string (NO delimiters, alphabetically sorted)
  const toVerify = Object.entries(query)
    .filter(([key]) => key !== "signature")
    .map(([key, value]) => `${key}=${value}`)
    .sort((a, b) => a.localeCompare(b))
    .join("");

  // Calculate HMAC-SHA256
  const calculated = createHmac("sha256", apiSecret)
    .update(toVerify)
    .digest("hex");

  // Timing-safe comparison (prevents timing attacks)
  try {
    return timingSafeEqual(
      Buffer.from(calculated),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
```

### React Router / Remix Integration

React Router template automates validation via `authenticate.public.appProxy(request)`:

```typescript
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }) => {
  // Validates HMAC signature internally, rejects if invalid
  const { liquid, session } = await authenticate.public.appProxy(request);

  if (!session) {
    // Unauthenticated app proxy request (app not installed)
    return liquid("App not installed", { layout: false });
  }

  return liquid(`Welcome to {{shop.name}}`);
};
```

**Signature Parameters Included**:
- `shop` (merchant domain)
- `logged_in_customer_id` (if present)
- `path_prefix`
- `timestamp`
- Excluded: `signature` itself

### Common Validation Mistakes

1. **String encoding**: Ensure query params decoded properly
2. **Sort order**: Must sort alphabetically before joining
3. **Delimiter issue**: No delimiters between key=value pairs (unlike webhooks)
4. **Secret key**: Use API Secret, not any other credential

## 3. Native Liquid Rendering with application/liquid

### How Content-Type Triggers Rendering

When response contains `Content-Type: application/liquid` header, Shopify:
1. Parses response body as Liquid template
2. Renders in context of shop's theme
3. Injects Liquid objects: `shop`, `products`, `collections`, `customer`, `cart`, etc.
4. Returns rendered HTML to storefront

### Liquid Response Helper (React Router)

```typescript
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }) => {
  const { liquid, storefront } = await authenticate.public.appProxy(request);

  // Query external data
  const response = await storefront.graphql(`
    query { products(first: 3) { nodes { title } } }
  `);
  const { data } = await response.json();
  const titles = data.products.nodes.map(p => p.title).join(", ");

  // Return Liquid template (auto-sets Content-Type: application/liquid)
  return liquid(`
    <div class="app-proxy-section">
      <h2>Welcome to {{shop.name}}</h2>
      <p>From our app: ${titles}</p>
      <p>Shop currency: {{shop.currency}}</p>
    </div>
  `);
};
```

### Available Liquid Objects in App Proxy

**Core Shop Objects**:
- `shop` (name, currency, primary_domain, customer_email, etc.)
- `product` (if linked via URL params)
- `collection` (if linked via URL params)
- `cart` (current cart, if accessible)
- `customer` (if logged in)
- All standard Shopify filters (`asset_url`, `money`, `date`, etc.)

### Restrictions

**NOT available** in app proxy Liquid:
- `content_for_header`
- `content_for_index`
- `content_for_layout`
- Theme section objects (app proxy is external render)
- Direct theme asset access (CDN asset_url works)

### Layout Options

```typescript
// With shop theme layout (default)
return liquid("Hello {{shop.name}}");

// Without layout (raw HTML only)
return liquid("Hello {{shop.name}}", { layout: false });

// Returns HTTP 30x redirects automatically followed
```

## 4. Security Considerations

### HMAC Validation (Non-Negotiable)

- **Why**: Ensures request originated from Shopify, not spoofed
- **Implementation**: Always use timing-safe comparison (`timingSafeEqual`)
- **Consequence of skipping**: Attackers can forge requests, access customer data

### Rate Limiting

- **Shopify limit**: App proxies subject to Shopify's standard API rate limits
- **Recommendation**: Implement rate limiting on backend per-shop to prevent abuse
- **Pattern**: Use shop domain + endpoint path as rate limit key

```javascript
const rateLimiter = new Map(); // Per-shop tracking

function checkRateLimit(shop, limit = 100, windowMs = 60000) {
  const key = shop;
  const now = Date.now();

  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  const bucket = rateLimiter.get(key);
  if (now > bucket.resetAt) {
    bucket.count = 1;
    bucket.resetAt = now + windowMs;
    return true;
  }

  bucket.count++;
  return bucket.count <= limit;
}
```

### Cookie Stripping

- **Headers stripped**: Cookie, Set-Cookie, Authorization, and 18 others
- **Impact**: Can't persist auth via cookies
- **Workaround**: Use query string parameters or database lookups with shop domain

### Preventing XSS/CSRF in Liquid Responses

**Caution**: Rendering untrusted data or exposing controls via Liquid is unsafe.

```typescript
// UNSAFE - Sensitive data readable by theme JavaScript
return liquid(`
  <p>Customer token: {{customer.email}}</p>
`);

// SAFER - Use full page rendering instead
return liquid("<iframe src='/full-page-app'/>", { layout: false });
```

### Session Management

App proxy requests have **no built-in session** (unlike admin routes):
- `session` property is `undefined` unless app is installed
- Install detection: `if (!session) { /* app not installed */ }`
- Per-shop data: Query your database using `shop` param from query string

## Integration Opportunity for Blocksmith

### Current Limitation

Blocksmith's live preview currently:
- Returns HTML from frontend
- Client-side Liquid parsing (incomplete/unreliable)
- No access to actual shop context (`{{product}}`, `{{collection}}` scope)

### App Proxy Advantage

1. **Native Liquid rendering**: Return Liquid from backend, Shopify renders with real shop context
2. **Theme integration**: Sections render with actual merchant's theme CSS/layout
3. **Zero JavaScript overhead**: No client-side parsing needed
4. **Performance**: Server-side cached rendering possible

### Proposed Implementation

```typescript
// app/routes/apps.proxy.preview.tsx
export const loader = async ({ request }) => {
  const { liquid, session, admin } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);

  if (!session) return liquid("App not installed", { layout: false });

  const sectionId = url.searchParams.get("section_id");

  // Load generated Liquid from database
  const section = await db.section.findUnique({
    where: { id: sectionId },
  });

  if (!section) return liquid("Section not found", { layout: false });

  // Shopify renders this Liquid with real {{product}}, {{shop}}, etc.
  return liquid(section.liquidCode);
};
```

## Unresolved Questions

1. **Theme context scope**: Do app proxy Liquid templates have access to page context variables (e.g., `{{page}}`, `{{section}}`)?
2. **Performance at scale**: What's impact of rendering complex Liquid (1000+ lines) via app proxy for 100K shops?
3. **Cache strategy**: Does Shopify cache app proxy responses? Should we implement ETags?
4. **Asset serving**: Can app proxy reference theme assets via `asset_url`, or must assets be served externally?
5. **Form submissions**: How to handle CSRF protection for forms in app proxy Liquid?

## Sources

- [About app proxies and dynamic data - Shopify Dev](https://shopify.dev/docs/apps/build/online-store/app-proxies)
- [App proxy - Shopify App Remix](https://shopify.dev/docs/api/shopify-app-remix/v2/authenticate/public/app-proxy)
- [Application Proxies: The New Hotness - Shopify Engineering](https://shopify.engineering/17488588-application-proxies-the-new-hotness)
- [Calculate HMAC with Node.js - GitHub Gist](https://gist.github.com/NeverOddOrEven/3f2809ba368f6f5ce7b4a1923058b92e)
- [Valid Shopify Request - GitHub](https://github.com/DanWebb/valid-shopify-request)
- [Community: Rendering app_proxy in Liquid - Shopify Forums](https://community.shopify.dev/t/how-to-render-app_proxy-serverside-in-liquid-without-javascript/15029)
