# Phase 01: Preview Infrastructure

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Dependencies**: None (foundational phase)
- **Related Docs**: [code-standards.md](../../docs/code-standards.md), [system-architecture.md](../../docs/system-architecture.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-01 |
| Description | Set up LiquidJS rendering engine, iframe component, and postMessage communication |
| Priority | P0 - Critical (blocks all other phases) |
| Implementation Status | Not Started |
| Review Status | Not Started |

## Key Insights from Research

1. **LiquidJS** is Shopify-compatible, runs in browser, ~4x faster with streaming
2. **Same-origin iframe** avoids CORS; use `sandbox="allow-scripts allow-same-origin"`
3. **PostMessage** latency typically 10-50ms for simple updates
4. **Debounce** updates to max 100ms frequency to prevent excessive re-renders
5. **Origin validation** critical for security - never use `*` as targetOrigin

## Requirements

1. Install and configure LiquidJS v10+
2. Create sandboxed iframe component for preview rendering
3. Implement postMessage communication protocol
4. Build basic Liquid template renderer with error handling
5. Create preview toolbar with refresh and device size controls
6. Integrate preview into GeneratePreviewColumn (tabbed view: Code | Preview)

## Architecture

### Component Structure

```
app/components/preview/
├── SectionPreview.tsx       # Main container, manages state
├── PreviewFrame.tsx         # Iframe wrapper with sandbox attrs
├── PreviewToolbar.tsx       # Device selector, refresh button
├── PreviewRenderer.tsx      # Renders inside iframe (standalone HTML)
├── hooks/
│   ├── useLiquidRenderer.ts # LiquidJS parse + render
│   └── usePreviewMessaging.ts # PostMessage send/receive
└── types.ts                 # Preview-related types
```

### Data Flow

```
┌─────────────────────┐
│ GeneratePreviewColumn│
│ (parent component)   │
└──────────┬──────────┘
           │ generatedCode, settings
           ▼
┌─────────────────────┐
│   SectionPreview    │
│ - manages preview   │
│ - parses schema     │
│ - calls LiquidJS    │
└──────────┬──────────┘
           │ postMessage({ html, css })
           ▼
┌─────────────────────┐
│   PreviewFrame      │
│ (sandboxed iframe)  │
│ - receives messages │
│ - updates innerHTML │
└─────────────────────┘
```

### PostMessage Protocol

```typescript
// Message types
type PreviewMessage =
  | { type: 'RENDER'; html: string; css: string }
  | { type: 'RENDER_ERROR'; error: string }
  | { type: 'RESIZE'; height: number }; // Optional: auto-height

// Parent → Iframe
iframe.contentWindow?.postMessage(
  { type: 'RENDER', html, css },
  window.location.origin // Same origin
);

// Iframe → Parent (for height sync)
window.parent.postMessage(
  { type: 'RESIZE', height: document.body.scrollHeight },
  window.location.origin
);
```

## Related Code Files

| File | Purpose | Status |
|------|---------|--------|
| `app/components/generate/GeneratePreviewColumn.tsx` | Integrate preview tab | Modify |
| `app/components/generate/CodePreview.tsx` | Existing code display | Reference |
| `app/components/preview/` | New preview components | Create |

## Implementation Steps

### Step 1: Install LiquidJS

```bash
npm install liquidjs
```

### Step 2: Create Preview Types (`app/components/preview/types.ts`)

```typescript
export interface PreviewSettings {
  [key: string]: string | number | boolean;
}

export interface PreviewMessage {
  type: 'RENDER' | 'RENDER_ERROR' | 'RESIZE';
  html?: string;
  css?: string;
  error?: string;
  height?: number;
}

export interface PreviewState {
  isLoading: boolean;
  error: string | null;
  lastRenderTime: number;
}

export type DeviceSize = 'mobile' | 'tablet' | 'desktop';
export const DEVICE_WIDTHS: Record<DeviceSize, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1200
};
```

### Step 3: Create LiquidJS Hook (`app/components/preview/hooks/useLiquidRenderer.ts`)

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { Liquid } from 'liquidjs';
import type { PreviewSettings } from '../types';

interface UseLiquidRendererResult {
  render: (template: string, settings: PreviewSettings) => Promise<{ html: string; css: string }>;
  isRendering: boolean;
  error: string | null;
}

export function useLiquidRenderer(): UseLiquidRendererResult {
  const engineRef = useRef<Liquid | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize LiquidJS engine once
  useEffect(() => {
    engineRef.current = new Liquid({
      strictFilters: false, // Allow unknown filters
      strictVariables: false // Allow undefined variables
    });

    // Register Shopify-specific filter stubs
    engineRef.current.registerFilter('img_url', (url, size) => url || '/placeholder.png');
    engineRef.current.registerFilter('money', (cents) => `$${(cents / 100).toFixed(2)}`);
    engineRef.current.registerFilter('asset_url', (path) => `/assets/${path}`);
    engineRef.current.registerFilter('t', (key) => key); // Translation stub
  }, []);

  const render = useCallback(async (
    template: string,
    settings: PreviewSettings
  ): Promise<{ html: string; css: string }> => {
    if (!engineRef.current) {
      throw new Error('Liquid engine not initialized');
    }

    setIsRendering(true);
    setError(null);

    try {
      // Extract CSS from <style> tags
      const styleMatch = template.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      const css = styleMatch?.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n') || '';

      // Remove style tags from template for HTML-only rendering
      const htmlTemplate = template.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

      // Build render context with section object
      const context = {
        section: {
          id: 'preview-section',
          settings
        },
        settings, // Also expose at root for convenience
      };

      const html = await engineRef.current.parseAndRender(htmlTemplate, context);

      return { html, css };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Render failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsRendering(false);
    }
  }, []);

  return { render, isRendering, error };
}
```

### Step 4: Create PostMessage Hook (`app/components/preview/hooks/usePreviewMessaging.ts`)

```typescript
import { useCallback, useEffect, useRef } from 'react';
import type { PreviewMessage } from '../types';

interface UsePreviewMessagingResult {
  sendMessage: (message: PreviewMessage) => void;
  setIframe: (iframe: HTMLIFrameElement | null) => void;
}

export function usePreviewMessaging(
  onMessage?: (message: PreviewMessage) => void
): UsePreviewMessagingResult {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const expectedOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Listen for messages from iframe
  useEffect(() => {
    if (!onMessage) return;

    const handleMessage = (event: MessageEvent) => {
      // Security: Validate origin
      if (event.origin !== expectedOrigin) {
        console.warn('Ignored message from unexpected origin:', event.origin);
        return;
      }

      // Validate message structure
      if (event.data && typeof event.data.type === 'string') {
        onMessage(event.data as PreviewMessage);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage, expectedOrigin]);

  const sendMessage = useCallback((message: PreviewMessage) => {
    if (!iframeRef.current?.contentWindow) {
      console.warn('Cannot send message: iframe not ready');
      return;
    }

    iframeRef.current.contentWindow.postMessage(message, expectedOrigin);
  }, [expectedOrigin]);

  const setIframe = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeRef.current = iframe;
  }, []);

  return { sendMessage, setIframe };
}
```

### Step 5: Create PreviewFrame Component (`app/components/preview/PreviewFrame.tsx`)

```typescript
import { useRef, useEffect, useCallback } from 'react';
import type { DeviceSize } from './types';

export interface PreviewFrameProps {
  deviceSize: DeviceSize;
  onLoad?: (iframe: HTMLIFrameElement) => void;
}

const DEVICE_WIDTHS: Record<DeviceSize, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%'
};

