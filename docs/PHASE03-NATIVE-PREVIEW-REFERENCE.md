# Phase 03 Native Preview Components - Developer Reference

Quick reference for using Phase 03 Frontend Integration components in Phase 04+ development.

## Component Overview

Three new components enable native Shopify Liquid rendering via App Proxy:

| Component | Purpose | File |
|-----------|---------|------|
| `useNativePreviewRenderer` | Hook for rendering Liquid via proxy | `app/components/preview/hooks/useNativePreviewRenderer.ts` |
| `NativePreviewFrame` | Iframe container with device scaling | `app/components/preview/NativePreviewFrame.tsx` |
| `NativeSectionPreview` | Composable preview component | `app/components/preview/NativeSectionPreview.tsx` |

## Usage Example (Phase 04)

```typescript
import { NativeSectionPreview } from '../components/preview';
import type { SettingsState, BlockInstance, DeviceSize } from '../components/preview/types';

function CodePreviewPanel() {
  const [liquidCode, setLiquidCode] = useState('');
  const [settingsValues, setSettingsValues] = useState<SettingsState>({});
  const [blocksState, setBlocksState] = useState<BlockInstance[]>([]);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');

  // From loader data (app.sections.$id.tsx)
  const { shopDomain } = useLoaderData();

  return (
    <NativeSectionPreview
      liquidCode={liquidCode}
      settingsValues={settingsValues}
      blocksState={blocksState}
      shopDomain={shopDomain}
      deviceSize={deviceSize}
      onRenderStateChange={(isRendering) => {
        console.log('Preview rendering:', isRendering);
      }}
    />
  );
}
```

## Hook Usage

For direct hook usage without the wrapper component:

```typescript
import { useNativePreviewRenderer } from '../components/preview';

function CustomPreview() {
  const { html, isLoading, error, refetch } = useNativePreviewRenderer({
    liquidCode: '{% for item in section.blocks %}{{ item.settings.text }}{% endfor %}',
    settings: { color: '#FF0000' },
    blocks: [{ id: '1', type: 'text', settings: { text: 'Hello' } }],
    shopDomain: 'example.myshopify.com',
    debounceMs: 600, // Optional, defaults to 600
  });

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (isLoading) return <div>Loading...</div>;
  return <div dangerouslySetInnerHTML={{ __html: html || '' }} />;
}
```

## Data Flow

```
Loader Data
├── shopDomain: string (from session.shop)
│
Component
├── liquidCode: string (editor state)
├── settingsValues: SettingsState (form inputs)
├── blocksState: BlockInstance[] (block instances)
├── deviceSize: DeviceSize ('mobile'|'tablet'|'desktop')
│
Hook (useNativePreviewRenderer)
├── Debounce: 600ms
├── Encode: TextEncoder + base64
├── Build URL: https://{shopDomain}/apps/blocksmith-preview?code=...
├── Fetch: App Proxy endpoint
│
Frame (NativePreviewFrame)
├── Scale: Container width → device width
├── Inject: HTML into srcdoc
├── Report: Height via postMessage
│
UI: Rendered Shopify Liquid
```

## Performance Considerations

### Debouncing (600ms)

Default debounce delay prevents excessive requests during rapid typing:

```typescript
// For instant updates (testing only):
const { html, isLoading, error } = useNativePreviewRenderer({
  liquidCode,
  shopDomain,
  debounceMs: 0, // No debounce
});

// For slower updates (mobile):
const { html, isLoading, error } = useNativePreviewRenderer({
  liquidCode,
  shopDomain,
  debounceMs: 1000, // 1 second
});
```

### Request Cancellation

AbortController automatically cancels in-flight requests when:
- Component unmounts
- New request starts (new `liquidCode`, `settings`, etc.)
- No manual intervention needed

### Memory

Hook cleans up:
- Debounce timeouts on unmount
- AbortController signals on unmount
- Message listeners on unmount

## Device Scaling

Frame supports three device sizes with exact widths:

```typescript
type DeviceSize = 'mobile' | 'tablet' | 'desktop';

// Widths used for scaling
mobile:  375px
tablet:  768px
desktop: 1200px
```

Scale factor calculated as: `containerWidth / targetWidth`

CSS transform applies scale with `transform-origin: top center` for natural preview.

## Error Handling

### Network Errors

```typescript
{error && (
  <div>
    <p>Preview error: {error}</p>
    <button onClick={refetch}>Retry</button>
  </div>
)}
```

### Empty Code

Shows placeholder: `<p style="color:#6d7175;text-align:center;">No code to preview</p>`

### AbortError

Silently ignored (request was intentionally cancelled)

### Missing shopDomain

Hook returns empty state until `shopDomain` is provided

## Encoding Strategy

Parameters sent to App Proxy via base64:

```typescript
// Liquid code (always base64)
?code=base64-encoded-liquid

// Settings (JSON → base64, optional)
?settings=base64-encoded-json

// Blocks (JSON → base64, optional)
?blocks=base64-encoded-json

// Resource handles (plain string, optional)
?product=handle
?collection=handle

// Section ID (always "preview")
?section_id=preview
```

Example encoding:

```javascript
const liquidCode = `{% if section.settings.show_title %}
  <h1>{{ section.settings.title }}</h1>
{% endif %}`;

// TextEncoder handles Unicode properly
const bytes = new TextEncoder().encode(liquidCode);
let binary = '';
for (let i = 0; i < bytes.length; i++) {
  binary += String.fromCharCode(bytes[i]);
}
const encoded = btoa(binary); // Safe base64
```

## Security Features

### Iframe Sandbox

```html
<iframe
  sandbox="allow-scripts"
  srcDoc={fullHtml}
/>
```

- Scripts allowed (for Shopify Liquid dynamic features)
- External resources blocked
- Cross-origin access prevented

### Message Validation

```typescript
const handler = (event: MessageEvent) => {
  // Reject messages from different origins
  if (event.origin !== 'null' && event.origin !== window.location.origin) {
    return;
  }
  // Process safe message
};
```

- Accepts `null` origin (srcdoc)
- Accepts same-origin messages
- Rejects cross-origin messages

## Browser Compatibility

| Feature | Support |
|---------|---------|
| TextEncoder | All modern browsers |
| ResizeObserver | All modern browsers |
| MutationObserver | All modern browsers |
| AbortController | All modern browsers |
| Iframe srcdoc | All modern browsers |
| postMessage | All browsers |

## Troubleshooting

### Preview not updating

Check debounce delay - increase if rapid typing causes misses:

```typescript
debounceMs: 1000 // Increase to 1s
```

### Preview content scaled incorrectly

Verify device width constants in NativePreviewFrame match expected values.

### Height not reporting

Check iframe HTML includes MutationObserver script:

```html
<script>
  new MutationObserver(reportHeight).observe(document.body, {
    childList: true,
    subtree: true
  });
</script>
```

### CORS/Origin errors

Ensure App Proxy endpoint at `https://{shopDomain}/apps/blocksmith-preview` is accessible and CORS-configured.

---

**Phase**: 03 (Frontend Integration)
**Next Phase**: 04 (CodePreviewPanel Integration)
**Last Updated**: 2025-12-24
