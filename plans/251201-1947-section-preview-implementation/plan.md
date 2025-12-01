# Section Preview Implementation Plan

**Date**: 2025-12-01
**Status**: Implementation Complete
**Priority**: P1 - High
**Estimated Effort**: 3-4 days
**Completed**: 2025-12-01

## Overview

Implement visual preview of generated Liquid sections using client-side rendering with LiquidJS. Preview renders within a sandboxed iframe, communicating via postMessage. Includes schema-based settings editor for real-time customization.

## Architecture Decision

**Approach**: Client-Side Rendering (CSR) with LiquidJS
- LiquidJS parses Shopify-compatible Liquid templates in browser
- Same-origin iframe avoids CORS complexity
- PostMessage enables parent-child communication
- Mock data system provides realistic preview contexts

**Why Not SSR/Shopify API**: No Shopify preview API exists for unsaved sections. SSR adds server load and latency. CSR provides <150ms update latency.

## Phase Summary

| Phase | Title | Priority | Status |
|-------|-------|----------|--------|
| 01 | [Preview Infrastructure](./phase-01-preview-infrastructure.md) | P0 | Complete |
| 02 | [Schema Settings UI](./phase-02-schema-settings-ui.md) | P1 | Complete |
| 03 | [Mock Data System](./phase-03-mock-data-system.md) | P1 | Complete |
| 04 | [Polish & Integration](./phase-04-polish-integration.md) | P2 | Complete |

## Key Components

```
app/components/preview/
├── SectionPreview.tsx       # Main orchestrator
├── PreviewFrame.tsx         # Sandboxed iframe wrapper
├── PreviewToolbar.tsx       # Device/refresh controls
├── SettingsPanel.tsx        # Schema settings editor
├── hooks/
│   ├── useLiquidRenderer.ts # LiquidJS integration
│   └── usePreviewMessaging.ts # PostMessage handler
└── types.ts                 # Shared types
```

## Data Flow

```
GeneratedCode → Parse Schema → Extract Settings → Build Form
                    ↓
              LiquidJS Render
                    ↓
              PostMessage → Iframe
                    ↓
              Visual Preview
                    ↑
              Settings Change → Re-render (debounced 100ms)
```

## Success Criteria

1. Preview renders within 500ms of code generation
2. Settings changes reflect in <150ms
3. Works in Shopify embedded app context
4. No security vulnerabilities (XSS, injection)
5. Graceful degradation on render errors

## Dependencies

- LiquidJS v10+ (npm package)
- Existing: CodePreview, GeneratePreviewColumn components
- Polaris Web Components for settings UI

## Risk Summary

- **LiquidJS Compatibility**: Some Shopify filters unsupported; mitigate with custom filter stubs
- **Performance**: Large templates may lag; mitigate with debouncing and template caching
- **Security**: Template injection risk; mitigate with LiquidJS safe mode, no eval()

## References

- [Research: Shopify Preview APIs](./research/researcher-01-shopify-preview-apis.md)
- [Research: Iframe Preview Patterns](./research/researcher-02-iframe-preview-patterns.md)
- [Code Standards](../../docs/code-standards.md)
- [System Architecture](../../docs/system-architecture.md)
