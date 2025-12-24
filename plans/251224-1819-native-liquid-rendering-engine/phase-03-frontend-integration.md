# Phase 03: Frontend Integration

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 02](./phase-02-backend-liquid-wrapper.md)
- Research: [Current Preview System](./research/researcher-02-current-preview-system.md)
- Related: `app/components/preview/SectionPreview.tsx`, `app/components/preview/PreviewFrame.tsx`

## Overview
| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Status | ✅ DONE (2025-12-24) |
| Effort | medium (6-8 hrs) |
| Description | Debounced fetch hook, NativePreviewFrame component, iframe srcdoc rendering |

## Key Insights (from Research)

1. **Current debounce**: 100ms in SectionPreview (too fast for network)
2. **iframe srcdoc**: Current PreviewFrame uses srcDoc with postMessage
3. **Device scaling**: CSS transform scaling for mobile/tablet/desktop
4. **Resources**: `loadedResources` contains product/collection for settings

## Requirements

### Functional
- FR-01: Debounce code changes 600ms before fetch
- FR-02: Build proxy URL with base64-encoded params
- FR-03: Fetch rendered HTML from proxy
- FR-04: Display in iframe (srcdoc or direct URL)
- FR-05: Show loading state during fetch
- FR-06: Display error banner on fetch failure

