# Phase 04: Polish & Integration

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Dependencies**: [Phase 01](./phase-01-preview-infrastructure.md), [Phase 02](./phase-02-schema-settings-ui.md), [Phase 03](./phase-03-mock-data-system.md)
- **Related Docs**: [code-standards.md](../../docs/code-standards.md), [design-guidelines.md](../../docs/design-guidelines.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-01 |
| Description | UX polish, error handling, responsive design, final integration, accessibility |
| Priority | P2 - Medium |
| Implementation Status | Not Started |
| Review Status | Not Started |

## Key Insights from Research

1. **Loading states** critical for perceived performance
2. **Error boundaries** prevent preview failures from crashing app
3. **Responsive preview** needs device frame styling
4. **Accessibility** required for Shopify app approval
5. **Graceful degradation** when LiquidJS fails on complex templates

## Requirements

1. Add comprehensive loading states and skeleton UI
2. Implement error boundaries for preview failures
3. Polish device frame styling (device bezels, status bars)
4. Ensure accessibility (ARIA labels, keyboard navigation)
5. Add helpful empty states and error messages
6. Integrate preview tab into existing generate page workflow
7. Add preview-specific keyboard shortcuts
8. Performance optimization (lazy loading, memoization)
9. Add "Copy to clipboard" for rendered HTML

## Architecture

### Final Component Tree

```
app/routes/app.generate.tsx
└── GeneratePageContent
    ├── PromptInput
    ├── ThemeSelector
    ├── GenerateActions
    └── PreviewSection (new wrapper)
        ├── TabBar (Code | Preview)
        │   ├── CodePreview (existing)
        │   └── SectionPreview
        │       ├── SettingsPanel
        │       ├── PreviewToolbar
        │       │   ├── DeviceSelector
        │       │   ├── DataPresetSelector
        │       │   └── RefreshButton
        │       └── PreviewFrame (iframe)
        └── SaveSection
            ├── SectionNameInput
            └── SaveButton
```

### Error Boundary Pattern

```
<ErrorBoundary fallback={<PreviewErrorState />}>
  <SectionPreview liquidCode={code} />
</ErrorBoundary>
```

## Related Code Files

| File | Purpose | Status |
|------|---------|--------|
| `app/routes/app.generate.tsx` | Main page integration | Modify |
| `app/components/preview/SectionPreview.tsx` | Add error boundary | Modify |
| `app/components/preview/PreviewFrame.tsx` | Add device styling | Modify |
| `app/components/preview/PreviewToolbar.tsx` | Add copy button | Modify |
| `app/components/preview/PreviewErrorBoundary.tsx` | Error boundary | Create |
| `app/components/preview/PreviewSkeleton.tsx` | Loading skeleton | Create |
| `app/components/preview/EmptyPreviewState.tsx` | Empty state | Create |

## Implementation Steps

### Step 1: Create Preview Error Boundary (`app/components/preview/PreviewErrorBoundary.tsx`)

```typescript
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Preview error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <s-box padding="xlarge" background="subdued" borderRadius="large">
          <s-stack gap="large" direction="block" alignItems="center">
            <s-icon name="alert-circle" tone="critical" />
            <s-text variant="headingSm" as="h3">Preview Failed</s-text>
            <s-text variant="bodySm" tone="subdued" alignment="center">
              Something went wrong rendering the preview.
              {this.state.error?.message && (
                <><br />Error: {this.state.error.message}</>
              )}
            </s-text>
            <s-button variant="primary" onClick={this.handleRetry}>
              Try Again
            </s-button>
          </s-stack>
        </s-box>
      );
    }

    return this.props.children;
  }
}
```

### Step 2: Create Preview Skeleton (`app/components/preview/PreviewSkeleton.tsx`)

```typescript
export function PreviewSkeleton() {
  return (
    <s-stack gap="base" direction="block">
      {/* Toolbar skeleton */}
      <s-stack gap="base" direction="inline" justifyContent="space-between">
        <s-skeleton-body-text lines={1} />
        <s-skeleton-body-text lines={1} />
      </s-stack>

      {/* Preview frame skeleton */}
      <s-box
        padding="none"
        background="subdued"
        borderRadius="large"
        style={{ minHeight: '400px' }}
      >
        <s-stack gap="large" direction="block" alignItems="center" padding="xlarge">
          <s-spinner size="large" />
          <s-text variant="bodySm" tone="subdued">
            Rendering preview...
          </s-text>
        </s-stack>
      </s-box>
    </s-stack>
  );
}
```

### Step 3: Create Empty Preview State (`app/components/preview/EmptyPreviewState.tsx`)

```typescript
export interface EmptyPreviewStateProps {
  message?: string;
}

export function EmptyPreviewState({
  message = 'Generate a section to see the preview'
}: EmptyPreviewStateProps) {
  return (
    <s-box
      padding="xlarge"
      background="subdued"
      borderRadius="large"
      style={{ minHeight: '300px' }}
    >
      <s-stack gap="base" direction="block" alignItems="center" justifyContent="center">
        <s-icon name="view" tone="subdued" style={{ fontSize: '48px' }} />
        <s-text variant="bodyMd" tone="subdued" alignment="center">
          {message}
        </s-text>
      </s-stack>
    </s-box>
  );
}
```

### Step 4: Add Device Frame Styling (`app/components/preview/DeviceFrame.tsx`)

```typescript
import type { DeviceSize } from './types';

export interface DeviceFrameProps {
  deviceSize: DeviceSize;
  children: React.ReactNode;
}

const deviceStyles: Record<DeviceSize, React.CSSProperties> = {
  mobile: {
    width: '375px',
    maxWidth: '100%',
    borderRadius: '36px',
    padding: '12px',
    background: '#1a1a1a',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  tablet: {
    width: '768px',
    maxWidth: '100%',
    borderRadius: '24px',
    padding: '16px',
    background: '#2a2a2a',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
  },
  desktop: {
    width: '100%',
    borderRadius: '8px',
    padding: '0',
    background: 'transparent',
    boxShadow: 'none'
  }
};

export function DeviceFrame({ deviceSize, children }: DeviceFrameProps) {
  const style = deviceStyles[deviceSize];
  const showNotch = deviceSize === 'mobile';

  return (
    <div style={{
      ...style,
      position: 'relative',
      margin: '0 auto'
    }}>
      {showNotch && (
        <div style={{
          width: '120px',
          height: '24px',
          background: '#1a1a1a',
          borderRadius: '0 0 16px 16px',
          margin: '0 auto 8px',
          position: 'relative'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: '#333',
            borderRadius: '50%',
            position: 'absolute',
            right: '20px',
            top: '8px'
          }} />
        </div>
      )}
      <div style={{
        borderRadius: deviceSize === 'mobile' ? '24px' : deviceSize === 'tablet' ? '12px' : '8px',
        overflow: 'hidden',
        background: '#fff'
      }}>
        {children}
      </div>
    </div>
  );
}
```

### Step 5: Add Copy HTML Button to Toolbar

```typescript
// In PreviewToolbar.tsx - add copy functionality

export interface PreviewToolbarProps {
  // ... existing props
  renderedHtml?: string;
}

const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  if (!renderedHtml) return;
  try {
    await navigator.clipboard.writeText(renderedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error('Copy failed:', err);
  }
};

// In toolbar buttons:
<s-button
  variant="tertiary"
  size="slim"
  icon={copied ? 'check' : 'clipboard'}
  onClick={handleCopy}
  disabled={!renderedHtml}
>
  {copied ? 'Copied!' : 'Copy HTML'}
</s-button>
```

### Step 6: Add Keyboard Shortcuts

```typescript
// In SectionPreview.tsx - add keyboard handler

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + R: Refresh preview
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
      e.preventDefault();
      triggerRender();
    }
    // Ctrl/Cmd + 1/2/3: Switch device size
    if ((e.ctrlKey || e.metaKey) && ['1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      const sizes: DeviceSize[] = ['mobile', 'tablet', 'desktop'];
      setDeviceSize(sizes[parseInt(e.key) - 1]);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [triggerRender]);
```

### Step 7: Add ARIA Labels and Accessibility

```typescript
// Update PreviewFrame.tsx
<iframe
  ref={iframeRef}
  srcDoc={IFRAME_HTML}
  sandbox="allow-scripts allow-same-origin"
  title="Section Preview"
  aria-label="Live preview of generated section"
  role="document"
  // ... existing props
/>

// Update PreviewToolbar.tsx
<s-button
  variant={deviceSize === 'mobile' ? 'primary' : 'secondary'}
  onClick={() => onDeviceSizeChange('mobile')}
  aria-pressed={deviceSize === 'mobile'}
  aria-label="Preview on mobile device"
>
  Mobile
</s-button>

// Update SettingsPanel.tsx
<s-section aria-labelledby="settings-heading">
  <s-text id="settings-heading" variant="headingSm" as="h3">
    Section Settings
  </s-text>
  {/* ... */}
</s-section>
```

### Step 8: Integrate into Generate Page

```typescript
// In app/routes/app.generate.tsx - final integration

import { SectionPreview, PreviewErrorBoundary, EmptyPreviewState } from '../components/preview';

// Add tab state
const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

// In render:
<s-card>
  <s-section>
    <s-tabs
      selected={activeTab}
      onSelect={(tab: string) => setActiveTab(tab as 'code' | 'preview')}
    >
      <s-tab id="code">
        <s-stack gap="tight" direction="inline" alignItems="center">
          <s-icon name="code" />
          Code
        </s-stack>
      </s-tab>
      <s-tab id="preview">
        <s-stack gap="tight" direction="inline" alignItems="center">
          <s-icon name="view" />
          Preview
        </s-stack>
      </s-tab>
    </s-tabs>

    {activeTab === 'code' ? (
      <CodePreview code={generatedCode} />
    ) : generatedCode ? (
      <PreviewErrorBoundary onRetry={() => {}}>
        <SectionPreview liquidCode={generatedCode} />
      </PreviewErrorBoundary>
    ) : (
      <EmptyPreviewState />
    )}
  </s-section>
</s-card>
```

### Step 9: Performance Optimization

```typescript
// Memoize expensive components
import { memo, useMemo } from 'react';

export const SectionPreview = memo(function SectionPreview({
  liquidCode,
  settings
}: SectionPreviewProps) {
  // Memoize parsed schema
  const parsedSchema = useMemo(() => parseSchema(liquidCode), [liquidCode]);

  // Memoize settings extraction
  const schemaSettings = useMemo(() => extractSettings(parsedSchema), [parsedSchema]);

  // ... rest of component
});

// Lazy load preview components
const SectionPreview = lazy(() => import('../components/preview/SectionPreview'));

// In generate page:
<Suspense fallback={<PreviewSkeleton />}>
  <SectionPreview liquidCode={generatedCode} />
</Suspense>
```

### Step 10: Update Barrel Export

```typescript
// app/components/preview/index.ts - final exports

export { SectionPreview } from './SectionPreview';
export { PreviewFrame } from './PreviewFrame';
export { PreviewToolbar } from './PreviewToolbar';
export { DeviceFrame } from './DeviceFrame';
export { PreviewErrorBoundary } from './PreviewErrorBoundary';
export { PreviewSkeleton } from './PreviewSkeleton';
export { EmptyPreviewState } from './EmptyPreviewState';
export { CustomDataModal } from './CustomDataModal';
export { useLiquidRenderer } from './hooks/useLiquidRenderer';
export { usePreviewMessaging } from './hooks/usePreviewMessaging';
export * from './types';
export * from './schema';
export * from './settings';
export * from './mockData';
```

## Todo List

- [ ] Create `PreviewErrorBoundary.tsx`
- [ ] Create `PreviewSkeleton.tsx`
- [ ] Create `EmptyPreviewState.tsx`
- [ ] Create `DeviceFrame.tsx` with device bezels
- [ ] Add copy HTML button to PreviewToolbar
- [ ] Add keyboard shortcuts for preview controls
- [ ] Add ARIA labels to all interactive elements
- [ ] Integrate preview tab into app.generate.tsx
- [ ] Add lazy loading for preview components
- [ ] Memoize expensive computations
- [ ] Update barrel export with all new components
- [ ] Test accessibility with screen reader
- [ ] Test keyboard navigation
- [ ] Test responsive behavior
- [ ] Performance profiling and optimization

## Success Criteria

1. Preview gracefully handles render errors without crashing app
2. Loading states visible during render
3. Device frames look polished with realistic styling
4. All interactive elements have ARIA labels
5. Keyboard shortcuts work (Ctrl+R refresh, Ctrl+1/2/3 device)
6. Copy HTML button works correctly
7. Tab switching between Code/Preview is smooth
8. No performance regressions (initial load < 500ms)
9. Works with screen readers

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Error boundary catches too much | Low | Medium | Only wrap preview component, not entire page |
| Lazy loading adds latency | Medium | Low | Show skeleton immediately, preload on hover |
| Accessibility issues missed | Medium | Medium | Test with actual screen reader |
| Device frame CSS conflicts | Low | Low | Use scoped styles, high specificity |

## Security Considerations

1. **Clipboard API**: Requires HTTPS, check browser support
2. **Keyboard shortcuts**: Don't override browser defaults
3. **Error messages**: Don't expose sensitive data in error states
4. **Lazy loading**: Same-origin imports only

## Next Steps

After completing this phase:
1. Write user documentation for preview feature
2. Add feature flag for gradual rollout
3. Collect user feedback
4. Consider adding "Save as Template" functionality
5. Analytics for preview usage patterns
