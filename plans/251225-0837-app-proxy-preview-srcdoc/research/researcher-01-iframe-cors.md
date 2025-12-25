# Research Report: Iframe Same-Origin Constraints for Shopify App Proxy

**Date**: 2025-12-25
**Research Duration**: Single session
**Topic**: Browser security policies preventing iframe cross-origin loads in Shopify embedded apps

---

## Executive Summary

Shopify storefronts **cannot be loaded in iframes** due to strict `X-Frame-Options: DENY` and `frame-ancestors` CSP headers Shopify applies globally. Shopify embedded apps run inside admin iframe (nested iframe), adding another layer of origin checking. App Proxy URLs inherit these restrictions unless explicitly configured otherwise.

**Key Finding**: Direct iframe src to storefront URLs fails at browser level (CSP enforcement). Alternative: Use `srcDoc` attribute with inline HTML/Liquid, postMessage for communication, or Blob URLs for dynamic content.

---

## Browser Security Mechanisms

### 1. X-Frame-Options Header (Obsolete)
- **Purpose**: Legacy clickjacking protection
- **Shopify Storefront Setting**: `X-Frame-Options: DENY` (blocks all framing)
- **Status**: Deprecated in favor of frame-ancestors (CSP Level 2)
- **Browser Behavior**: Still enforced in older browsers; ignored when frame-ancestors present

### 2. Content-Security-Policy (CSP) frame-ancestors (Modern Standard)
- **Directive**: `Content-Security-Policy: frame-ancestors <sources>`
- **Shopify Storefront**: Sets frame-ancestors to deny all (`'none'`)
- **How It Works**: Browser checks each ancestor in iframe chain; if ANY ancestor fails CSP policy, load is blocked
- **Does NOT Fallback**: Absence of frame-ancestors does NOT default to `default-src`

### 3. Nested Iframe Checking (Critical for Shopify Apps)
- Embedded app sits in admin iframe: `Admin iframe (frame-ancestors: [shop.myshopify.com, admin.shopify.com])` > `Your App iframe (frame-ancestors: [dynamic per shop])`
- **Nested Rule**: ALL ancestors must satisfy frame-ancestors directives
- If outer admin iframe has frame-ancestors that excludes parent, inner iframe load still fails
- Result: Cannot load cross-origin content (e.g., storefront preview) even if App Proxy allows it

---

## Shopify-Specific Constraints

### Storefront Iframe Blocking
| Layer | Mechanism | Value | Impact |
|-------|-----------|-------|--------|
| HTTP Header | X-Frame-Options | DENY | No framing allowed |
| HTTP Header | frame-ancestors | 'none' | No CSP parents allowed |
| Enforcement | Browser CSP | Blocks load | DOMException before render |
| Source | Applied by | Shopify global | All stores, all domains |

### App Proxy URL Restrictions
- **App Proxy Endpoint**: `https://{shop}.myshopify.com/apps/{handle}`
- **Storefront Origin**: Same as shop domain (`{shop}.myshopify.com`)
- **Problem**: iframe `src="https://{shop}.myshopify.com/apps/preview"` still crosses iframe boundary
- **CSP Applied**: Yes, frame-ancestors on App Proxy responses applies to nested checks
- **Result**: iframe src fails even though both are same-origin (different port/path context)

### Embedded App Context
- Embedded apps run in `<iframe src="https://admin.shopify.com/apps/...">` (cross-origin from external host)
- Your app must set: `Content-Security-Policy: frame-ancestors 'self' https://{shop}.myshopify.com https://admin.shopify.com`
- Inner iframe loading storefront: Fails because storefront's CSP frame-ancestors doesn't include admin.shopify.com

---

## What Frame-Ancestors Actually Checks

For nested iframes, frame-ancestors evaluates:
```
Parent Frame 1 (your app) CSP → checks if Parent Frame 2 (admin) origin allowed?
Parent Frame 2 (admin)         → checks if Parent Frame 3 (browser window) allowed?
...and so on up the chain
```

