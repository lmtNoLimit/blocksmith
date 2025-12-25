# App Proxy Preview srcDoc Research & Implementation Plan

## Overview
Comprehensive research on implementing iframe preview rendering using `srcDoc` for Blocksmith's Shopify App Proxy integration.

## Documents

### 1. `researcher-02-srcdoc-implementation.md` (RESEARCH)
**289 lines | Implementation-Ready**

Complete technical research covering:
- srcDoc vs src attribute differences
- Security deep-dive (XSS, CSP, sandbox)
- HTML sanitization strategies with DOMPurify
- Server-side fetch pattern analysis
- Alternative approaches evaluated
- Browser support matrix
- Implementation checklist
- 11+ authoritative sources

**Key Finding**: srcDoc is production-viable. Current Blocksmith implementation is correct. Gap: No HTML sanitization.

### 2. `IMPLEMENTATION_GUIDE.md` (ACTIONABLE)
**Quick start guide for development team**

Covers:
- Current status (✅ working, ⚠ security gap)
- Critical action items (add DOMPurify)
- Code snippets ready to use
- Architecture decision table
- Testing checklist
- Unresolved questions for team discussion

## Key Findings

### Security Status
| Aspect | Status | Details |
|--------|--------|---------|
| **srcDoc** | ✅ Secure | Inline HTML avoids CORS, enables content control |
| **Sandbox** | ✅ Correct | `allow-scripts` only (unique origin) |
| **Server fetch** | ✅ Secure | Session-based auth prevents SSRF |
| **CSP headers** | ✅ Set | Prevents frame embedding outside app |
| **HTML sanitization** | ⚠ MISSING | No DOMPurify → XSS risk with untrusted content |

### Recommended Implementation
```typescript
// Server-side (api.preview.render)
import DOMPurify from 'isomorphic-dompurify';

const html = await response.text();
const sanitized = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['div', 'span', 'p', 'img', 'style', ...],
  ALLOWED_ATTR: ['class', 'id', 'style', 'src', 'alt', ...],
});

return data({ html: sanitized, mode: "native" }, 
  { headers: SECURITY_HEADERS });
```

## Files in This Plan
```
251225-0837-app-proxy-preview-srcdoc/
├── README.md (this file)
├── IMPLEMENTATION_GUIDE.md (actionable steps)
└── research/
    └── researcher-02-srcdoc-implementation.md (full technical research)
```

## What's Covered
✅ Browser support & backward compatibility
✅ CSP & sandbox interaction
✅ XSS prevention & sanitization
✅ postMessage alternatives
✅ Blob URL vs srcDoc comparison
✅ Server-side fetch security
✅ Performance & debouncing
✅ Code examples & snippets

## Unresolved Questions
1. Should generated sections include `<script>` tags?
2. Can Liquid output contain CSS injection vectors?
3. Performance SLA for preview rendering?
4. Caching strategy for rendered HTML?

**→ See IMPLEMENTATION_GUIDE.md for full details**

## Next Steps
1. Review research findings
2. Discuss unresolved questions with team
3. Implement HTML sanitization per guide
4. Run security tests
5. Deploy to staging
6. Monitor and iterate

---
**Created**: 2025-12-25
**Status**: Implementation-Ready
**Effort**: 2-4 hours development
