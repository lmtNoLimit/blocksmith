# Phase 02: Backend Liquid Wrapper

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-app-proxy-setup.md)
- Research: [App Proxy Research](./research/researcher-01-shopify-app-proxy.md)

## Overview
| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Status | ✅ DONE (2025-12-24 19:30 UTC) |
| Effort | medium (4-6 hrs) |
| Description | Context injection, resource assignment, error handling for proxy renderer |
| Code Review | [code-reviewer-251224-1925](../reports/code-reviewer-251224-1925-phase02-backend-liquid-wrapper.md) |

## Key Insights (from Research)

1. **Limited built-in objects** - App proxy lacks `product`, `collection` unless assigned
2. **Context injection** - Use `{% assign product = all_products['handle'] %}` pattern
3. **Available objects** - `shop`, `customer`, `cart`, all standard filters work
4. **No layout option** - Use `{ layout: false }` for raw HTML without theme wrapper

## Requirements

### Functional
- FR-01: Inject product context via `{% assign product = all_products['handle'] %}`
- FR-02: Inject collection context via `{% assign collection = collections['handle'] %}`
- FR-03: Parse settings JSON and inject as Liquid assigns
- FR-04: Wrap template with CSS isolation container
- FR-05: Return meaningful error messages for invalid templates

### Non-Functional
- NFR-01: Template wrapper adds <50 bytes overhead
- NFR-02: JSON parsing fails gracefully with empty settings

## Architecture

```
Input: code + settings + resources (from frontend)
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CONTEXT INJECTION                              │
│                                                                   │
│  {% assign product = all_products['{{ handle }}'] %}             │
│  {% assign collection = collections['{{ handle }}'] %}           │
│  {% assign section = section_settings_object %}                  │
│                                                                   │
│  <div class="blocksmith-preview" id="section-{{ section_id }}">  │
│    {{ user_liquid_code }}                                         │
│  </div>                                                           │
└──────────────────────────────────────────────────────────────────┘
                    │
                    ▼
        return liquid(wrappedCode, { layout: false })
```

## Related Code Files

### Modify
| File | Changes |
|------|---------|
| `app/routes/api.proxy.render.tsx` | Add context injection, settings parsing |

### Create
| File | Purpose |
|------|---------|
| `app/utils/liquidWrapper.server.ts` | Template wrapping utilities |

## Implementation Steps

### Step 1: Create Liquid Wrapper Utility

**File**: `app/utils/liquidWrapper.server.ts`

```typescript
interface WrapperOptions {
  liquidCode: string;
  sectionId?: string;
  productHandle?: string;
  collectionHandle?: string;
  settings?: Record<string, unknown>;
}

/**
 * Wraps Liquid code with context injection for App Proxy rendering
 */
export function wrapLiquidForProxy({
  liquidCode,
  sectionId = "preview",
  productHandle,
  collectionHandle,
  settings = {},
}: WrapperOptions): string {
  const assigns: string[] = [];

  // Inject product context if specified
  if (productHandle) {
    assigns.push(`{% assign product = all_products['${productHandle}'] %}`);
  }

  // Inject collection context if specified
  if (collectionHandle) {
    assigns.push(`{% assign collection = collections['${collectionHandle}'] %}`);
  }

  // Inject settings as individual assigns
  for (const [key, value] of Object.entries(settings)) {
    const jsonValue = JSON.stringify(value);
    // For simple values, use assign directly
    // For objects/arrays, parse JSON in Liquid
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      assigns.push(`{% assign ${key} = ${jsonValue} %}`);
    }
  }

  // Build section.settings object simulation
  // Note: In native proxy, we can't create true section object
  // but we can assign to settings variable which templates often use
  if (Object.keys(settings).length > 0) {
    const settingsJson = JSON.stringify(settings);
    assigns.push(`{% capture _settings_json %}${settingsJson}{% endcapture %}`);
  }

  // Strip schema block from user code
  const cleanedCode = liquidCode.replace(
    /\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/gi,
    ""
  );

  // Wrap with isolation container
  return `
