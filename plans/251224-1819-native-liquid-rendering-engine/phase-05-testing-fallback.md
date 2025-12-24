# Phase 05: Testing & Fallback

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 04](./phase-04-settings-context.md)
- Related: `app/components/preview/SectionPreview.tsx` (fallback target)

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 - Important |
| Status | pending |
| Effort | medium (6-8 hrs) |
| Description | Unit tests, integration tests, graceful fallback to LiquidJS |

## Key Insights

1. **Current fallback**: Error banner shown on render failure
2. **LiquidJS still available**: Can fall back to client-side rendering
3. **Test coverage**: No existing tests for preview components
4. **Error states**: Network failures, invalid Liquid, proxy errors

## Requirements

### Functional
- FR-01: Automatic fallback to LiquidJS on proxy failure
- FR-02: User-visible indicator when using fallback mode
- FR-03: Manual toggle between native/fallback modes
- FR-04: Error logging for debugging proxy issues

### Non-Functional
- NFR-01: Fallback latency <200ms after failure detection
- NFR-02: Test coverage >80% for new code
- NFR-03: E2E tests pass in CI

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PREVIEW RENDERER FLOW                             │
│                                                                      │
│  ┌─────────────────────┐                                            │
│  │ usePreviewRenderer  │ ← Unified hook                             │
│  │   mode: 'native' | 'fallback' | 'auto'                          │
│  └──────────┬──────────┘                                            │
│             │                                                        │
│             ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ if (mode === 'native' || mode === 'auto') {                 │   │
│  │   try native proxy first                                     │   │
│  │ }                                                            │   │
│  │                                                              │   │
│  │ if (nativeFailed || mode === 'fallback') {                  │   │
│  │   use LiquidJS client-side                                   │   │
│  │ }                                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Modify
| File | Changes |
|------|---------|
| `app/components/preview/hooks/useNativePreviewRenderer.ts` | Add fallback logic |

### Create
| File | Purpose |
|------|---------|
| `app/components/preview/hooks/usePreviewRenderer.ts` | Unified renderer with fallback |
| `app/components/preview/PreviewModeIndicator.tsx` | UI indicator for mode |
| `app/utils/__tests__/liquidWrapper.server.test.ts` | Unit tests |
| `app/routes/__tests__/api.proxy.render.test.ts` | Route tests |
| `tests/e2e/native-preview.spec.ts` | E2E tests |

## Implementation Steps

### Step 1: Create Unified Preview Renderer Hook

**File**: `app/components/preview/hooks/usePreviewRenderer.ts`

```typescript
import { useState, useCallback, useEffect, useRef } from "react";
import { useNativePreviewRenderer } from "./useNativePreviewRenderer";
import { useLiquidRenderer } from "./useLiquidRenderer";
import { buildPreviewContext } from "../utils/buildPreviewContext";
import type { DeviceSize, PreviewSettings } from "../types";
import type { SettingsState, BlockInstance } from "../schema/SchemaTypes";
import type { MockProduct, MockCollection } from "../mockData/types";

type PreviewMode = "native" | "fallback" | "auto";

interface UsePreviewRendererOptions {
  liquidCode: string;
  settings?: SettingsState;
  blocks?: BlockInstance[];
  resources?: Record<string, MockProduct | MockCollection>;
  shopDomain?: string;
  mode?: PreviewMode;
}

interface PreviewResult {
  html: string | null;
  css: string;
  isLoading: boolean;
  error: string | null;
  activeMode: "native" | "fallback";
  refetch: () => void;
}

export function usePreviewRenderer({
  liquidCode,
  settings = {},
  blocks = [],
  resources = {},
  shopDomain,
  mode = "auto",
}: UsePreviewRendererOptions): PreviewResult {
  const [activeMode, setActiveMode] = useState<"native" | "fallback">(
    mode === "fallback" ? "fallback" : "native"
  );
  const [nativeFailed, setNativeFailed] = useState(false);
  const fallbackTriggeredRef = useRef(false);

  // Native renderer
  const native = useNativePreviewRenderer({
    liquidCode,
    settings,
    blocks,
    resources,
    shopDomain: shopDomain || "",
    enabled: activeMode === "native" && !!shopDomain,
  });

  // Fallback renderer (LiquidJS)
  const { render: fallbackRender, isRendering: fallbackLoading } = useLiquidRenderer();
  const [fallbackHtml, setFallbackHtml] = useState<string | null>(null);
  const [fallbackCss, setFallbackCss] = useState<string>("");
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  // Trigger fallback on native failure
  useEffect(() => {
    if (native.error && mode === "auto" && !fallbackTriggeredRef.current) {
      console.warn("[Preview] Native render failed, falling back to LiquidJS:", native.error);
      fallbackTriggeredRef.current = true;
      setActiveMode("fallback");
      setNativeFailed(true);
    }
  }, [native.error, mode]);

  // Run fallback renderer
  useEffect(() => {
    if (activeMode !== "fallback") return;

    const runFallback = async () => {
      try {
        setFallbackError(null);
        const context = buildPreviewContext({ settingsResources: resources });
        const { html, css } = await fallbackRender(liquidCode, settings, blocks, context);
        setFallbackHtml(html);
        setFallbackCss(css);
      } catch (err) {
        setFallbackError(err instanceof Error ? err.message : "Fallback render failed");
      }
    };

    const timeout = setTimeout(runFallback, 100);
    return () => clearTimeout(timeout);
  }, [activeMode, liquidCode, settings, blocks, resources, fallbackRender]);

  // Return appropriate result based on mode
  if (activeMode === "native") {
    return {
      html: native.html,
      css: "",
      isLoading: native.isLoading,
      error: native.error,
      activeMode: "native",
      refetch: native.refetch,
    };
  }

  return {
    html: fallbackHtml,
    css: fallbackCss,
    isLoading: fallbackLoading,
    error: fallbackError,
    activeMode: "fallback",
    refetch: () => {
      // Re-run fallback
      setFallbackHtml(null);
    },
  };
}
```

