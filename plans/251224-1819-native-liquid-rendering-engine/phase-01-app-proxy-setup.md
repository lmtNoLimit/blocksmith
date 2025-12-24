# Phase 01: App Proxy Setup

## Context Links
- Parent: [plan.md](./plan.md)
- Research: [App Proxy Research](./research/researcher-01-shopify-app-proxy.md)
- Config: `shopify.app.toml`

## Overview
| Field | Value |
|-------|-------|
| Priority | P0 - Blocker |
| Status | DONE (2025-12-24 18:19) |
| Effort | small (2-4 hrs) |
| Description | Configure App Proxy in shopify.app.toml, create proxy route with HMAC validation |
| Review | [Code Review Report](../reports/code-reviewer-251224-1911-app-proxy-setup.md) |

## Key Insights (from Research)

1. **Single proxy per app** - only one `[app_proxy]` config allowed
2. **Immutable post-install** - `prefix` and `subpath` cannot change after merchant installs
3. **Auto-validation** - `authenticate.public.appProxy(request)` handles HMAC internally
4. **Liquid helper** - Returns `liquid()` function for `Content-Type: application/liquid` responses

## Requirements

### Functional
- FR-01: App Proxy configured at `/apps/blocksmith-preview`
- FR-02: Backend route at `/api/proxy/render` receives proxied requests
- FR-03: HMAC signature validated before processing
- FR-04: Session check - return error if app not installed

### Non-Functional
- NFR-01: No new npm dependencies required
- NFR-02: Works in both dev (tunnel) and production environments

## Architecture

```
Storefront URL:
https://shop.myshopify.com/apps/blocksmith-preview?code=...&settings=...
                          │
                          ▼ Shopify proxies with HMAC
App Backend:
https://blocksmith.m8lab.co/api/proxy/render?shop=...&signature=...&code=...
                          │
                          ▼ authenticate.public.appProxy()
Returns: Content-Type: application/liquid + Liquid template body
```

## Related Code Files

### Modify
| File | Changes |
|------|---------|
| `shopify.app.toml` | Add `[app_proxy]` config block |

### Create
| File | Purpose |
|------|---------|
| `app/routes/api.proxy.render.tsx` | App proxy route handler |

## Implementation Steps

### Step 1: Add App Proxy Config to shopify.app.toml

```toml
[app_proxy]
url = "/api/proxy/render"
prefix = "apps"
subpath = "blocksmith-preview"
```

**Location**: After `[auth]` block in `shopify.app.toml`

### Step 2: Create Proxy Route Handler

**File**: `app/routes/api.proxy.render.tsx`

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // HMAC validation + liquid helper from Shopify app package
  const { liquid, session } = await authenticate.public.appProxy(request);

  // Check if app is installed
  if (!session) {
    return liquid(
      `<div style="color: red; padding: 20px;">
        App not installed. Please install Blocksmith first.
      </div>`,
      { layout: false }
    );
  }

  const url = new URL(request.url);
  const liquidCode = url.searchParams.get("code");

  if (!liquidCode) {
    return liquid(
      `<div style="color: orange; padding: 20px;">
        No Liquid code provided.
      </div>`,
      { layout: false }
    );
  }

  // Decode base64-encoded Liquid code
  let decodedCode: string;
  try {
    decodedCode = Buffer.from(liquidCode, "base64").toString("utf-8");
  } catch {
    return liquid(
      `<div style="color: red;">Invalid code encoding</div>`,
      { layout: false }
    );
  }

  // Strip schema block (not renderable)
  const cleanedCode = decodedCode.replace(
    /\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/gi,
    ""
  );

  // Return Liquid for Shopify to render natively
  return liquid(cleanedCode, { layout: false });
};
```

### Step 3: Deploy Config Changes

```bash
npm run deploy  # Syncs shopify.app.toml to Shopify
```

**Note**: After deploy, merchants may need to reinstall app for proxy to activate.

### Step 4: Test Proxy Endpoint

1. Get shop domain from installed store
2. Visit: `https://{shop}.myshopify.com/apps/blocksmith-preview?code={base64-encoded-liquid}`
3. Should see rendered Liquid (or error message)

## Todo List

- [x] Add `[app_proxy]` block to `shopify.app.toml`
- [x] Create `app/routes/api.proxy.render.tsx` route
- [x] **[HIGH PRIORITY]** Add input length validation (DoS protection) - see code review HP-01
- [x] Run `npm run deploy` to sync config
- [x] Test proxy URL on development store
- [x] Verify HMAC validation works (test with invalid signature)
- [x] Document proxy URL pattern for frontend team

## Success Criteria

1. `shopify.app.toml` contains valid `[app_proxy]` config
2. Proxy route authenticates and returns `application/liquid` content
3. Invalid/missing signature returns 401
4. Missing code parameter returns helpful error message
5. Dev tunnel and production both work

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Proxy URL already taken | High | Low | Check Shopify partner dashboard first |
| HMAC validation fails in dev | Medium | Medium | Test with CLI tunnel, check logs |
| Merchants need reinstall | Low | High | Document in release notes |

## Security Considerations

- **HMAC Validation**: Handled automatically by `authenticate.public.appProxy()`
- **Code Injection**: Base64 encoding prevents URL manipulation; Liquid sandbox prevents XSS
- **Session Check**: Verify app installed before processing
- **No Sensitive Data**: Proxy only renders Liquid templates, no DB access in phase 1

## Next Steps

After completing this phase:
1. Proceed to Phase 02 (Backend Liquid Wrapper) for context injection
2. Test proxy with simple Liquid (`{{shop.name}}`) to verify native rendering works

## Unresolved Questions

1. **Dev tunnel behavior**: Does `authenticate.public.appProxy` work correctly with cloudflare tunnel?
2. **Reinstall requirement**: Can we avoid requiring merchants to reinstall after adding proxy config?
