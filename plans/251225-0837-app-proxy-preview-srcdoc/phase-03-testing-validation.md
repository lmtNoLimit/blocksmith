# Phase 03: Testing & Validation

**Objective**: Verify srcDoc implementation works correctly and securely.

---

## Functional Tests

### 1. Basic Rendering
```
[ ] Empty Liquid code shows "No code to preview"
[ ] Valid Liquid code renders in iframe
[ ] HTML content displays correctly styled
```

### 2. Settings Integration
```
[ ] Schema settings parse correctly
[ ] Settings changes trigger re-render (600ms debounce)
[ ] Block instances render in order
[ ] Resource context (product/collection handles) passes through
```

### 3. Device Size Scaling
```
[ ] Mobile (375px) renders and scales
[ ] Tablet (768px) renders and scales
[ ] Desktop (1200px) renders at full width
[ ] Scaling calculates correctly when container < target width
```

### 4. Error Handling
```
[ ] Network failure shows error banner
[ ] Timeout (10s) shows error banner
[ ] Invalid Liquid shows Shopify error (from App Proxy)
[ ] Password-protected store fallback works
```

### 5. Refresh Behavior
```
[ ] onRefreshRef.current() triggers new fetch
[ ] Loading spinner shows during refresh
[ ] Multiple rapid refreshes don't cause race conditions
```

---

## Security Tests

### 1. XSS Prevention (DOMPurify)
```
[ ] <script>alert(1)</script> → stripped
[ ] <img onerror="alert(1)"> → onerror removed
[ ] <a href="javascript:alert(1)"> → href sanitized
[ ] <div onclick="alert(1)"> → onclick removed
[ ] <style>@import 'evil.css'</style> → import stripped
```

### 2. Iframe Isolation
```
[ ] sandbox="allow-scripts" present (NOT allow-same-origin)
[ ] Iframe cannot access parent window.document
[ ] Iframe cannot access parent localStorage/cookies
[ ] CSP headers present on api.preview.render response
```

### 3. SSRF Prevention
```
[ ] Request uses session.shop (not body.shopDomain)
[ ] Only authenticated users can call endpoint
[ ] Invalid session returns 401
```

---

## Browser Compatibility

```
[ ] Chrome 93+ - srcDoc works
[ ] Firefox 90+ - srcDoc works
[ ] Safari 10+ - srcDoc works
[ ] Edge 79+ - srcDoc works
```

---

## Console Verification

Expected logs on successful render:
```
[ProxyRender] ========== DEBUG START ==========
[ProxyRender] Shop: myshop.myshopify.com
[ProxyRender] Full URL: https://myshop.myshopify.com/apps/blocksmith-preview?...
[ProxyRender] Has cookies: true
[ProxyRender] Response status: 200 OK
[ProxyRender] ========== DEBUG END ==========
```

No errors expected:
```
[ ] No CORS errors in console
[ ] No CSP violations
[ ] No "Refused to frame" errors
```

---

## Manual Test Script

```tsx
// Paste in browser console on section editor page
// Should see preview update without errors

const testLiquid = `
<div class="test-section">
  <h1>{{ section.settings.title }}</h1>
  <p>Hello from srcDoc preview!</p>
</div>
{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "text", "id": "title", "label": "Title", "default": "Test Title" }
  ]
}
{% endschema %}
`;

// Check network tab for /api/preview/render request
// Response should have { html: "...", mode: "native" }
```

---

## Regression Checklist

```
[ ] SectionPreview.tsx still works (uses AppProxyPreviewFrame)
[ ] CodePreviewPanel renders preview correctly
[ ] Section editor full workflow: generate → preview → edit → preview
[ ] Settings panel changes reflect in preview
[ ] No TypeScript errors in modified files
[ ] Lint passes: npm run lint
[ ] Tests pass: npm test (if applicable)
```

---

## Performance Baseline

Measure before/after:
- Time from code change to preview update (target: <1s)
- Network payload size (HTML response)
- Memory usage (no leaks from repeated renders)

---

## Cleanup Tasks (Post-Validation)

After confirming everything works:
```
[ ] Remove unused useAppProxyAuth hook import from AppProxyPreviewFrame
[ ] Consider deleting useAppProxyAuth.ts if unused elsewhere
[ ] Remove debug console.logs from api.preview.render
[ ] Update component JSDoc comments
```