### Step 2: Create Mode Indicator Component

**File**: `app/components/preview/PreviewModeIndicator.tsx`

```typescript
interface PreviewModeIndicatorProps {
  mode: "native" | "fallback";
  onToggle?: () => void;
}

export function PreviewModeIndicator({ mode, onToggle }: PreviewModeIndicatorProps) {
  return (
    <s-inline gap="tight" align="center">
      <s-badge tone={mode === "native" ? "success" : "warning"}>
        {mode === "native" ? "Native" : "Fallback"}
      </s-badge>
      {mode === "fallback" && (
        <s-text variant="bodySm" tone="subdued">
          Using client-side rendering
        </s-text>
      )}
      {onToggle && (
        <s-button variant="plain" size="slim" onClick={onToggle}>
          Switch mode
        </s-button>
      )}
    </s-inline>
  );
}
```

### Step 3: Unit Tests for Liquid Wrapper

**File**: `app/utils/__tests__/liquidWrapper.server.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { wrapLiquidForProxy, parseProxyParams } from "../liquidWrapper.server";

describe("liquidWrapper", () => {
  describe("wrapLiquidForProxy", () => {
    it("strips schema block", () => {
      const code = `
        <div>Hello</div>
        {% schema %}{"name": "Test"}{% endschema %}
      `;
      const result = wrapLiquidForProxy({ liquidCode: code });
      expect(result).not.toContain("schema");
      expect(result).toContain("Hello");
    });

    it("injects product context", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "<p>{{ product.title }}</p>",
        productHandle: "test-product",
      });
      expect(result).toContain("{% assign product = all_products['test-product'] %}");
    });

    it("injects collection context", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "<p>{{ collection.title }}</p>",
        collectionHandle: "test-collection",
      });
      expect(result).toContain("{% assign collection = collections['test-collection'] %}");
    });

    it("wraps with container div", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "<p>Test</p>",
        sectionId: "my-section",
      });
      expect(result).toContain('id="shopify-section-my-section"');
      expect(result).toContain('class="blocksmith-preview"');
    });

    it("injects settings as assigns", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "<p>{{ settings_title }}</p>",
        settings: { title: "Hello World", columns: 3, show_vendor: true },
      });
      expect(result).toContain("{% assign settings_title = 'Hello World' %}");
      expect(result).toContain("{% assign settings_columns = 3 %}");
      expect(result).toContain("{% assign settings_show_vendor = true %}");
    });
  });

  describe("parseProxyParams", () => {
    it("decodes base64 code", () => {
      const encoded = Buffer.from("<p>Test</p>").toString("base64");
      const url = new URL(`http://test.com?code=${encoded}`);
      const { code } = parseProxyParams(url);
      expect(code).toBe("<p>Test</p>");
    });

    it("returns null for invalid code", () => {
      const url = new URL("http://test.com?code=!!invalid!!");
      const { code } = parseProxyParams(url);
      expect(code).toBeNull();
    });

    it("parses settings JSON", () => {
      const settings = { title: "Test" };
      const encoded = Buffer.from(JSON.stringify(settings)).toString("base64");
      const url = new URL(`http://test.com?settings=${encoded}`);
      const result = parseProxyParams(url);
      expect(result.settings).toEqual(settings);
    });

    it("extracts resource handles", () => {
      const url = new URL("http://test.com?product=my-product&collection=my-collection");
      const { productHandle, collectionHandle } = parseProxyParams(url);
      expect(productHandle).toBe("my-product");
      expect(collectionHandle).toBe("my-collection");
    });
  });
});
```

### Step 4: Route Handler Tests

**File**: `app/routes/__tests__/api.proxy.render.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "../api.proxy.render";

