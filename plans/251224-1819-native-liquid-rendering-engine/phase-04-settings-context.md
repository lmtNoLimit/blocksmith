# Phase 04: Settings & Context Management

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 03](./phase-03-frontend-integration.md)
- Research: [Current Preview System](./research/researcher-02-current-preview-system.md)
- Related: `app/components/preview/schema/`, `app/components/preview/drops/`

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 - Important |
| Status | pending |
| Effort | medium (6-8 hrs) |
| Description | Pass settings/blocks to proxy, handle resource selection, simulate section object |

## Key Insights (from Research)

1. **section.settings pattern** - Templates use `{{ section.settings.title }}` extensively
2. **Resource pickers** - product/collection type settings resolve to Shopify resources
3. **blocks iteration** - `{% for block in section.blocks %}` common pattern
4. **Current drops** - ProductDrop, CollectionDrop provide mock data binding

## Requirements

### Functional
- FR-01: Settings values passed to proxy and accessible in template
- FR-02: Product picker settings resolve to actual product via handle
- FR-03: Collection picker settings resolve to actual collection via handle
- FR-04: Blocks array passed and iterable in template
- FR-05: `section.settings.{key}` access pattern works

### Non-Functional
- NFR-01: Settings payload <4KB after encoding
- NFR-02: Works with all setting types (text, range, color, select, etc.)
- NFR-03: Graceful degradation if settings parsing fails

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SETTINGS FLOW                                     │
│                                                                      │
│  Frontend Settings State                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ {                                                               │ │
│  │   "title": "Featured Products",                                │ │
│  │   "featured_product": "product-handle",  ← product picker       │ │
│  │   "columns": 3,                          ← range                │ │
│  │   "show_vendor": true                    ← checkbox             │ │
│  │ }                                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                            │                                         │
│                            ▼ encode as base64                        │
│  URL: /apps/blocksmith-preview?settings=eyJ0aXRsZSI...               │
│                            │                                         │
│                            ▼ decode in proxy                         │
│  Backend: parseProxyParams() → settings object                       │
│                            │                                         │
│                            ▼ inject as Liquid assigns                │
│  {% capture section_settings_json %}{"title":"Featured..."}{% endcapture %}
│  {% assign section = section_settings_json | parse_json %}          │
│                            │                                         │
│  Problem: Liquid has no parse_json filter in App Proxy              │
└─────────────────────────────────────────────────────────────────────┘
```

## Challenge: section.settings Access

App Proxy Liquid lacks `parse_json` filter. Options:

### Option A: Individual Assigns (Recommended)
```liquid
{% assign settings_title = "Featured Products" %}
{% assign settings_featured_product = all_products["handle"] %}
{% assign settings_columns = 3 %}
```
**Con**: Templates must use `settings_title` not `section.settings.title`

### Option B: Custom JSON Object Building
```liquid
{% capture section_json %}
{
  "settings": {
    "title": "{{ title_escaped }}",
    "columns": {{ columns }}
  }
}
{% endcapture %}
```
**Con**: Complex, brittle, risk of injection

### Option C: Template Transformation
Pre-process template to rewrite `section.settings.X` → `settings_X`
**Con**: Complex regex, may break valid code

**Decision**: Use Option A + provide transformation guidance in docs.

## Related Code Files

### Modify
| File | Changes |
|------|---------|
| `app/utils/liquidWrapper.server.ts` | Enhanced settings injection |
| `app/routes/api.proxy.render.tsx` | Handle resource resolution |

### Create
| File | Purpose |
|------|---------|
| `app/utils/settingsTransform.server.ts` | Settings processing utilities |

## Implementation Steps

### Step 1: Create Settings Transform Utility

**File**: `app/utils/settingsTransform.server.ts`

```typescript
import type { SettingsState, BlockInstance } from "~/components/preview/schema/SchemaTypes";

interface SettingDefinition {
  id: string;
  type: string;
  default?: unknown;
}

/**
 * Generate Liquid assign statements for settings
 */
