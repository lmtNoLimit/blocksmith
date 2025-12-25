# srcDoc Implementation Research
**Date**: 2025-12-25 | **Status**: Implementation-Ready

## Executive Summary
srcdoc is **production-viable** for Blocksmith preview. Current implementation (`NativePreviewFrame.tsx`) already uses it correctly with `sandbox="allow-scripts"`. The server-side fetch pattern (`api.preview.render`) successfully addresses cross-origin restrictions. Focus: security hardening via HTML sanitization.

---

## 1. srcDoc vs Traditional src Approach

### What is srcDoc?
- Inline HTML content directly in iframe, bypassing external URL requirements
- Takes priority when both `src` and `srcdoc` specified (fallback support)
- Document URL is `about:srcdoc` (inherits parent origin rules)
- Modern browsers support; IE11 and below unsupported (data URL fallback viable)

### Blocksmith Context
**Current state**: Using srcDoc correctly with `sandbox="allow-scripts"` only
- ✅ Server fetches rendered HTML from App Proxy (`api.preview.render`)
- ✅ Injects HTML via srcDoc to bypass CORS
- ✅ Sandbox restricts scripts from accessing parent DOM
- ⚠ No HTML sanitization (accepts rendered Liquid directly)

### Advantages Over Direct URL Loading
1. **CORS bypass**: No cross-origin restrictions
2. **Authentication**: Server-side handles password cookies
3. **Content control**: Inspect/sanitize HTML before injection
4. **Debugging**: Full control over content pipeline

---

## 2. Security Deep Dive

### XSS & HTML Injection Risks
**Risk Level**: HIGH if untrusted HTML
- srcdoc parses input as HTML (injection sink)
- Malicious content can execute within iframe context
- Even with `sandbox="allow-scripts"`, certain attack vectors exist via CSS and form handlers

**Blocksmith Mitigation**:
1. Server renders via Shopify (trusted source)
2. Sandbox attribute prevents parent DOM access
3. **Gap**: No sanitization for injected Liquid output

### CSP & Sandbox Interaction
```html
<!-- Current Blocksmith setup -->
<iframe
  srcDoc={fullHtml}
  sandbox="allow-scripts"
  ...
/>
```

**Why `allow-scripts` alone is safe**:
- ✅ `allow-same-origin` NOT set → unique origin
- ✅ Scripts isolated from parent DOM/cookies
- ✅ No Cookie/localStorage access
- ✅ CSP in parent page inherited (good)

**Do NOT use together**:
```html
<!-- UNSAFE - DO NOT USE -->
sandbox="allow-scripts allow-same-origin"
<!-- Iframe can remove sandbox and break out -->
```

### CSP Header Recommendations
```typescript
// In api.preview.render (already implemented!)
const SECURITY_HEADERS = {
  "Content-Security-Policy": "script-src 'none'; object-src 'none'; frame-ancestors 'self'",
  "X-Content-Type-Options": "nosniff",
};
```
✅ Correct: Blocks external scripts, prevents framing outside app

---

## 3. HTML Sanitization Strategy

### Current Gap
Server fetches Shopify-rendered HTML but **doesn't sanitize** before injection. For untrusted Liquid inputs, this is a risk vector.

### Recommended: DOMPurify Integration

**Library**: DOMPurify v3.3.1+ (44K weekly npm downloads)
- Super-fast XSS sanitizer
- Works in Node.js (isomorphic-dompurify) and browsers
- Trusted Types support for additional security

**Implementation Pattern**:

```typescript
// Server-side (api.preview.render)
import DOMPurify from 'isomorphic-dompurify';

const html = await response.text();

// Sanitize before returning to client
const sanitized = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'a', 'img', 'h1', 'h2', 'h3',
    'ul', 'ol', 'li', 'section', 'article', 'header', 'footer',
    'style' // Shopify Liquid often includes inline styles
  ],
  ALLOWED_ATTR: ['class', 'id', 'src', 'alt', 'href', 'style'],
});

return data<ProxyResponse>(
  { html: sanitized, mode: "native" },
  { headers: SECURITY_HEADERS }
);
```

**Trusted Types (Future)**:
```typescript
const clean = DOMPurify.sanitize(html, {
  RETURN_TRUSTED_TYPE: true // Returns TrustedHTML object
});
```

---

## 4. Server-Side Fetch Pattern (CURRENT)

### How Blocksmith Does It
1. **Client** posts code/settings to `/api/preview/render`
2. **Server** authenticates request (SSRF prevention via `session.shop`)
3. **Server** builds proxy URL: `https://{shop}/apps/blocksmith-preview?code=...`
4. **Server** fetches with auth cookies (password-protected stores)
5. **Client** receives HTML via srcDoc

### Security Controls (Already In Place)
- ✅ Session-based auth prevents SSRF (uses `session.shop`, not request body)
- ✅ 10-second fetch timeout (prevents hanging)
- ✅ Code length limit (100KB max)
- ✅ Redirect handling (detects password walls)
- ✅ CSP headers block external frames

