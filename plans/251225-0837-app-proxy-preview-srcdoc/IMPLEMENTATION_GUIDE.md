# srcDoc Preview Implementation Guide
**Status**: Ready for Development | **Priority**: High (Security)

## Problem Statement
Blocksmith preview needs to render Liquid code with real shop context. CORS blocks direct iframe loading of `https://{shop}.myshopify.com/apps/blocksmith-preview`. Current solution: fetch HTML server-side, inject via srcDoc.

## Current Implementation Status
✅ **ALREADY WORKING**:
- Server-side fetch from App Proxy (`api.preview.render`)
- HTML injection via srcDoc (`NativePreviewFrame.tsx`)
- Sandbox isolation (`sandbox="allow-scripts"`)
- Auth handling for password-protected stores

⚠ **SECURITY GAP**:
- No HTML sanitization before injection
- Accepts all rendered Liquid output directly
- XSS risk if Liquid contains untrusted content

## Critical Action Items

### 1. Add HTML Sanitization (MUST DO)
```bash
npm install isomorphic-dompurify
```

**In `app/routes/api.preview.render.tsx`:**

```typescript
import DOMPurify from 'isomorphic-dompurify';

// After fetching HTML (line 204)
const html = await response.text();

// BEFORE returning to client
const sanitized = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: [
    // Structural
    'div', 'span', 'section', 'article', 'header', 'footer',
    // Text
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Media
    'img', 'picture', 'figure', 'figcaption',
    // Forms
    'form', 'input', 'label', 'button', 'textarea', 'select', 'option',
    // Other
    'a', 'button', 'br', 'hr',
    // Shopify-specific (keep inline styles from Liquid)
    'style',
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style', 'src', 'alt', 'href', 'name', 'type',
    'value', 'placeholder', 'data-*', 'aria-*',
  ],
  KEEP_CONTENT: true,
});

return data<ProxyResponse>(
  { html: sanitized, mode: "native" },
  { headers: SECURITY_HEADERS }
);
```

### 2. Document Sandbox Rationale
In `app/components/preview/NativePreviewFrame.tsx`, add comment:

```tsx
<iframe
  srcDoc={fullHtml}
  // Sandbox without allow-same-origin = unique origin + script restriction
  // Prevents iframe from accessing parent DOM/cookies while allowing interactivity
  sandbox="allow-scripts"
  ...
/>
```

### 3. Add Response Headers Test
Verify CSP headers are returned from preview endpoint:

```typescript
// In test file
test('api.preview.render returns CSP headers', async () => {
  const response = await fetch('/api/preview/render', { ... });
  expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'none'");
});
```

## Architecture Decision

| Component | Implementation | Why |
|-----------|---|---|
| **Fetch** | Server-side only | SSRF prevention, auth handling |
| **Injection** | srcDoc (not src) | CORS bypass, content control |
| **Sandbox** | `allow-scripts` only | Scripts allowed, parent DOM protected |
| **Sanitization** | DOMPurify server-side | Prevent XSS before injection |
| **Fallback** | Client-side rendering (existing) | Graceful degradation |

## Browser Support
- ✅ All modern browsers (Chrome 93+, Firefox 90+, Safari 10+, Edge 79+)
- ⚠ IE11: Unsupported (fallback to data URL or client-side rendering)

## Performance Notes
- Debounce: 600ms (prevents API spam)
- Timeout: 10 seconds (max fetch wait)
- Caching: Not implemented (consider for production)

## Testing Checklist

- [ ] Sanitization preserves Shopify Liquid markup
- [ ] Event handlers in Liquid still work
- [ ] Inline styles render correctly
- [ ] Form submissions work (if needed)
- [ ] No console errors for CSP violations
- [ ] Password-protected stores authenticate
- [ ] Loading states display correctly
- [ ] Error states display with retry

## Unresolved Questions for Team

1. **Dynamic Liquid Scripts**: Should generated sections have `<script>` tags? Or are they handled by Shopify theme?
2. **CSS Injection Risk**: Can Liquid output contain XSS via CSS? (e.g., `background: url(javascript:...)`)
3. **Performance Target**: Any SLA for preview render time?
4. **Cache Strategy**: Should we cache rendered HTML by code hash + settings hash?

## Files Changed
- `app/routes/api.preview.render.tsx` - Add sanitization
- `app/components/preview/NativePreviewFrame.tsx` - Add documentation
- `package.json` - Add `isomorphic-dompurify`

## Rollout Plan
1. Add DOMPurify dependency
2. Implement sanitization in preview endpoint
3. Test with existing sections (ensure no breakage)
4. Deploy to staging
5. Monitor for sanitization errors (log failures)
6. Deploy to production

**Estimate**: 2-4 hours implementation + testing