### Non-Functional
- NFR-01: Latency <500ms after debounce completes
- NFR-02: Cancel in-flight requests on new changes
- NFR-03: Support mobile/tablet/desktop viewports
- NFR-04: Maintain same interface as SectionPreview

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NativeSectionPreview                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ useNativePreviewRenderer(code, settings, resources)          │   │
│  │   - Debounce 600ms                                           │   │
│  │   - Build proxy URL                                          │   │
│  │   - Fetch with AbortController                               │   │
│  │   - Return { html, isLoading, error }                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ NativePreviewFrame                                           │   │
│  │   - iframe with srcdoc (rendered HTML)                       │   │
│  │   - CSS scaling for device sizes                             │   │
│  │   - Loading overlay                                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Reference (don't modify)
| File | Purpose |
|------|---------|
| `app/components/preview/SectionPreview.tsx` | Current client-side preview |
| `app/components/preview/PreviewFrame.tsx` | Iframe implementation |
| `app/components/preview/hooks/useLiquidRenderer.ts` | LiquidJS engine |

### Create
| File | Purpose |
|------|---------|
| `app/components/preview/hooks/useNativePreviewRenderer.ts` | Native render hook |
| `app/components/preview/NativePreviewFrame.tsx` | Native preview iframe |
| `app/components/preview/NativeSectionPreview.tsx` | Integration component |

## Implementation Steps

### Step 1: Create useNativePreviewRenderer Hook

**File**: `app/components/preview/hooks/useNativePreviewRenderer.ts`

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import type { SettingsState, BlockInstance } from "../schema/SchemaTypes";
import type { MockProduct, MockCollection } from "../mockData/types";

interface UseNativePreviewRendererOptions {
  liquidCode: string;
  settings?: SettingsState;
  blocks?: BlockInstance[];
  resources?: Record<string, MockProduct | MockCollection>;
  shopDomain: string;
  debounceMs?: number;
}

interface NativePreviewResult {
  html: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNativePreviewRenderer({
  liquidCode,
  settings = {},
  blocks = [],
  resources = {},
  shopDomain,
  debounceMs = 600,
}: UseNativePreviewRendererOptions): NativePreviewResult {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract product/collection handles from resources
  const getResourceHandles = useCallback(() => {
    let productHandle: string | null = null;
    let collectionHandle: string | null = null;

    for (const resource of Object.values(resources)) {
      if ("products" in resource && Array.isArray(resource.products)) {
        collectionHandle = (resource as MockCollection).handle || null;
      } else if ("variants" in resource) {
        productHandle = (resource as MockProduct).handle || null;
      }
    }

    return { productHandle, collectionHandle };
  }, [resources]);

  // Build proxy URL
  const buildProxyUrl = useCallback(() => {
    const base = `https://${shopDomain}/apps/blocksmith-preview`;
    const params = new URLSearchParams();

    // Base64 encode Liquid code
    params.set("code", Buffer.from(liquidCode).toString("base64"));

    // Add settings if present
    if (Object.keys(settings).length > 0) {
      params.set("settings", Buffer.from(JSON.stringify(settings)).toString("base64"));
    }

    // Add blocks if present
    if (blocks.length > 0) {
      params.set("blocks", Buffer.from(JSON.stringify(blocks)).toString("base64"));
    }

    // Add resource handles
    const { productHandle, collectionHandle } = getResourceHandles();
    if (productHandle) params.set("product", productHandle);
    if (collectionHandle) params.set("collection", collectionHandle);

    params.set("section_id", "preview");

    return `${base}?${params.toString()}`;
  }, [liquidCode, settings, blocks, shopDomain, getResourceHandles]);

  // Fetch preview
  const fetchPreview = useCallback(async () => {
    if (!liquidCode.trim() || !shopDomain) {
      setHtml("<p style='color:#6d7175;text-align:center;'>No code to preview</p>");
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const url = buildProxyUrl();
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const renderedHtml = await response.text();
      setHtml(renderedHtml);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Request cancelled, ignore
      }
      const message = err instanceof Error ? err.message : "Fetch failed";
      setError(message);
      setHtml(null);
    } finally {
      setIsLoading(false);
    }
  }, [liquidCode, shopDomain, buildProxyUrl]);

  // Debounced fetch on code/settings changes
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(fetchPreview, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [fetchPreview, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { html, isLoading, error, refetch: fetchPreview };
}
```

### Step 2: Create NativePreviewFrame Component

**File**: `app/components/preview/NativePreviewFrame.tsx`

```typescript
import { useRef, useEffect, useState } from "react";
import type { DeviceSize } from "./types";

interface NativePreviewFrameProps {
  html: string | null;
  isLoading: boolean;
  deviceSize: DeviceSize;
}

const DEVICE_WIDTHS: Record<DeviceSize, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1200,
};

export function NativePreviewFrame({
  html,
  isLoading,
  deviceSize,
}: NativePreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [iframeHeight, setIframeHeight] = useState<number>(400);

  // Measure container for scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Build full HTML document for iframe
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${html || "<div style='padding:20px;color:#6d7175;text-align:center;'>Loading preview...</div>"}
  <script>
    // Report height to parent
    function reportHeight() {
      window.parent.postMessage({ type: 'NATIVE_PREVIEW_HEIGHT', height: document.body.scrollHeight }, '*');
    }
    window.addEventListener('load', reportHeight);
    new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true });
  </script>
</body>
</html>
  `.trim();

  // Listen for height updates
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NATIVE_PREVIEW_HEIGHT") {
        setIframeHeight(Math.max(300, event.data.height));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const targetWidth = DEVICE_WIDTHS[deviceSize];
  const needsScaling = containerWidth > 0 && containerWidth < targetWidth;
  const scale = needsScaling ? containerWidth / targetWidth : 1;
  const scaledHeight = iframeHeight * scale;

  return (
    <s-box
      background="subdued"
      borderRadius="base"
      padding="base"
      blockSize={`${scaledHeight + 32}px`}
      overflow="hidden"
      position="relative"
    >
      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <s-spinner size="large" />
        </div>
      )}

      <div ref={containerRef} style={{ position: "relative", height: "100%", width: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            width: `${targetWidth}px`,
            marginLeft: `-${targetWidth / 2}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          <iframe
            srcDoc={fullHtml}
            sandbox="allow-scripts"
            style={{
              width: "100%",
              height: `${iframeHeight}px`,
              border: "1px solid var(--p-color-border)",
              borderRadius: "var(--p-border-radius-200)",
              backgroundColor: "var(--p-color-bg-surface)",
              display: "block",
            }}
            title="Native Section Preview"
          />
        </div>
      </div>
    </s-box>
  );
}
```

### Step 3: Create NativeSectionPreview Component

**File**: `app/components/preview/NativeSectionPreview.tsx`

```typescript
import { NativePreviewFrame } from "./NativePreviewFrame";
import { useNativePreviewRenderer } from "./hooks/useNativePreviewRenderer";
import type { DeviceSize } from "./types";
import type { SettingsState, BlockInstance } from "./schema/SchemaTypes";
import type { MockProduct, MockCollection } from "./mockData/types";

