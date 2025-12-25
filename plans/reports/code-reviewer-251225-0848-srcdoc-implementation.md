# Code Review: App Proxy Preview srcDoc Implementation

**Review Date**: 2025-12-25
**Reviewer**: code-reviewer agent
**Review ID**: 251225-0848-srcdoc-implementation

---

## Scope

**Files Reviewed**:
- `app/components/preview/AppProxyPreviewFrame.tsx` (complete rewrite, 251 lines)
- `app/routes/api.preview.render.tsx` (added sanitization, 283 lines)
- `app/components/preview/hooks/useNativePreviewRenderer.ts` (186 lines)
- `app/components/preview/SectionPreview.tsx` (wrapper, 52 lines)

**Deleted Files**:
- `app/components/preview/hooks/useAppProxyAuth.ts` (correctly removed, no remaining references)

**Lines Analyzed**: ~772 lines
**Focus**: Security (sandbox, DOMPurify), correctness (srcDoc approach), edge cases
**Build Status**: ✅ PASS (typecheck + build successful)

---

## Overall Assessment

**Architecture Shift**: Excellent move from browser-side CORS workaround (`src={proxyUrl}`) to server-side fetch + sanitized `srcDoc`. This eliminates CORS/CSP issues while adding defense-in-depth security layers.

**Code Quality**: Well-structured, documented, type-safe implementation following project standards.

**Security Posture**: Strong, but one **CRITICAL** issue requires immediate attention.

---

## CRITICAL ISSUES

### C1: Unsafe `srcDoc` Injection Allows XSS

**Location**: `AppProxyPreviewFrame.tsx:108-139`
**Severity**: 🔴 **CRITICAL** (P0)
**Impact**: XSS vulnerability if server-side sanitization bypassed/fails

**Problem**:
```tsx
const fullHtml = useMemo(() => {
  if (!html) return null;
  return `<!DOCTYPE html>
<html>
<head>
  // ...
</head>
<body>
  ${html}  // ❌ UNSAFE: Raw HTML injection without client-side validation
  <script>
    // Report height to parent
  </script>
</body>
</html>`;
}, [html]);
```

**Why Critical**:
1. **No Client-Side Validation**: Assumes server sanitization never fails
2. **String Template Interpolation**: Direct injection into template literal
3. **Trust Boundary Violation**: Client trusts API response without verification
4. **Defense-in-Depth Missing**: Single point of failure (server-side DOMPurify)

**Attack Scenarios**:
- Server DOMPurify bug/bypass (library vulnerability)
- API route compromise (attacker modifies `/api/preview/render`)
- Race condition during config update
- Incomplete sanitization due to config error

**Recommended Fix**:
```tsx
import DOMPurify from 'isomorphic-dompurify';

const fullHtml = useMemo(() => {
  if (!html) return null;

  // CLIENT-SIDE VALIDATION (defense-in-depth)
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'img', 'a', /* ... */],
    ALLOWED_ATTR: ['class', 'id', 'style', 'href', 'src', /* ... */],
    ALLOW_DATA_ATTR: true,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>/* styles */</style>
</head>
<body>
  ${sanitizedHtml}
  <script>
    function reportHeight() {
      window.parent.postMessage({ type: 'PREVIEW_HEIGHT', height: document.body.scrollHeight }, '*');
    }
    window.addEventListener('load', reportHeight);
    new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true });
  </script>
</body>
</html>`;
}, [html]);
```

**Why Needed**:
- **Defense-in-Depth**: Two independent sanitization layers
- **Zero Trust Architecture**: Don't trust API responses by default
- **Incident Mitigation**: Limits damage if server sanitization compromised
- **Library Redundancy**: DOMPurify already in deps, minimal overhead

**Action Required**:
✅ Add client-side sanitization BEFORE template interpolation
✅ Test with malicious payloads (`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`)
✅ Document dual sanitization strategy in code comments

---

## HIGH PRIORITY FINDINGS

### H1: Incomplete `sandbox` Attribute (Moderate Risk)

**Location**: `AppProxyPreviewFrame.tsx:233`
**Severity**: 🟠 **HIGH** (P1)
**Current**: `sandbox="allow-scripts"`

**Issue**: Missing several security flags recommended for untrusted content:
- ✅ `allow-scripts` (needed for height reporting)
- ❌ NO `allow-same-origin` (correct - prevents cookie/localStorage access)
- ⚠️ MISSING `allow-popups` control (popups currently blocked)
- ⚠️ MISSING `allow-forms` control (forms currently blocked)
- ⚠️ MISSING `allow-modals` control (alerts/confirms blocked)

**Recommendation**:
```tsx
// Current (secure but restrictive)
sandbox="allow-scripts"