${assigns.join("\n")}
<div class="blocksmith-preview" id="shopify-section-${sectionId}">
${cleanedCode}
</div>
<style>
  .blocksmith-preview {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .blocksmith-preview img { max-width: 100%; height: auto; }
</style>
`.trim();
}

/**
 * Decode and validate proxy request parameters
 */
export function parseProxyParams(url: URL): {
  code: string | null;
  settings: Record<string, unknown>;
  productHandle: string | null;
  collectionHandle: string | null;
  sectionId: string;
} {
  const code = url.searchParams.get("code");
  const settingsParam = url.searchParams.get("settings");
  const productHandle = url.searchParams.get("product");
  const collectionHandle = url.searchParams.get("collection");
  const sectionId = url.searchParams.get("section_id") || "preview";

  let settings: Record<string, unknown> = {};
  if (settingsParam) {
    try {
      const decoded = Buffer.from(settingsParam, "base64").toString("utf-8");
      settings = JSON.parse(decoded);
    } catch {
      // Invalid settings, use empty object
    }
  }

  let decodedCode: string | null = null;
  if (code) {
    try {
      decodedCode = Buffer.from(code, "base64").toString("utf-8");
    } catch {
      // Invalid code encoding
    }
  }

  return { code: decodedCode, settings, productHandle, collectionHandle, sectionId };
}
```

### Step 2: Update Proxy Route Handler

**File**: `app/routes/api.proxy.render.tsx`

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { wrapLiquidForProxy, parseProxyParams } from "~/utils/liquidWrapper.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid, session } = await authenticate.public.appProxy(request);

  if (!session) {
    return liquid(
      `<div class="blocksmith-error" style="color:#d72c0d;padding:20px;background:#fff4f4;border-radius:8px;">
        App not installed. Please install Blocksmith first.
      </div>`,
      { layout: false }
    );
  }

  const url = new URL(request.url);
  const { code, settings, productHandle, collectionHandle, sectionId } = parseProxyParams(url);

  if (!code) {
    return liquid(
      `<div class="blocksmith-error" style="color:#d72c0d;padding:20px;background:#fff4f4;">
        No Liquid code provided.
      </div>`,
      { layout: false }
    );
  }

  try {
    const wrappedCode = wrapLiquidForProxy({
      liquidCode: code,
      sectionId,
      productHandle,
      collectionHandle,
      settings,
    });

    return liquid(wrappedCode, { layout: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return liquid(
      `<div class="blocksmith-error" style="color:#d72c0d;padding:20px;background:#fff4f4;">
        Render error: ${message}
      </div>`,
      { layout: false }
    );
  }
};
```

### Step 3: Handle Blocks Array

For sections with blocks, inject block data:

```typescript
// In liquidWrapper.server.ts, add to wrapLiquidForProxy:

interface Block {
  id: string;
  type: string;
  settings: Record<string, unknown>;
}

// Parse blocks from params
const blocksParam = url.searchParams.get("blocks");
let blocks: Block[] = [];
if (blocksParam) {
  try {
    blocks = JSON.parse(Buffer.from(blocksParam, "base64").toString("utf-8"));
  } catch { /* ignore */ }
}

// In wrapper, create section.blocks simulation
if (blocks.length > 0) {
  // Can't create true section.blocks, but can iterate with for loop
  // This is a limitation - templates using section.blocks won't work
  // without additional workarounds
}
```

**Note**: Full `section.blocks` simulation is complex. May need Phase 4 for complete solution.

## Todo List

**Completed**:
- [x] Create `app/utils/liquidWrapper.server.ts`
- [x] Implement `wrapLiquidForProxy()` function
- [x] Implement `parseProxyParams()` function
- [x] Update `api.proxy.render.tsx` to use wrapper
- [x] Test with product handle injection (30 tests, all passing)
- [x] Test with collection handle injection
- [x] Test settings passthrough
- [x] Handle edge cases (empty code, malformed JSON)
- [x] **[C1]** Add `sectionId` validation (path traversal/XSS vulnerability)
- [x] **[C2]** Add `settingsParam` size limit (DoS prevention)
- [x] **[H1]** Add test cases for complex backslash sequences in escaping
- [x] **[H2]** Blacklist Liquid reserved words in settings keys
- [x] **[H3]** Validate base64 format before decoding
- [x] **[M1]** Reduce handle max length to 63 chars (Shopify limit)
- [x] **[M2]** Add test for schema block with nested Liquid
- [x] **[M3]** Document CSS isolation limitations
- [x] **[M4]** Add security event logging for rejected inputs

**Test Results**:
- 34 new tests added (642 total passing)
- Security tests: All passing
- Edge case coverage: All passing

## Success Criteria

1. `{% assign product = all_products['handle'] %}` renders actual product
2. Settings values accessible in template
3. CSS isolation container wraps output
4. Schema block stripped from output
5. Error messages display correctly

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| `all_products` limited to 20 | Medium | Medium | Document limitation, use GraphQL if needed |
| Settings object not accessible | High | Medium | Use individual assigns, document limitation |
| section.blocks simulation fails | Medium | High | Document as known limitation, phase 4 work |

## Security Considerations

**Implemented**:
- **JSON Parsing**: Wrapped in try/catch, fails gracefully ✅
- **Handle Injection**: Regex validation blocks XSS/injection attempts ✅
- **Settings Escaping**: Single quotes and backslashes properly escaped ✅
- **No DB Access**: All data from URL params, validated ✅
- **DoS (code)**: 100KB max code size enforced ✅
- **Liquid Sandbox**: Shopify handles runtime escaping ✅
- **Section ID**: Validated, XSS/path traversal prevented ✅
- **Settings Size**: 50KB limit enforced, DoS protected ✅
- **Reserved Words**: Validation against Liquid reserved words ✅
- **Security Logging**: Event logging for rejected inputs ✅

**Security Score**: 9/10 (all critical + high priority fixes completed)

## Next Steps

After completing this phase:
1. Proceed to Phase 03 (Frontend Integration) to connect UI to proxy
2. Test context injection with real shop data

## Unresolved Questions

1. **section.blocks access**: Can we simulate `{% for block in section.blocks %}` in app proxy context?
2. **all_products limit**: What happens when store has >20 products and requested handle not in first 20?
3. **Settings objects**: How to inject nested settings like `section.settings.featured_product.title`?
4. **sectionId in frontend**: Does Phase 03 generate section IDs? Need validation there too?
5. **Settings size**: What's realistic max for section settings? 50KB proposed.
6. **Logging infrastructure**: Console.warn sufficient or need Sentry/Datadog?
7. **CSP headers**: Should app-wide CSP be in Phase 01 or separate phase?
