---
title: Native Shopify Liquid Rendering Engine
description: Replace client-side LiquidJS with Shopify App Proxy for native Liquid rendering
status: planned
priority: high
effort: large
tags: [preview, liquid, app-proxy, performance]
created: 2025-12-24
---

# Native Shopify Liquid Rendering Engine

## Overview

Replace current client-side LiquidJS rendering (~60% accuracy) with Shopify App Proxy for native Liquid rendering (99%+ accuracy). Enables real shop context (`{{product}}`, `{{collection}}`, `{{shop}}`), full filter/tag support, and eliminates need for 60+ custom filter stubs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐    │
│  │ Code Editor │───▶│ useNativePreview │──▶│ NativePreviewFrame │   │
│  └─────────────┘    │ (debounce 600ms) │    │ (iframe srcdoc)    │   │
│                     └─────────┬────────┘    └─────────────────────┘  │
└───────────────────────────────│──────────────────────────────────────┘
                                │ fetch
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       APP PROXY ROUTE                                 │
│  https://shop.myshopify.com/apps/blocksmith-preview?section_id=xxx   │
│                                │                                      │
│                                ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │ authenticate.public.appProxy(request)  ← HMAC Validation   │      │
│  └────────────────────────────────────────────────────────────┘      │
│                                │                                      │
│                                ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │ return liquid(wrappedCode, { layout: false })              │      │
│  │   → Content-Type: application/liquid                       │      │
│  └────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ Shopify renders Liquid natively
┌──────────────────────────────────────────────────────────────────────┐
│                    RENDERED HTML RESPONSE                             │
│  - Real {{shop.name}}, {{product.title}}, {{collection.handle}}      │
│  - All Shopify filters work natively                                  │
│  - Theme context available                                            │
└──────────────────────────────────────────────────────────────────────┘
```

## Phases

| Phase | Title | Status | Effort | File |
|-------|-------|--------|--------|------|
| 01 | App Proxy Setup | pending | small | [phase-01-app-proxy-setup.md](./phase-01-app-proxy-setup.md) |
| 02 | Backend Liquid Wrapper | pending | medium | [phase-02-backend-liquid-wrapper.md](./phase-02-backend-liquid-wrapper.md) |
| 03 | Frontend Integration | pending | medium | [phase-03-frontend-integration.md](./phase-03-frontend-integration.md) |
| 04 | Settings & Context | pending | medium | [phase-04-settings-context.md](./phase-04-settings-context.md) |
| 05 | Testing & Fallback | pending | medium | [phase-05-testing-fallback.md](./phase-05-testing-fallback.md) |

## Dependencies

- **External**: Shopify App Proxy (no extra API cost)
- **Scope**: `write_app_proxy` access scope (add to shopify.app.toml)
- **Existing**: `authenticate.public.appProxy` from `@shopify/shopify-app-react-router`
- **Database**: Existing Prisma schema supports section storage

## Success Criteria

1. Native rendering accuracy ≥99% vs current ~60%
2. Preview latency <500ms after 600ms debounce
3. Real shop data (products, collections, shop) renders correctly
4. Graceful fallback to LiquidJS on proxy failure
5. Zero regression in existing preview functionality
6. Settings/blocks pass correctly to native renderer