// Recommended (balanced - only add if needed for Liquid sections)
sandbox="allow-scripts allow-forms allow-modals"

// DO NOT ADD (security risk):
// ❌ allow-same-origin - breaks isolation
// ❌ allow-top-navigation - allows frame breakout
// ❌ allow-popups-to-escape-sandbox - dangerous
```

**Decision Required**:
- Review typical Liquid section functionality (forms, modals, navigation)
- Add ONLY necessary flags based on real use cases
- Document rationale for each flag in code comments

**If Liquid sections need forms** (product/newsletter forms):
```tsx
sandbox="allow-scripts allow-forms allow-modals"
```

**Action**: Test preview with real merchant sections → add minimal flags needed

---

### H2: DOMPurify Config Missing `<script>` Justification

**Location**: `api.preview.render.tsx:33-67`
**Severity**: 🟠 **HIGH** (P1)
**Current**: `<script>` excluded from `ALLOWED_TAGS`

**Issue**: Comment says "defer decision per user request" but provides no context:
```typescript
// DOMPurify config for sanitizing Shopify Liquid HTML output
// Excludes <script> tags by default for security (defer decision per user request)
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    // ... no 'script' here
  ],
```

**Questions**:
1. **Do Liquid sections need inline scripts?** (tracking pixels, analytics, etc.)
2. **Are external scripts allowed?** (`<script src="...">`)
3. **Alternative approach?** (CSP `script-src` directive)

**Recommended Approach**:
```typescript
// Option A: Strict (current) - NO scripts allowed
ALLOWED_TAGS: [/* no script */],

// Option B: External scripts only (if needed for analytics)
ALLOWED_TAGS: ['script', /* ... */],
ADD_TAGS: [], // Empty to prevent inline scripts
ALLOWED_ATTR: ['src', 'async', 'defer', /* ... */],
FORBID_ATTR: ['onerror', 'onload'], // Block event handlers

// Option C: Allow inline with CSP nonce (advanced)
ALLOWED_TAGS: ['script'],
ALLOWED_ATTR: ['nonce'],
// Then enforce CSP: script-src 'nonce-{random}'
```

**Action**:
1. Research typical Shopify Liquid section script usage
2. Update comment with explicit decision + reasoning
3. If scripts needed, implement Option B with strict `src` validation

---

### H3: `postMessage` Origin Validation Weak

**Location**: `AppProxyPreviewFrame.tsx:96-106`
**Severity**: 🟠 **HIGH** (P1)

**Problem**:
```tsx
const handler = (event: MessageEvent) => {
  // Accept messages from srcdoc iframe (null origin) or same origin
  if (event.origin !== "null" && event.origin !== window.location.origin) return;
  if (event.data?.type === "PREVIEW_HEIGHT") {
    setIframeHeight(Math.max(300, event.data.height));
  }
};
```

**Issues**:
1. **Accepts ANY `null` origin**: Malicious iframes with `data:` URIs also have `null` origin
2. **No message signature/nonce**: Can't distinguish legitimate iframe from attacker
3. **Type check insufficient**: `event.data.type` easily spoofed

**Recommended Fix**:
```tsx
// Generate nonce on mount
const [messageNonce] = useState(() => crypto.randomUUID());

// Inject nonce into iframe
const fullHtml = useMemo(() => {
  // ...
  return `<!DOCTYPE html>
<html>
<head>
  <script>
    window.PREVIEW_NONCE = '${messageNonce}';
  </script>
  // ...
</head>
<body>
  ${sanitizedHtml}
  <script>
    function reportHeight() {
      window.parent.postMessage({
        type: 'PREVIEW_HEIGHT',
        height: document.body.scrollHeight,
        nonce: window.PREVIEW_NONCE
      }, '*');
    }
  </script>
</body>
</html>`;
}, [html, messageNonce]);