// Standalone HTML template for iframe
const IFRAME_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style id="preview-styles"></style>
  <style>
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .preview-error { color: #d72c0d; padding: 16px; background: #fff4f4; border-radius: 8px; }
  </style>
</head>
<body>
  <div id="preview-content"></div>
  <script>
    const expectedOrigin = window.location.origin;
    window.addEventListener('message', (event) => {
      if (event.origin !== expectedOrigin) return;
      const { type, html, css, error } = event.data;

      if (type === 'RENDER') {
        document.getElementById('preview-styles').textContent = css || '';
        document.getElementById('preview-content').innerHTML = html || '';
        // Notify parent of new height
        window.parent.postMessage(
          { type: 'RESIZE', height: document.body.scrollHeight },
          expectedOrigin
        );
      } else if (type === 'RENDER_ERROR') {
        document.getElementById('preview-content').innerHTML =
          '<div class="preview-error">' + (error || 'Render error') + '</div>';
      }
    });
  </script>
</body>
</html>
`;

export function PreviewFrame({ deviceSize, onLoad }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && onLoad) {
      // Wait for iframe to initialize
      const iframe = iframeRef.current;
      iframe.onload = () => onLoad(iframe);
    }
  }, [onLoad]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: '#f6f6f7',
      borderRadius: '8px',
      padding: '16px',
      minHeight: '400px'
    }}>
      <iframe
        ref={iframeRef}
        srcDoc={IFRAME_HTML}
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: DEVICE_WIDTHS[deviceSize],
          maxWidth: '100%',
          minHeight: '300px',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          backgroundColor: '#fff',
          transition: 'width 0.2s ease'
        }}
        title="Section Preview"
      />
    </div>
  );
}
```

### Step 6: Create PreviewToolbar Component (`app/components/preview/PreviewToolbar.tsx`)

```typescript
import type { DeviceSize } from './types';

export interface PreviewToolbarProps {
  deviceSize: DeviceSize;
  onDeviceSizeChange: (size: DeviceSize) => void;
  onRefresh: () => void;
  isRendering?: boolean;
}

export function PreviewToolbar({
  deviceSize,
  onDeviceSizeChange,
  onRefresh,
  isRendering
}: PreviewToolbarProps) {
  return (
    <s-stack gap="base" direction="inline" justifyContent="space-between" alignItems="center">
      {/* Device size selector */}
      <s-button-group>
        <s-button
          variant={deviceSize === 'mobile' ? 'primary' : 'secondary'}
          onClick={() => onDeviceSizeChange('mobile')}
          icon="mobile"
          size="slim"
        >
          Mobile
        </s-button>
        <s-button
          variant={deviceSize === 'tablet' ? 'primary' : 'secondary'}
          onClick={() => onDeviceSizeChange('tablet')}
          icon="tablet"
          size="slim"
        >
          Tablet
        </s-button>
        <s-button
          variant={deviceSize === 'desktop' ? 'primary' : 'secondary'}
          onClick={() => onDeviceSizeChange('desktop')}
          icon="desktop"
          size="slim"
        >
          Desktop
        </s-button>
      </s-button-group>

      {/* Refresh button */}
      <s-button
        variant="tertiary"
        onClick={onRefresh}
        loading={isRendering || undefined}
        icon="refresh"
        size="slim"
      >
        Refresh
      </s-button>
    </s-stack>
  );
}
```

### Step 7: Create Main SectionPreview Component (`app/components/preview/SectionPreview.tsx`)

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { PreviewFrame } from './PreviewFrame';
import { PreviewToolbar } from './PreviewToolbar';
import { useLiquidRenderer } from './hooks/useLiquidRenderer';
import { usePreviewMessaging } from './hooks/usePreviewMessaging';
import type { DeviceSize, PreviewSettings, PreviewMessage } from './types';

export interface SectionPreviewProps {
  liquidCode: string;
  settings?: PreviewSettings;
  onSettingsChange?: (settings: PreviewSettings) => void;
}

export function SectionPreview({
  liquidCode,
  settings = {},
  onSettingsChange
}: SectionPreviewProps) {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  const { render, isRendering } = useLiquidRenderer();
  const { sendMessage, setIframe } = usePreviewMessaging(
    useCallback((msg: PreviewMessage) => {
      if (msg.type === 'RESIZE' && msg.height) {
        setIframeHeight(Math.max(300, msg.height + 32));
      }
    }, [])
  );

  // Debounced render
  const renderTimeoutRef = useRef<NodeJS.Timeout>();

  const triggerRender = useCallback(async () => {
    if (!liquidCode.trim()) {
      sendMessage({ type: 'RENDER', html: '<p>No code to preview</p>', css: '' });
      return;
    }

    try {
      setError(null);
      const { html, css } = await render(liquidCode, settings);
      sendMessage({ type: 'RENDER', html, css });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Render failed';
      setError(errorMsg);
      sendMessage({ type: 'RENDER_ERROR', error: errorMsg });
    }
  }, [liquidCode, settings, render, sendMessage]);

  // Debounce renders on code/settings change
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = setTimeout(triggerRender, 100);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [triggerRender]);

  const handleIframeLoad = useCallback((iframe: HTMLIFrameElement) => {
    setIframe(iframe);
    // Trigger initial render after iframe loads
    setTimeout(triggerRender, 50);
  }, [setIframe, triggerRender]);

  return (
    <s-stack gap="base" direction="block">
      <PreviewToolbar
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        onRefresh={triggerRender}
        isRendering={isRendering}
      />

      {error && (
        <s-banner tone="warning" dismissible onDismiss={() => setError(null)}>
          Preview error: {error}. The code may use unsupported Liquid features.
        </s-banner>
      )}

      <PreviewFrame
        deviceSize={deviceSize}
        onLoad={handleIframeLoad}
      />
    </s-stack>
  );
}
```

### Step 8: Create Barrel Export (`app/components/preview/index.ts`)

```typescript
export { SectionPreview } from './SectionPreview';
export { PreviewFrame } from './PreviewFrame';
export { PreviewToolbar } from './PreviewToolbar';
export { useLiquidRenderer } from './hooks/useLiquidRenderer';
export { usePreviewMessaging } from './hooks/usePreviewMessaging';
export * from './types';
```

### Step 9: Integrate into GeneratePreviewColumn

Modify `app/components/generate/GeneratePreviewColumn.tsx` to add tabbed view:

```typescript
// Add to imports
import { SectionPreview } from '../preview';

