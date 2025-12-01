# Research Report: Iframe-Based Preview Implementation Patterns

**Research Date:** 2025-12-01
**Status:** Complete
**Token Efficiency:** 5/5 searches used

---

## Executive Summary

Iframe-based previews provide isolated preview environments through postMessage-based communication with CSR or SSR rendering approaches. LiquidJS enables client-side Liquid template rendering. Hybrid architectures (CSR for interactivity + SSR for heavy content) balance performance and responsiveness. Security requires origin validation, sandbox attributes, and HTTPS enforcement.

---

## Architecture Options

### 1. Client-Side Rendering (CSR) - Preferred for Real-Time Updates
**Mechanism:** Preview iframe loads minimal HTML + JavaScript bundle. Data updates trigger client-side re-renders without full page reload.

**Pros:**
- Real-time preview updates (50-200ms latency possible)
- Lower server load - all rendering happens in browser
- Better for interactive preview scenarios
- Faster subsequent updates

**Cons:**
- Heavier initial bundle size
- Device-dependent performance
- Requires more client-side processing

**Best For:** Section generators, design systems, interactive templates

### 2. Server-Side Rendering (SSR) - Heavy Content
**Mechanism:** Each preview update triggers iframe reload with fresh HTML from server containing pre-rendered content.

**Pros:**
- Faster initial page load (especially for heavy content)
- Better for SEO (though less relevant for previews)
- Consistent performance across devices
- Server-controlled rendering

**Cons:**
- Full page reloads required (visible flicker)
- Higher server load under heavy usage
- Network latency on each update
- Not suitable for real-time editing

**Best For:** Content management systems, static preview snapshots

### 3. Hybrid (Isomorphic/Universal) - Optimal
**Mechanism:** Server renders initial HTML for fast first paint. JavaScript framework takes over for client-side updates.

**Recommended approach** for section previews: Server-render base template + LiquidJS client-side data injection for updates.

---

## Liquid Template Rendering Solutions

