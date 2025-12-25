# Phase 02: Add HTML Sanitization (Security)

**Target File**: `app/routes/api.preview.render.tsx`
**Library**: `isomorphic-dompurify` (works in Node.js)

---

## Security Gap

Current flow:
1. Server fetches HTML from Shopify App Proxy
2. HTML returned to client **without sanitization**
3. Client injects HTML via srcDoc

**Risk**: Malicious Liquid code could inject XSS via rendered HTML.

---

## Implementation Steps

### Step 1: Install DOMPurify

```bash
npm install isomorphic-dompurify
npm install -D @types/dompurify  # TypeScript types
```

### Step 2: Add Import

```tsx
// At top of api.preview.render.tsx
import DOMPurify from 'isomorphic-dompurify';
```

### Step 3: Create Sanitization Config

```tsx
// After SECURITY_HEADERS const
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    // Structure
    'div', 'span', 'section', 'article', 'header', 'footer', 'main', 'nav', 'aside',
    // Text
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 'u', 'br',
    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    // Links & Media
    'a', 'img', 'picture', 'source', 'video', 'audio', 'figure', 'figcaption',
    // Forms (for interactive sections)
    'form', 'input', 'button', 'select', 'option', 'textarea', 'label',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    // Shopify Liquid specific
    'style', 'noscript', 'template',
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style', 'data-*',
    // Links
    'href', 'target', 'rel',
    // Media
    'src', 'srcset', 'alt', 'width', 'height', 'loading',
    // Forms
    'type', 'name', 'value', 'placeholder', 'required', 'disabled',
    // Accessibility
    'aria-*', 'role', 'tabindex',
  ],
  ALLOW_DATA_ATTR: true,
  // Allow Shopify's inline styles
  ALLOW_UNKNOWN_PROTOCOLS: false,
  // Keep safe URIs only
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};
```

### Step 4: Sanitize Before Return

Modify the success response sections (lines 176-180, 204-220):

```tsx
// After fetching HTML successfully
const rawHtml = await response.text();

// Sanitize the HTML
const sanitizedHtml = DOMPurify.sanitize(rawHtml, DOMPURIFY_CONFIG);

// Log if sanitization removed content (for debugging)
if (sanitizedHtml.length < rawHtml.length * 0.9) {
  console.warn(
    '[ProxyRender] Sanitization removed significant content:',
    { original: rawHtml.length, sanitized: sanitizedHtml.length }
  );
}

return data<ProxyResponse>(
  { html: sanitizedHtml, mode: "native" },
  { headers: SECURITY_HEADERS }
);
```

---

## Full Modified Section

Replace lines 203-221:

```tsx
// Return the rendered HTML with mode indicator
const rawHtml = await response.text();

// Final check: if HTML contains password form, auth failed silently
if (
  rawHtml.includes('form_type="storefront_password"') ||
  rawHtml.includes('id="password"')
) {
  console.log("[ProxyRender] Password form in response, using fallback");
  return data<ProxyResponse>(
    { html: null, mode: "fallback", error: "Store is password-protected" },
    { headers: SECURITY_HEADERS }
  );
}

// Sanitize HTML before returning to client
const sanitizedHtml = DOMPurify.sanitize(rawHtml, DOMPURIFY_CONFIG);

return data<ProxyResponse>(
  { html: sanitizedHtml, mode: "native" },
  { headers: SECURITY_HEADERS }
);
```

---

## Script Tag Considerations

**Question**: Should `<script>` tags be allowed?

**Recommendation**: NO for now.
- Shopify sections rarely need custom JS
- JS can be added via theme settings if needed
- Higher security risk

If needed later, add:
```tsx
ALLOWED_TAGS: [..., 'script'],
ADD_TAGS: ['script'],
```

---

## Testing Checklist

- [ ] Normal Liquid renders correctly
- [ ] Inline styles preserved
- [ ] Images render with correct URLs
- [ ] Links work (href preserved)
- [ ] Malicious `<script>` tags removed
- [ ] `onclick` attributes stripped
- [ ] `javascript:` URIs blocked
- [ ] `data-*` attributes preserved
