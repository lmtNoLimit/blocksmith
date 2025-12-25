# Implementation Plan: App Proxy Preview srcDoc Update

**Date**: 2025-12-25
**Status**: ✅ COMPLETE
**Priority**: HIGH (current preview is broken due to CORS/CSP)

---

## Problem

`AppProxyPreviewFrame.tsx` uses `<iframe src={proxyUrl}>` which fails due to:
- `X-Frame-Options: DENY` from Shopify storefronts
- `frame-ancestors: 'none'` CSP policy
- Browser blocks before content loads

## Solution

Switch `AppProxyPreviewFrame` to use same pattern as `NativeSectionPreview`:
- Server-side fetch via `/api/preview/render`
- srcDoc injection to bypass CORS
- Add missing HTML sanitization (DOMPurify)

---

## Implementation Approach: Option A (Recommended)

**Update AppProxyPreviewFrame internals** - keep same public API, minimal changes to consumers.

### Why Not Options B/C?
- **B (Switch consumers)**: More invasive, requires updating all import sites
- **C (Merge components)**: Good long-term but larger scope; do after A works

---

## Phase Overview

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Update AppProxyPreviewFrame to use srcDoc | ✅ Complete |
| 02 | Add HTML sanitization to api.preview.render | ✅ Complete |
| 03 | Testing & validation | 🔄 Manual testing needed |

---

## Files to Modify

| File | Change |
|------|--------|
| `app/components/preview/AppProxyPreviewFrame.tsx` | Replace src → srcDoc, add useNativePreviewRenderer |
| `app/routes/api.preview.render.tsx` | Add DOMPurify sanitization |

## Files to Remove (Optional Cleanup)

| File | Reason |
|------|--------|
| `app/components/preview/hooks/useAppProxyAuth.ts` | No longer needed (server handles auth) |

---

## Success Criteria

1. Preview renders in embedded app without CORS/CSP errors
2. Password-protected stores work via server-side auth
3. No XSS vulnerabilities (DOMPurify active)
4. Settings/blocks/resources propagate correctly
5. Device size scaling works as before

---

## Security Requirements

- **MUST**: Add DOMPurify to sanitize Shopify HTML
- **MUST**: Keep `sandbox="allow-scripts"` (no `allow-same-origin`)
- **KEEP**: Existing CSP headers in api.preview.render

---

## Phase Files

- `phase-01-update-app-proxy-preview-frame.md`
- `phase-02-add-html-sanitization.md`
- `phase-03-testing-validation.md`

---

## Resolved Questions

1. ✅ Should `NativeSectionPreview` and `AppProxyPreviewFrame` be merged later? → **Yes, merge later**
2. ✅ Is `useAppProxyAuth` hook needed anywhere else? → **Deleted (unused)**
3. ⏳ Should Liquid-generated `<script>` tags be allowed in DOMPurify config? → **Deferred, research later**

## Additional Security Fixes Applied

- Added postMessage nonce authentication to prevent message spoofing from other iframes
- Iframe script includes nonce in height reports
- Parent validates nonce before accepting height updates