If your app tries to load storefront iframe:
- Storefront has: `frame-ancestors 'none'`
- Browser checks: "Is the parent (your app at admin.shopify.com) in 'none' list?"
- Result: **BLOCKED** - load denied before DOM construction

---

## Alternative Solutions (Workarounds)

### ✅ Option 1: srcDoc Attribute
```html
<iframe srcDoc="<html>...</html>" />
```
- **Works**: Browser treats inline HTML as same-origin (data URI equivalent)
- **Limitation**: Can only contain static HTML/CSS, no external resource loads
- **Use Case**: Rendering static Liquid preview without dynamic assets
- **Security**: Inherits your app's CSP; safe from injection if Liquid is sanitized

### ✅ Option 2: Blob URLs
```javascript
const html = "<html>...</html>";
const blob = new Blob([html], { type: 'text/html' });
const url = URL.createObjectURL(blob);
iframe.src = url;
```
- **Works**: Blob URL treated as same-origin
- **Advantage**: Can update content dynamically without DOM replacement
- **Limitation**: CORS restrictions apply to assets inside blob
- **Cleanup**: Must call `URL.revokeObjectURL()` to free memory

### ✅ Option 3: postMessage Communication
```javascript
// Parent sends Liquid to iframe
iframe.postMessage({ liquid: sectionCode }, '*');

// Iframe receives and renders
window.addEventListener('message', (e) => {
  renderLiquid(e.data.liquid);
});
```
- **Works**: Cross-origin communication without CSP restrictions
- **Use Case**: Dynamic preview updates without full page reload
- **Setup**: Both windows must implement message handlers

### ❌ Option 4: CORS Headers (Doesn't Help)
- `Access-Control-Allow-Origin: *` controls fetch/XHR, NOT iframe loading
- iframe src loading is NOT subject to CORS
- Browser blocks at CSP level before CORS headers are evaluated
- **Conclusion**: CORS headers on App Proxy do NOT enable iframe src loading

---

## Key Findings Summary

| Question | Answer |
|----------|--------|
| **Why iframe src fails to storefront?** | Shopify applies `frame-ancestors 'none'` CSP header; browser enforces at network layer |
| **Does X-Frame-Options still apply?** | Technically yes, but frame-ancestors takes priority in modern browsers |
| **Is App Proxy affected?** | Yes - App Proxy responses inherit CSP checks; iframe src still fails |
| **Nested iframe restrictions?** | ALL ancestors in chain must satisfy frame-ancestors; adds extra validation layer |
| **Can CORS fix this?** | No - CORS is for fetch/XHR; iframe src blocked by CSP before CORS evaluated |
| **Best alternative solution?** | srcDoc for static content, Blob URLs for dynamic, postMessage for communication |
| **Can we disable CSP for preview?** | No - CSP enforced by browser, not server; cannot be bypassed from iframe |

---

## Browser Standards References

- **MDN: frame-ancestors**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- **MDN: X-Frame-Options**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- **OWASP Clickjacking Defense**: https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
- **CSP frame-ancestors Deep Dive**: https://content-security-policy.com/frame-ancestors/

## Shopify Documentation References

- **Iframe Protection Setup**: https://shopify.dev/docs/apps/build/security/set-up-iframe-protection
- **Shopify Dev Community**: https://community.shopify.dev/t/configuring-csp-for-iframe-protection/7774

---

## Unresolved Questions

1. Does Shopify's App Proxy endpoint allow overriding frame-ancestors in response headers, or is it globally enforced?
2. What's the exact CSP behavior for nested iframes when outer frame has `frame-ancestors: 'self'` and inner tries to load `'none'` resource?
3. Are there any Shopify-specific workarounds documented for preview implementations in embedded apps?
4. Can srcDoc be used with external CSS/JS resources via CSP modifications, or is it strictly inline-only?
5. Does postMessage have performance implications for real-time preview updates vs. Blob URL approaches?