export interface NativeSectionPreviewProps {
  liquidCode: string;
  deviceSize?: DeviceSize;
  settingsValues?: SettingsState;
  blocksState?: BlockInstance[];
  loadedResources?: Record<string, MockProduct | MockCollection>;
  shopDomain: string;
  onRenderStateChange?: (isRendering: boolean) => void;
}

/**
 * Native section preview - uses App Proxy for server-side Liquid rendering
 */
export function NativeSectionPreview({
  liquidCode,
  deviceSize = "desktop",
  settingsValues = {},
  blocksState = [],
  loadedResources = {},
  shopDomain,
  onRenderStateChange,
}: NativeSectionPreviewProps) {
  const { html, isLoading, error, refetch } = useNativePreviewRenderer({
    liquidCode,
    settings: settingsValues,
    blocks: blocksState,
    resources: loadedResources,
    shopDomain,
    debounceMs: 600,
  });

  // Notify parent of loading state
  useEffect(() => {
    onRenderStateChange?.(isLoading);
  }, [isLoading, onRenderStateChange]);

  return (
    <s-stack blockSize="100%" gap="none">
      {/* Error banner */}
      {error && (
        <s-box padding="small">
          <s-banner tone="warning" dismissible>
            Preview error: {error}
            <s-button variant="plain" onClick={refetch}>Retry</s-button>
          </s-banner>
        </s-box>
      )}

      {/* Preview frame */}
      <s-box blockSize="100%">
        <NativePreviewFrame
          html={html}
          isLoading={isLoading}
          deviceSize={deviceSize}
        />
      </s-box>
    </s-stack>
  );
}
```

### Step 4: Get Shop Domain in Parent Components

Update parent components to pass `shopDomain`:

```typescript
// In app.tsx or layout, get shop from session
const { session } = await authenticate.admin(request);
const shopDomain = session.shop;

// Pass to preview component
<NativeSectionPreview
  liquidCode={code}
  shopDomain={shopDomain}
  // ...other props
/>
```

## Todo List

- [x] Create `useNativePreviewRenderer.ts` hook
- [x] Create `NativePreviewFrame.tsx` component
- [x] Create `NativeSectionPreview.tsx` component
- [x] Add shop domain passthrough from admin session
- [x] Test debounce behavior (600ms delay)
- [x] Test abort controller cancellation
- [x] Test device size scaling
- [x] Test loading overlay display
- [x] Test error banner with retry

## Success Criteria

1. Code changes debounced 600ms before fetch
2. Loading spinner shows during fetch
3. Error banner displays on failure with retry button
4. Device size scaling works correctly
5. No duplicate requests (abort controller works)
6. Shop domain correctly extracted from session

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CORS issues with proxy | High | Medium | App Proxy should handle, test in dev |
| Shop domain not available | High | Low | Fall back to client-side rendering |
| Base64 URL too long | Medium | Low | URL length limits ~8KB, monitor |

## Security Considerations

- **No credentials in URL**: Settings encoded but not sensitive
- **Sandboxed iframe**: `allow-scripts` only, no `allow-same-origin`
- **Abort controller**: Prevents resource leaks

## Next Steps

After completing this phase:
1. Proceed to Phase 04 (Settings & Context) for full settings support
2. Integration testing with real Shopify stores

## Unresolved Questions

1. **Shop domain access**: Best pattern to pass shop domain to preview components?
2. **Credentials mode**: Does `credentials: 'include'` work with app proxy?
3. **URL length limits**: What's max URL length for app proxy requests?