### Debouncing & Performance
```typescript
// Current implementation (AppProxyPreviewFrame)
debounceRef.current = window.setTimeout(() => {
  setIframeSrc(proxyUrl);
}, debounceMs); // 600ms default
```
✅ Prevents API spam, manages request load

---

## 5. Alternative Approaches (Evaluated)

### Option A: Direct App Proxy URL (CURRENT FALLBACK)
```jsx
<iframe src={proxyUrl} /> // Direct load in browser
```
- ❌ CORS fails for cross-origin shops
- ✅ Works for dev testing
- Not suitable for production

### Option B: Blob URLs (NOT RECOMMENDED)
```typescript
const blob = new Blob([html], { type: 'text/html' });
const blobUrl = URL.createObjectURL(blob);
<iframe src={blobUrl} />
```
- ✅ Performance: No server round-trip on re-renders
- ✅ Bypasses CORS like srcDoc
- ❌ Memory leak risk (must call `revokeObjectURL`)
- ❌ Safari blocks blob: URLs in iframes (mixed content checks)
- ❌ Less clear for debugging

### Option C: postMessage Bridge
```typescript
// Parent sends HTML to iframe via messaging
window.postMessage({ type: 'SET_CONTENT', html }, '*')
```
- ✅ Fine-grained control
- ❌ Complex two-way binding
- ❌ Origin validation overhead
- Not needed for this use case

### Option D: Server-Side Rendering + Caching
```typescript
// Cache rendered HTML by code hash
const cacheKey = hash(code + JSON.stringify(settings));
if (cache.has(cacheKey)) return cached;
```
- ✅ Reduces re-renders
- ❌ Complex cache invalidation
- ✅ Viable for production optimization

---

## 6. Implementation Checklist

### Critical (Security)
- [ ] Add HTML sanitization (DOMPurify) to `api.preview.render`
- [ ] Whitelist allowed HTML tags specific to Shopify Liquid output
- [ ] Validate content-type before sanitization
- [ ] Test XSS vectors: `<script>`, `<style onclick>`, event handlers

### High Priority
- [ ] Document sandbox attribute rationale in code comments
- [ ] Add Content-Security-Policy header tests
- [ ] Implement error logging for sanitization failures

### Nice-to-Have
- [ ] Response caching by code hash (performance)
- [ ] Blob URL fallback for browsers with fetch issues
- [ ] Trusted Types integration (future-proof)

---

## 7. Key Code Locations

| File | Role |
|------|------|
| `app/routes/api.preview.render.tsx` | Server-side fetch + HTML preparation |
| `app/components/preview/NativePreviewFrame.tsx` | Iframe with srcDoc (correct) |
| `app/components/preview/hooks/useNativePreviewRenderer.ts` | API caller with debounce |

---

## Browser Support & Fallbacks

| Browser | srcDoc Support | Status |
|---------|---|--------|
| Chrome 93+ | ✅ Full | Modern standard |
| Firefox 90+ | ✅ Full | Stable |
| Safari 10+ | ✅ Full | Wide adoption |
| Edge 79+ | ✅ Full | Chromium-based |
| IE 11 | ❌ No | Use data URL fallback |

**Recommended**: srcDoc as primary, data URL fallback for IE (if needed).

---

## Security Headers Reference

```typescript
// Optimal CSP for preview context
"Content-Security-Policy": [
  "default-src 'self'",
  "script-src 'unsafe-inline'", // Needed for inline Liquid JS
  "style-src 'unsafe-inline'",   // Needed for inline Liquid styles
  "img-src *",                    // Allow external images
  "frame-ancestors 'self'",       // Prevent embedding outside app
].join('; ')
```

---

## Unresolved Questions

1. **Liquid-generated script handling**: Should we allow `<script>` tags from Shopify Liquid? (May be needed for dynamic sections)
2. **CSS injection risk**: DOMPurify strips dangerous CSS. Is Shopify's Liquid output already safe?
3. **Performance target**: Any latency SLA for preview rendering?
4. **Cache invalidation**: Strategy for clearing cached renders on Liquid code changes?

---

## Sources

Security & CSP:
- [CSP frame-src Guide](https://content-security-policy.com/frame-src/)
- [MDN: srcDoc Property](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc)
- [CSP frame-src Directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-src)
- [iframe Sandbox Security](https://web.dev/articles/sandboxed-iframes)
- [Securing Sandboxed iframes](https://blog.dareboost.com/en/2015/07/securing-iframe-sandbox-attribute/)

XSS & Sanitization:
- [Iframes in XSS, CSP & SOP](https://book.hacktricks.xyz/pentesting-web/xss-cross-site-scripting/iframes-in-xss-and-csp)
- [XSS Prevention OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify NPM](https://www.npmjs.com/package/dompurify)
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)

postMessage & Cross-Origin:
- [Window postMessage MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [Securing postMessage Communication](https://www.bindbee.dev/blog/secure-cross-window-communication)

Blob URLs & Data URLs:
- [blob: URLs - MDN](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob)
- [Data URI Scheme](https://en.wikipedia.org/wiki/Data_URI_scheme)

---

**Next Step**: Implement HTML sanitization in `api.preview.render` per security checklist.