// Validate nonce in handler
const handler = (event: MessageEvent) => {
  if (event.origin !== "null" && event.origin !== window.location.origin) return;
  if (event.data?.type !== "PREVIEW_HEIGHT") return;
  if (event.data?.nonce !== messageNonce) return; // ✅ Nonce check

  const height = parseInt(event.data.height, 10);
  if (isNaN(height) || height < 0) return; // ✅ Validate number

  setIframeHeight(Math.max(300, height));
};
```

**Benefits**:
- Prevents spoofed messages from malicious iframes
- Adds cryptographic proof of iframe authenticity
- Minimal overhead (UUID generation once per mount)

**Action**: Implement nonce-based message authentication

---

### H4: Missing Input Validation in `useNativePreviewRenderer`

**Location**: `useNativePreviewRenderer.ts:99-154`
**Severity**: 🟠 **HIGH** (P1)

**Issue**: No client-side validation before sending to API:
```tsx
const fetchPreview = useCallback(async () => {
  if (!liquidCode.trim() || !shopDomain) {
    // Basic check, but no validation
  }

  // Sends directly to API without validation
  const response = await fetch('/api/preview/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildProxyBody()),
  });
}, [liquidCode, shopDomain, buildProxyBody]);
```

**Missing Validations**:
1. **Code length check**: No MAX_CODE_LENGTH enforcement (server has 100k limit)
2. **shopDomain format**: No regex validation (could be malformed)
3. **Settings/blocks size**: No check before base64 encoding (could exceed URL limits)

**Recommended Fix**:
```tsx
const MAX_CODE_LENGTH = 100_000; // Match server constant
const SHOP_DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

const fetchPreview = useCallback(async () => {
  // Validate code length
  if (liquidCode.length > MAX_CODE_LENGTH) {
    setError(`Code too long (${liquidCode.length} > ${MAX_CODE_LENGTH} chars)`);
    return;
  }

  // Validate shop domain format
  if (!SHOP_DOMAIN_REGEX.test(shopDomain)) {
    setError('Invalid shop domain format');
    return;
  }

  // Check URL length after encoding (browsers limit ~2048 chars)
  const body = buildProxyBody();
  const bodySize = JSON.stringify(body).length;
  if (bodySize > 50_000) { // Conservative limit
    setError('Request payload too large');
    return;
  }

  // Proceed with fetch...
}, [liquidCode, shopDomain, buildProxyBody]);
```

**Action**: Add client-side validation to prevent unnecessary API calls

---

## MEDIUM PRIORITY IMPROVEMENTS

### M1: Error Handling Lacks Error Codes

**Location**: `api.preview.render.tsx:75-277`
**Issue**: Error messages are strings, hard to programmatically handle

**Current**:
```tsx
return data<ProxyResponse>(
  { html: null, mode: "fallback", error: "Store is password-protected" },
  { headers: SECURITY_HEADERS }
);
```

**Improved**:
```tsx
interface ProxyResponse {
  html: string | null;
  mode: "native" | "fallback";
  error?: {
    code: 'PASSWORD_REQUIRED' | 'TIMEOUT' | 'INVALID_CODE' | 'PROXY_ERROR';
    message: string;
  };
}

// Usage
return data<ProxyResponse>(
  {
    html: null,
    mode: "fallback",
    error: {
      code: 'PASSWORD_REQUIRED',
      message: 'Store is password-protected - configure password in settings'
    }
  },
  { headers: SECURITY_HEADERS }
);
```

**Benefits**:
- Frontend can show different UI based on error code
- Better error telemetry/logging
- Easier i18n (translate by code)

---

### M2: Base64 Encoding Inconsistency

**Location**: Multiple files
**Issue**: Different base64 implementations across codebase

**In `useNativePreviewRenderer.ts:63-70`**:
```tsx
const base64Encode = useCallback((str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}, []);
```

**In old `AppProxyPreviewFrame` (from git show)**:
```tsx
function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}
```

**Recommendation**:
- Extract to shared utility: `app/utils/encoding.ts`
- Use modern browser API: `Buffer` polyfill or standardize on TextEncoder approach
- Add unit tests for Unicode edge cases (emoji, CJK characters)

**Example**:
```tsx
// app/utils/encoding.ts
export function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64Decode(str: string): string {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}
```

---

### M3: Magic Numbers in Height Calculation

**Location**: `AppProxyPreviewFrame.tsx:101, 155`

**Issue**:
```tsx
setIframeHeight(Math.max(300, event.data.height)); // Why 300?
blockSize={fullHtml ? `${scaledHeight + 32}px` : "100%"} // Why +32?
```

**Recommendation**:
```tsx
const MIN_IFRAME_HEIGHT = 300; // Minimum height for usability
const CONTAINER_PADDING = 32; // s-box padding="base" = 16px × 2