// Add state for active tab
const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

// Replace CodePreview section with tabbed interface
<s-card>
  <s-section>
    <s-tabs
      selected={activeTab}
      onSelect={(tab: string) => setActiveTab(tab as 'code' | 'preview')}
    >
      <s-tab id="code">Code</s-tab>
      <s-tab id="preview">Preview</s-tab>
    </s-tabs>

    {activeTab === 'code' ? (
      <CodePreview code={generatedCode} fileName={fileName} />
    ) : (
      <SectionPreview liquidCode={generatedCode} />
    )}
  </s-section>
</s-card>
```

## Todo List

- [ ] Install LiquidJS package
- [ ] Create `app/components/preview/types.ts`
- [ ] Create `app/components/preview/hooks/useLiquidRenderer.ts`
- [ ] Create `app/components/preview/hooks/usePreviewMessaging.ts`
- [ ] Create `app/components/preview/PreviewFrame.tsx`
- [ ] Create `app/components/preview/PreviewToolbar.tsx`
- [ ] Create `app/components/preview/SectionPreview.tsx`
- [ ] Create `app/components/preview/index.ts`
- [ ] Modify GeneratePreviewColumn with tabbed view
- [ ] Test basic rendering with sample Liquid code
- [ ] Test device size switching
- [ ] Test error handling for invalid Liquid
- [ ] Verify postMessage security (origin validation)

## Success Criteria

1. Preview iframe renders generated Liquid code
2. Device size selector changes preview width
3. Refresh button re-renders current code
4. Errors display gracefully in banner
5. postMessage communication validated by origin
6. Tab switching between Code and Preview works smoothly
7. No console errors in production build

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LiquidJS missing Shopify filters | High | Medium | Register stub filters for common cases |
| Iframe security restrictions | Medium | High | Use allow-scripts allow-same-origin sandbox |
| Slow render for complex templates | Medium | Medium | Debounce 100ms, show loading state |
| Memory leaks from event listeners | Low | Medium | Proper cleanup in useEffect |

## Security Considerations

1. **Sandbox iframe**: Only allow-scripts and allow-same-origin
2. **Origin validation**: Always check event.origin matches window.location.origin
3. **No eval()**: LiquidJS safe mode prevents arbitrary code execution
4. **Input sanitization**: LiquidJS handles output escaping
5. **CSP compatible**: No inline scripts in parent (only in iframe srcDoc)

## Next Steps

After completing this phase:
1. Proceed to [Phase 02: Schema Settings UI](./phase-02-schema-settings-ui.md)
2. Test integration with various generated section types
3. Document any LiquidJS filter gaps for Phase 03 mock data system
