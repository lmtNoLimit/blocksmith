# Phase 01: Update AppProxyPreviewFrame to Use srcDoc

**Target File**: `app/components/preview/AppProxyPreviewFrame.tsx`
**Reference**: `app/components/preview/NativeSectionPreview.tsx` (working pattern)

---

## Current State (BROKEN)

```tsx
// Line 296-310 of AppProxyPreviewFrame.tsx
<iframe
  ref={iframeRef}
  src={iframeSrc}  // ← PROBLEM: direct URL fails CORS/CSP
  onLoad={handleIframeLoad}
  onError={handleIframeError}
  ...
/>
```

## Target State (WORKING)

```tsx
<iframe
  srcDoc={fullHtml}          // ← SOLUTION: inline HTML bypasses CORS
  sandbox="allow-scripts"     // ← Security: isolate from parent
  ...
/>
```

---

## Implementation Steps

### Step 1: Import useNativePreviewRenderer Hook

```tsx
// Add to imports section
import { useNativePreviewRenderer } from './hooks/useNativePreviewRenderer';
```

### Step 2: Replace Internal Logic

Replace the URL-based loading with the hook pattern:

```tsx
export function AppProxyPreviewFrame({
  liquidCode,
  shopDomain,
  deviceSize = "desktop",
  settings = {},
  blocks = [],
  resources = {},
  debounceMs = 600,
  onRenderStateChange,
  onRefreshRef,
}: AppProxyPreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [iframeHeight, setIframeHeight] = useState<number>(400);

  // Use the hook instead of manual URL loading
  const { html, isLoading, error, refetch } = useNativePreviewRenderer({
    liquidCode,
    settings,
    blocks,
    resources,
    shopDomain,
    debounceMs,
  });

  // Notify parent of render state
  useEffect(() => {
    onRenderStateChange?.(isLoading);
  }, [isLoading, onRenderStateChange]);

  // Expose refetch to parent
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = refetch;
    }
  }, [onRefreshRef, refetch]);

  // ... rest of component
}
```

### Step 3: Build Full HTML Document

```tsx
// Build complete HTML document for srcDoc
const fullHtml = useMemo(() => {
  if (!html) return null;
  return `
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
  ${html}
  <script>
    function reportHeight() {
      window.parent.postMessage({ type: 'NATIVE_PREVIEW_HEIGHT', height: document.body.scrollHeight }, '*');
    }
    window.addEventListener('load', reportHeight);
    new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true });
  </script>
</body>
</html>`.trim();
}, [html]);
```

### Step 4: Add Height Listener

```tsx
// Listen for height updates from iframe
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.origin !== 'null' && event.origin !== window.location.origin) return;
    if (event.data?.type === 'NATIVE_PREVIEW_HEIGHT') {
      setIframeHeight(Math.max(300, event.data.height));
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

### Step 5: Update Iframe Element

```tsx
{fullHtml && !showNoCode && (
  <div style={{
    position: 'absolute',
    top: 0,
    left: '50%',
    width: `${targetWidth}px`,
    marginLeft: `-${targetWidth / 2}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
  }}>
    <iframe
      srcDoc={fullHtml}
      sandbox="allow-scripts"
      style={{
        width: '100%',
        height: `${iframeHeight}px`,
        border: '1px solid var(--p-color-border)',
        borderRadius: 'var(--p-border-radius-200)',
        backgroundColor: 'var(--p-color-bg-surface)',
        display: 'block',
      }}
      title="Section Preview"
      aria-label="Live preview of generated section"
    />
  </div>
)}
```

---

## Code to Remove

1. **useAppProxyAuth hook usage** - no longer needed
2. **buildAppProxyUrl function** - no longer needed
3. **base64Encode function** - moved to hook
4. **iframeSrc state** - replaced with html from hook
5. **handleIframeLoad/handleIframeError** - simplified

---

## Dependencies

- `useNativePreviewRenderer` hook (already exists)
- No new npm packages needed

---

## Validation Checklist

- [ ] Component renders without errors
- [ ] Preview shows Liquid content
- [ ] Device size switching works
- [ ] Settings changes trigger re-render
- [ ] Loading spinner displays during fetch
- [ ] Error banner shows on fetch failure
- [ ] Refresh function works via onRefreshRef