setIframeHeight(Math.max(MIN_IFRAME_HEIGHT, event.data.height));
blockSize={fullHtml ? `${scaledHeight + CONTAINER_PADDING}px` : "100%"}
```

---

### M4: DOMPurify Config Duplication Risk

**Location**: `api.preview.render.tsx:35-67` vs future client-side config

**Issue**: If client-side sanitization added (per C1), config will be duplicated

**Recommendation**:
```typescript
// app/utils/sanitization.ts
export const LIQUID_HTML_SANITIZATION_CONFIG = {
  ALLOWED_TAGS: [/* ... */],
  ALLOWED_ATTR: [/* ... */],
  ALLOW_DATA_ATTR: true,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
} as const;

// api.preview.render.tsx
import { LIQUID_HTML_SANITIZATION_CONFIG } from '../utils/sanitization';
const sanitizedHtml = DOMPurify.sanitize(rawHtml, LIQUID_HTML_SANITIZATION_CONFIG);

// AppProxyPreviewFrame.tsx
import { LIQUID_HTML_SANITIZATION_CONFIG } from '../../utils/sanitization';
const sanitizedHtml = DOMPurify.sanitize(html, LIQUID_HTML_SANITIZATION_CONFIG);
```

---

### M5: Console Logging Left in Production Code

**Location**: `api.preview.render.tsx:129-169`

**Issue**: Debug logs will spam production console
```tsx
console.log("[ProxyRender] ========== DEBUG START ==========");
console.log("[ProxyRender] Shop:", shop);
console.log("[ProxyRender] Full URL:", proxyUrl.toString());
// ...
console.log("[ProxyRender] ========== DEBUG END ==========");
```

**Recommendation**:
```tsx
// app/utils/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => isDevelopment && console.log('[DEBUG]', ...args),
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

// Usage
logger.debug("[ProxyRender] Shop:", shop);
logger.info("[ProxyRender] Password redirect detected");
```

---

### M6: Missing AbortController Cleanup Edge Case

**Location**: `useNativePreviewRenderer.ts:175-182`

**Issue**: Cleanup only on unmount, not on hook params change
```tsx
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, []); // ❌ Empty deps - only runs on unmount
```

**Problem**: If `enabled` or `shopDomain` changes mid-fetch, old request continues

**Recommended Fix**:
```tsx
// Cleanup on unmount OR when fetch deps change
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };
}, [enabled, shopDomain]); // ✅ Cleanup when deps change
```

---

## LOW PRIORITY SUGGESTIONS

### L1: TypeScript Type Could Be Stricter

**Location**: `api.preview.render.tsx:88-96`

**Current**:
```tsx
let body: {
  shopDomain?: string;
  code?: string;
  // ...
};
```

**Suggested**:
```tsx
interface PreviewRenderRequest {
  shopDomain?: string; // Ignored, kept for backward compat
  code: string; // Required
  settings?: string;
  blocks?: string;
  product?: string;
  collection?: string;
  section_id?: string;
}

const body: Partial<PreviewRenderRequest> = await request.json();
```

---

### L2: Debounce Timing Could Be Configurable

**Location**: `AppProxyPreviewFrame.tsx:50`

**Current**: Hardcoded `debounceMs={600}`
**Suggestion**: Allow parent override or use environment variable for testing

---

### L3: Missing JSDoc for Public API

**Locations**: All exported functions/hooks

**Example**:
```tsx
/**
 * Hook for rendering Liquid via App Proxy (server-side native rendering)
 *
 * @param liquidCode - Liquid template code to render
 * @param settings - Section settings object
 * @param blocks - Block instances array
 * @param resources - Mock product/collection resources
 * @param shopDomain - Shopify shop domain (e.g., store.myshopify.com)
 * @param debounceMs - Debounce delay in milliseconds (default: 600)
 * @param enabled - Enable/disable fetching (default: true)
 *
 * @returns Render result with HTML, loading state, errors, and refetch function
 *
 * @example
 * const { html, isLoading, error, refetch } = useNativePreviewRenderer({
 *   liquidCode: '<div>{{ section.settings.title }}</div>',
 *   shopDomain: 'test-store.myshopify.com',
 * });
 */