### LiquidJS - Client-Side Rendering
**Library:** [harttle/liquidjs](https://github.com/harttle/liquidjs) - Pure JavaScript, Shopify-compatible

```javascript
import { Liquid } from 'liquidjs';

const engine = new Liquid();
const tpl = engine.parse(templateString);
const html = await engine.render(tpl, {
  product: { name: 'Boots', price: 99 },
  section: { bgColor: '#fff' }
});
```

**Characteristics:**
- Shopify-compatible Liquid syntax
- No native bindings (runs in browser)
- ~4x faster with streamed rendering
- UMD bundle available via CDN
- Used by Eleventy and GitHub Docs

**Integration Pattern for Previews:**
1. Editor changes template → send to iframe
2. Iframe runs `engine.parse()` + `engine.render()` with mock data
3. Update DOM in-place (no reload)

### Alternative: liquid.js (Legacy)
- Older project, supports partials
- Less active maintenance

---

## Real-Time Update Mechanisms

### PostMessage Communication Protocol
```javascript
// Parent (Editor) → Iframe (Preview)
iframe.contentWindow.postMessage({
  type: 'TEMPLATE_UPDATE',
  payload: {
    template: liquidMarkup,
    data: mockData,
    settings: { bgColor, padding }
  }
}, 'https://preview.example.com');

// Iframe listens
window.addEventListener('message', async (event) => {
  if (event.origin !== 'https://preview.example.com') return; // origin check
  if (event.data.type === 'TEMPLATE_UPDATE') {
    const html = await engine.render(event.data.payload.template, event.data.payload.data);
    document.getElementById('preview-content').innerHTML = html;
  }
});
```

**Latency:** Typically 10-50ms for simple updates (network + rendering)

**Optimization:**
- Debounce updates (max 100ms frequency)
- Send only changed sections
- Avoid large payloads (>100KB)
- Use `transfer` parameter for binary data

---

## Mock Data Injection Patterns

### Static Mock Data Registry
```javascript
const mockData = {
  product: {
    name: 'Premium Boots',
    price: 129.99,
    image: 'https://...',
    inventory: 45
  },
  section: {
    heading: 'New Arrivals',
    subheading: 'Discover our latest collection',
    items: [...] // array of 3-5 items
  }
};
```

### Dynamic Data Generation
- Use Faker.js for realistic test data
- Store presets for common scenarios (e.g., "low inventory", "long product name")
- Allow editors to create custom mock contexts

### Data Injection Strategy
1. **Default Mock:** Load with minimal data
2. **Editor-Supplied:** Allow custom JSON input
3. **Sample Datasets:** Provide 3-5 preset variations
4. **Responsive Testing:** Include multiple breakpoints

---

## Security Considerations

### Critical Controls
1. **Sandbox Attribute:** Restrict iframe capabilities
   ```html
   <iframe src="..." sandbox="allow-scripts allow-same-origin"></iframe>
   ```

2. **Origin Validation:** Always verify sender
   ```javascript
   if (event.origin !== expectedOrigin) return;
   ```

3. **Target Origin Specificity:** Never use `*`
   ```javascript
   // Good
   iframe.postMessage(data, 'https://preview.example.com');
   // Bad
   iframe.postMessage(data, '*');
   ```

4. **HTTPS Enforcement:** Prevent MITM attacks

5. **Message Type Namespacing:** Avoid conflicts
   ```javascript
   { type: 'PREVIEW_UPDATE', version: 1, payload: {...} }
   ```

### CSTI Prevention
- Sanitize template input if accepting user-created templates
- Use LiquidJS safe mode (no arbitrary JavaScript execution)
- Never eval() user input

---

## Performance Benchmarks (Estimated)

| Metric | CSR | SSR | Hybrid |
|--------|-----|-----|--------|
| First Paint | 800-1200ms | 200-400ms | 300-600ms |
| Time to Interactive | 2-3s | 2-3s | 1-2s |
| Update Latency | 50-200ms | 500ms-2s | 50-200ms |
| Server CPU/request | Low | High | Medium |

---

## Implementation Recommendations

### Quick Start (CSR Pattern)
1. Host preview iframe on same origin (avoid CORS complexity)
2. Use LiquidJS v10+ via CDN or npm
3. Implement debounced postMessage on template/data change
4. Validate origin on message listener
5. Render to `innerHTML` (safe with LiquidJS output)

### Common Pitfalls
- Using `*` as targetOrigin → security vulnerability
- Not debouncing updates → excessive re-renders
- Sending large mock datasets → performance degradation
- Missing origin validation → XSS from malicious sources
- Inline scripts in template → breaks CSR isolation

---

## Resources & References

### Official Documentation
- [MDN: iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
- [MDN: postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [LiquidJS Official](https://liquidjs.com/)
- [Contentstack Live Preview](https://www.contentstack.com/docs/developers/set-up-live-preview/how-live-preview-works)

### Implementations
- [Payload CMS Live Preview](https://payloadcms.com/docs/live-preview/overview)
- [Directus Preview Discussion](https://github.com/directus/directus/discussions/5897)

### Security References
- [OWASP: Server-Side Template Injection](https://owasp.org/www-project-web-security-testing-guide/v41/)
- [Secure PostMessage Guide](https://www.bindbee.dev/blog/secure-cross-window-communication)
- [HackTricks: Client-Side Template Injection](https://book.hacktricks.xyz/pentesting-web/client-side-template-injection-csti)

### Learning Resources
- [Cross-Window Communication](https://javascript.info/cross-window-communication)
- [LiquidJS Tutorial](https://zetcode.com/javascript/liquidjs/)
- [CSR vs SSR Comparison](https://www.toptal.com/front-end/client-side-vs-server-side-pre-rendering)

---

## Unresolved Questions

1. **Streaming Performance:** Can LiquidJS leverage HTTP streaming for large templates?
2. **Memory Efficiency:** How does iframe pooling (reusing iframe instances) impact performance vs. creating new instances?
3. **Complex Filter Chains:** Performance impact of custom Liquid filters (e.g., image optimization)?
4. **Real-time Collaboration:** How to handle concurrent edits from multiple users in same preview?

---

## Recommendations for AI Section Generator

**Recommended Stack:**
- **Rendering:** CSR with LiquidJS (instant feedback)
- **Preview Host:** Same origin iframe (no CORS)
- **Communication:** debounced postMessage with typed events
- **Mock Data:** Preset datasets + editor-customizable contexts
- **Sandbox:** `allow-scripts allow-same-origin` minimum
- **Performance Target:** <150ms update latency for typical sections

**Next Step:** Proof of concept with LiquidJS rendering a sample section template with postMessage updates.