export function generateSettingsAssigns(
  settings: SettingsState,
  schema?: SettingDefinition[]
): string[] {
  const assigns: string[] = [];

  for (const [key, value] of Object.entries(settings)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");

    if (value === null || value === undefined) {
      assigns.push(`{% assign settings_${safeKey} = nil %}`);
    } else if (typeof value === "string") {
      // Escape for Liquid string
      const escaped = value.replace(/'/g, "\\'").replace(/\n/g, "\\n");
      assigns.push(`{% assign settings_${safeKey} = '${escaped}' %}`);
    } else if (typeof value === "number") {
      assigns.push(`{% assign settings_${safeKey} = ${value} %}`);
    } else if (typeof value === "boolean") {
      assigns.push(`{% assign settings_${safeKey} = ${value} %}`);
    } else if (Array.isArray(value)) {
      // Arrays as comma-separated, or skip if complex
      if (value.every((v) => typeof v === "string" || typeof v === "number")) {
        const items = value.map((v) => `"${v}"`).join(", ");
        assigns.push(`{% assign settings_${safeKey} = ${items} | split: ", " %}`);
      }
    }
    // Skip objects - can't represent in Liquid assigns easily
  }

  return assigns;
}

/**
 * Generate Liquid for blocks iteration
 */
export function generateBlocksAssigns(blocks: BlockInstance[]): string[] {
  if (blocks.length === 0) return [];

  const assigns: string[] = [];

  // Create individual block variables
  blocks.forEach((block, index) => {
    const prefix = `block_${index}`;
    assigns.push(`{% assign ${prefix}_id = '${block.id}' %}`);
    assigns.push(`{% assign ${prefix}_type = '${block.type}' %}`);

    // Block settings
    for (const [key, value] of Object.entries(block.settings || {})) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
      if (typeof value === "string") {
        const escaped = value.replace(/'/g, "\\'");
        assigns.push(`{% assign ${prefix}_${safeKey} = '${escaped}' %}`);
      } else if (typeof value === "number" || typeof value === "boolean") {
        assigns.push(`{% assign ${prefix}_${safeKey} = ${value} %}`);
      }
    }
  });

  assigns.push(`{% assign blocks_count = ${blocks.length} %}`);

  return assigns;
}

/**
 * Extract resource handles from settings (product/collection pickers)
 */
export function extractResourceHandles(settings: SettingsState): {
  productHandles: string[];
  collectionHandles: string[];
} {
  const productHandles: string[] = [];
  const collectionHandles: string[] = [];

  for (const [, value] of Object.entries(settings)) {
    if (typeof value !== "string") continue;

    // Heuristic: if value looks like a handle and setting key suggests resource
    // This is imperfect without schema context
    if (value.match(/^[a-z0-9-]+$/)) {
      // Could be either - ideally need schema type info
    }
  }

  return { productHandles, collectionHandles };
}
```

### Step 2: Update Liquid Wrapper

**File**: `app/utils/liquidWrapper.server.ts` (updated)

```typescript
import { generateSettingsAssigns, generateBlocksAssigns } from "./settingsTransform.server";

interface WrapperOptions {
  liquidCode: string;
  sectionId?: string;
  productHandle?: string;
  collectionHandle?: string;
  settings?: Record<string, unknown>;
  blocks?: BlockInstance[];
}

export function wrapLiquidForProxy({
  liquidCode,
  sectionId = "preview",
  productHandle,
  collectionHandle,
  settings = {},
  blocks = [],
}: WrapperOptions): string {
  const assigns: string[] = [];

  // Inject global product/collection context
  if (productHandle) {
    assigns.push(`{% assign product = all_products['${productHandle}'] %}`);
  }
  if (collectionHandle) {
    assigns.push(`{% assign collection = collections['${collectionHandle}'] %}`);
  }

  // Inject settings as individual assigns (settings_title, settings_columns, etc.)
  assigns.push(...generateSettingsAssigns(settings));

  // Inject blocks
  assigns.push(...generateBlocksAssigns(blocks));

  // Strip schema block
  const cleanedCode = liquidCode.replace(
    /\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/gi,
    ""
  );

  // Wrap with container
  return `
${assigns.join("\n")}
<div class="blocksmith-preview" id="shopify-section-${sectionId}">
${cleanedCode}
</div>
<style>
  .blocksmith-preview { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .blocksmith-preview img { max-width: 100%; height: auto; }
</style>
`.trim();
}
```

### Step 3: Update Proxy Route for Resource Resolution

**File**: `app/routes/api.proxy.render.tsx` (updated)

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { wrapLiquidForProxy, parseProxyParams } from "~/utils/liquidWrapper.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid, session, admin } = await authenticate.public.appProxy(request);

  if (!session) {
    return liquid(
      `<div class="blocksmith-error">App not installed</div>`,
      { layout: false }
    );
  }

  const url = new URL(request.url);
  const { code, settings, blocks, productHandle, collectionHandle, sectionId } =
    parseProxyParams(url);

  if (!code) {
    return liquid(`<div class="blocksmith-error">No code</div>`, { layout: false });
  }

  // Optionally resolve resource handles to verify they exist
  // This could use admin GraphQL to validate handles
  // For now, trust the handles from frontend

  try {
    const wrappedCode = wrapLiquidForProxy({
      liquidCode: code,
      sectionId,
      productHandle,
      collectionHandle,
      settings,
      blocks,
    });

    return liquid(wrappedCode, { layout: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return liquid(`<div class="blocksmith-error">${message}</div>`, { layout: false });
  }
};
```

### Step 4: Template Compatibility Layer (Optional)

For templates using `section.settings.X`, provide rewriting:

```typescript
// In liquidWrapper.server.ts

/**
 * Rewrite section.settings.X to settings_X for App Proxy compatibility
 * WARNING: This is a heuristic and may break valid code
 */
export function rewriteSectionSettings(code: string): string {
  // Match {{ section.settings.something }}
  return code.replace(
    /\{\{\s*section\.settings\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    "{{ settings_$1 }}"
  );
}
```

**Use sparingly** - document that native templates should use `settings_X` pattern.

## Todo List

- [ ] Create `app/utils/settingsTransform.server.ts`
- [ ] Implement `generateSettingsAssigns()` function
- [ ] Implement `generateBlocksAssigns()` function
- [ ] Update `liquidWrapper.server.ts` with settings injection
- [ ] Update `api.proxy.render.tsx` to parse blocks
- [ ] Update `useNativePreviewRenderer.ts` to send blocks
- [ ] Test settings passthrough (string, number, boolean)
- [ ] Test product/collection handle resolution
- [ ] Document `settings_X` vs `section.settings.X` difference

## Success Criteria

1. Text settings (`settings_title`) accessible in template
2. Number settings (`settings_columns`) work correctly
3. Boolean settings (`settings_show_vendor`) work correctly
4. Product handle resolves to actual product data
5. Blocks count accessible via `blocks_count`
6. Individual block settings accessible via `block_0_title`, etc.

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| section.settings pattern breaks | High | High | Document, provide rewrite util |
| Settings payload too large | Medium | Low | Compress, limit settings count |
| Block iteration pattern fails | High | High | Document limitation, provide workaround |

## Security Considerations

- **Settings Escaping**: All string values escaped for Liquid
- **Handle Validation**: Only alphanumeric handles allowed
- **Size Limits**: Limit settings payload to 4KB

## Next Steps

After completing this phase:
1. Proceed to Phase 05 (Testing & Fallback) for comprehensive testing
2. Document settings pattern differences for users

## Unresolved Questions

1. **section.settings compatibility**: Should we auto-rewrite `section.settings.X` to `settings_X`?
2. **Block iteration**: How to support `{% for block in section.blocks %}` pattern?
3. **Schema-aware settings**: Should proxy extract schema to determine setting types?
4. **Nested settings**: How to handle settings like `section.settings.product.title`?