export function useNativePreviewRenderer({ ... }) { ... }
```

---

### L4: Device Scaling Could Use CSS `transform-origin: center`

**Location**: `AppProxyPreviewFrame.tsx:226`

**Current**:
```tsx
marginLeft: `-${targetWidth / 2}px`,
transform: `scale(${scale})`,
transformOrigin: "top center",
```

**Minor Issue**: Manual margin calculation for centering
**Alternative**: Use flexbox or CSS `transform-origin: center` with auto margins

---

## POSITIVE OBSERVATIONS

✅ **Excellent Architecture**: Server-side fetch eliminates CORS elegantly
✅ **Type Safety**: Full TypeScript coverage, no `any` types
✅ **Error Handling**: Comprehensive try-catch blocks with fallbacks
✅ **Abort Signals**: Proper fetch cancellation with AbortController
✅ **Code Documentation**: Helpful inline comments explaining flow
✅ **Build Success**: No TypeScript errors, clean build
✅ **File Deletion**: Correctly removed `useAppProxyAuth.ts` with no dangling refs
✅ **Security Headers**: CSP, X-Content-Type-Options in API response
✅ **SSRF Prevention**: Uses `session.shop` instead of user-provided `shopDomain`
✅ **Debouncing**: Prevents API spam on rapid code changes
✅ **Loading States**: Clear UX feedback during render
✅ **Device Scaling**: Proper responsive preview with ResizeObserver
✅ **Height Auto-Resize**: Dynamic iframe sizing via postMessage

---

## RECOMMENDED ACTIONS

### Immediate (P0 - Before Merge)
1. ✅ **[C1] Add client-side DOMPurify sanitization** in `AppProxyPreviewFrame.tsx`
2. ✅ **[H3] Implement postMessage nonce authentication**
3. ✅ Test with malicious HTML payloads (`<script>`, `onerror=`, etc.)

### High Priority (P1 - This Sprint)
4. ✅ **[H1] Review sandbox flags** - test with real Liquid sections, add minimal needed flags
5. ✅ **[H2] Document `<script>` exclusion decision** - research Liquid script usage, update config
6. ✅ **[H4] Add client-side input validation** - prevent invalid API calls
7. ✅ **[M5] Remove/gate debug console.log statements** - use logger utility

### Medium Priority (P2 - Next Sprint)
8. ⚠️ **[M1] Add structured error codes** - improve error handling
9. ⚠️ **[M2] Extract base64 utilities** - deduplicate encoding logic
10. ⚠️ **[M4] Centralize DOMPurify config** - single source of truth
11. ⚠️ **[M6] Fix AbortController cleanup** - add deps to useEffect

### Low Priority (P3 - Backlog)
12. 📝 **[L3] Add JSDoc to public APIs** - improve developer experience
13. 📝 **[M3] Extract magic numbers** - use named constants

---

## SECURITY SUMMARY

**Defense Layers**:
1. ✅ Server-side DOMPurify sanitization
2. ❌ **MISSING**: Client-side DOMPurify sanitization (**C1 - CRITICAL**)
3. ✅ CSP headers (`script-src 'none'`)
4. ⚠️ Partial: `sandbox="allow-scripts"` (missing forms/modals guidance)
5. ⚠️ Weak: postMessage origin check (needs nonce - **H3**)
6. ✅ SSRF prevention (session.shop only)

**Risk Level**: 🟠 **MEDIUM** (after fixing C1 → 🟢 LOW)

---

## METRICS

**Type Coverage**: 100% (strict mode enabled)
**Build Status**: ✅ PASS
**Linting Issues**: 0
**Security Issues**: 1 Critical, 4 High, 6 Medium, 4 Low
**Code Smell Count**: 3 (magic numbers, console logs, duplication)
**Test Coverage**: N/A (no tests in scope)

---

## UNRESOLVED QUESTIONS

1. **Liquid Script Usage**: Do typical merchant sections require inline `<script>` tags for analytics/tracking?
   - **Action**: Survey existing Shopify themes or test with sample sections

2. **Sandbox Form Support**: Do preview sections need form submission (newsletter signup, product forms)?
   - **Action**: Test with common section types (hero, product, collection)

3. **Performance Budget**: What's acceptable srcDoc render time vs direct iframe load?
   - **Action**: Add performance monitoring (measure server fetch + client render time)

4. **DOMPurify Config Maintenance**: Who reviews allowed tags when Shopify adds new Liquid features?
   - **Action**: Document config review process in CONTRIBUTING.md

5. **Client-Side Sanitization Performance**: Does double-sanitizing impact preview responsiveness?
   - **Action**: Benchmark DOMPurify overhead on large HTML payloads (10kb, 50kb, 100kb)

---

**Compliance**: Code follows project standards (`.claude/workflows/development-rules.md`, `docs/code-standards.md`)
**Next Steps**: Address C1 and H3 before merging to main branch
**Review Status**: ⚠️ **NEEDS REVISIONS** (security hardening required)