// Mock shopify.server
vi.mock("~/shopify.server", () => ({
  authenticate: {
    public: {
      appProxy: vi.fn(),
    },
  },
}));

import { authenticate } from "~/shopify.server";

describe("api.proxy.render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when app not installed", async () => {
    const mockLiquid = vi.fn((content, opts) => new Response(content));
    (authenticate.public.appProxy as any).mockResolvedValue({
      liquid: mockLiquid,
      session: null,
    });

    const request = new Request("http://test.com/api/proxy/render");
    await loader({ request, params: {}, context: {} });

    expect(mockLiquid).toHaveBeenCalledWith(
      expect.stringContaining("not installed"),
      expect.any(Object)
    );
  });

  it("returns error when no code provided", async () => {
    const mockLiquid = vi.fn((content, opts) => new Response(content));
    (authenticate.public.appProxy as any).mockResolvedValue({
      liquid: mockLiquid,
      session: { shop: "test.myshopify.com" },
    });

    const request = new Request("http://test.com/api/proxy/render");
    await loader({ request, params: {}, context: {} });

    expect(mockLiquid).toHaveBeenCalledWith(
      expect.stringContaining("No"),
      expect.any(Object)
    );
  });

  it("renders valid Liquid code", async () => {
    const mockLiquid = vi.fn((content, opts) => new Response(content));
    (authenticate.public.appProxy as any).mockResolvedValue({
      liquid: mockLiquid,
      session: { shop: "test.myshopify.com" },
    });

    const code = Buffer.from("<p>Hello {{ shop.name }}</p>").toString("base64");
    const request = new Request(`http://test.com/api/proxy/render?code=${code}`);
    await loader({ request, params: {}, context: {} });

    expect(mockLiquid).toHaveBeenCalledWith(
      expect.stringContaining("Hello"),
      { layout: false }
    );
  });
});
```

### Step 5: E2E Test (Optional)

**File**: `tests/e2e/native-preview.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Native Preview", () => {
  test.skip("renders section with native Liquid", async ({ page }) => {
    // This test requires a running dev server with app proxy configured
    // Skip in CI unless proxy is available

    await page.goto("/app/sections/new");

    // Enter some Liquid code
    const editor = page.locator('[data-testid="code-editor"]');
    await editor.fill("<h1>{{ shop.name }}</h1>");

    // Wait for preview to render
    const preview = page.frameLocator('[title="Native Section Preview"]');
    await expect(preview.locator("h1")).toContainText(/./); // Any shop name
  });

  test("falls back to LiquidJS on proxy error", async ({ page }) => {
    // Mock proxy to fail
    await page.route("**/apps/blocksmith-preview**", (route) => {
      route.abort("failed");
    });

    await page.goto("/app/sections/new");

    // Check fallback indicator appears
    await expect(page.locator('[data-testid="preview-mode-indicator"]')).toContainText("Fallback");
  });
});
```

## Todo List

- [ ] Create `usePreviewRenderer.ts` unified hook
- [ ] Create `PreviewModeIndicator.tsx` component
- [ ] Write unit tests for `liquidWrapper.server.ts`
- [ ] Write unit tests for `api.proxy.render.tsx`
- [ ] Write unit tests for `usePreviewRenderer.ts`
- [ ] Write E2E test for fallback behavior
- [ ] Add error logging with structured format
- [ ] Update parent components to use unified hook
- [ ] Test fallback trigger on network failure
- [ ] Test fallback trigger on proxy error response

## Success Criteria

1. Fallback triggers automatically on native failure
2. Mode indicator shows current rendering mode
3. Unit tests pass with >80% coverage
4. E2E tests pass in CI
5. Console logs structured error info for debugging
6. Manual mode toggle works correctly

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Fallback triggers too often | Medium | Medium | Add retry logic, debounce failures |
| Test mocking complexity | Low | Medium | Use dependency injection |
| E2E tests flaky | Low | High | Skip proxy-dependent tests in CI |

## Security Considerations

- **Error messages**: Don't expose internal errors to users
- **Logging**: Don't log sensitive data (settings, code)

## Next Steps

After completing this phase:
1. Feature complete - ready for QA testing
2. Performance benchmarking native vs fallback
3. User documentation for settings pattern differences

## Unresolved Questions

1. **Retry strategy**: How many retries before falling back?
2. **Fallback persistence**: Should fallback mode persist across page loads?
3. **User preference**: Should users be able to force native mode even with errors?
4. **Error telemetry**: Should we track fallback events for monitoring?
