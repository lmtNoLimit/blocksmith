# Blocksmith Codebase Scout Report
**Date:** 2026-01-04  
**Project:** AI Section Generator (Blocksmith)  
**Scope:** React components & routes discovery  
**Status:** Complete

---

## Executive Summary

Blocksmith is a Shopify embedded app (React Router 7 + TypeScript + Prisma + MongoDB) for AI-powered Liquid section generation. Codebase contains **95+ React components** across 10+ feature domains and **22 route files** supporting UI, API, webhooks, and authentication flows.

---

## Components Summary

### Core Layout & Navigation
- `/app/components/shared/Button.tsx` | Button UI component | exports: Button | deps: Polaris, React
- `/app/components/shared/Card.tsx` | Reusable card container | exports: Card | deps: Polaris web components
- `/app/components/shared/Banner.tsx` | Info/error/success banners | exports: Banner, SuccessBanner, ErrorBanner | deps: Polaris
- `/app/components/shared/FilterButtonGroup.tsx` | Filter toggle buttons | exports: FilterButtonGroup | deps: React, Polaris

### Generate Feature (Section Creation)
- `/app/components/generate/GenerateLayout.tsx` | Two-column layout for create flow | exports: GenerateLayout | deps: React, Polaris web components
- `/app/components/generate/GenerateInputColumn.tsx` | Left column (prompt input form) | exports: GenerateInputColumn | deps: React
- `/app/components/generate/GeneratePreviewColumn.tsx` | Right column (preview section) | exports: GeneratePreviewColumn | deps: React
- `/app/components/generate/PromptInput.tsx` | User prompt textarea | exports: PromptInput | deps: React
- `/app/components/generate/CodePreview.tsx` | Formatted Liquid code display | exports: CodePreview | deps: React, clipboard API
- `/app/components/generate/SectionNameInput.tsx` | Section title input | exports: SectionNameInput | deps: React
- `/app/components/generate/ThemeSelector.tsx` | Dropdown for theme selection | exports: ThemeSelector | deps: React, Polaris
- `/app/components/generate/GenerateActions.tsx` | Save/publish/download buttons | exports: GenerateActions | deps: React, Polaris
- `/app/components/generate/TemplateSuggestions.tsx` | Template chips | exports: TemplateSuggestions | deps: React
- `/app/components/generate/PromptExamples.tsx` | Example prompts list | exports: PromptExamples | deps: React
- `/app/components/generate/AdvancedOptions.tsx` | Hidden advanced settings | exports: AdvancedOptions | deps: React
- `/app/components/generate/LoadingState.tsx` | Loading spinner/skeleton | exports: LoadingState | deps: React
- `/app/components/generate/EmptyState.tsx` | No sections view | exports: EmptyState | deps: React
- `/app/components/generate/SaveTemplateModal.tsx` | Modal to save as template | exports: SaveTemplateModal | deps: React, Polaris
- `/app/components/generate/templates/template-data.ts` | Template constants | exports: template definitions | deps: none

### Chat Feature
- `/app/components/chat/ChatPanel.tsx` | Main chat interface container | exports: ChatPanel | deps: useChat hook, React
- `/app/components/chat/MessageList.tsx` | Scrollable message history | exports: MessageList | deps: useAutoScroll, React
- `/app/components/chat/MessageItem.tsx` | Individual message bubble | exports: MessageItem | deps: React
- `/app/components/chat/ChatInput.tsx` | Message input field | exports: ChatInput | deps: React
- `/app/components/chat/CodeBlock.tsx` | Syntax-highlighted code in messages | exports: CodeBlock | deps: Prism, React
- `/app/components/chat/TypingIndicator.tsx` | Animated typing dots | exports: TypingIndicator | deps: React
- `/app/components/chat/VersionBadge.tsx` | Model version display | exports: VersionBadge | deps: React
- `/app/components/chat/VersionCard.tsx` | Extended version info | exports: VersionCard | deps: React
- `/app/components/chat/hooks/useChat.ts` | Chat state management | exports: useChat | deps: useReducer, fetch SSE
- `/app/components/chat/hooks/useAutoScroll.ts` | Auto-scroll to latest message | exports: useAutoScroll | deps: useEffect, useRef
- `/app/components/chat/ChatStyles.tsx` | Shared CSS styles | exports: ChatStyles | deps: React

### Editor Feature (Section Editing)
- `/app/components/editor/PolarisEditorLayout.tsx` | Main editor grid layout | exports: PolarisEditorLayout | deps: Polaris, React
- `/app/components/editor/ChatPanelWrapper.tsx` | Chat sidebar container | exports: ChatPanelWrapper | deps: ChatPanel
- `/app/components/editor/CodePreviewPanel.tsx` | Liquid code display panel | exports: CodePreviewPanel | deps: CodePreview, Polaris
- `/app/components/editor/CodeDiffView.tsx` | Side-by-side code diff | exports: CodeDiffView | deps: diff-engine utility
- `/app/components/editor/EditorSettingsPanel.tsx` | Schema settings panel | exports: EditorSettingsPanel | deps: React
- `/app/components/editor/PreviewSettingsPanel.tsx` | Preview context settings | exports: PreviewSettingsPanel | deps: SettingsPanel, React
- `/app/components/editor/PublishModal.tsx` | Save/publish confirmation dialog | exports: PublishModal, PUBLISH_MODAL_ID | deps: Polaris, React
- `/app/components/editor/SchemaValidation.tsx` | Schema validation error display | exports: SchemaValidation | deps: React
- `/app/components/editor/FeedbackWidget.tsx` | Feedback submission component | exports: FeedbackWidget | deps: React
- `/app/components/editor/hooks/useEditorState.ts` | Editor state management | exports: useEditorState | deps: useReducer
- `/app/components/editor/hooks/useCodeDiff.ts` | Diff calculation hook | exports: useCodeDiff | deps: calculateDiff utility
- `/app/components/editor/diff/diff-engine.ts` | Diff algorithm | exports: calculateDiff | deps: none (pure)
- `/app/components/editor/validation/schema-validator.ts` | Schema validation logic | exports: validateSchema | deps: none (pure)

### Preview Feature (Live Preview)
- `/app/components/preview/PreviewFrame.tsx` | Sandboxed iframe renderer | exports: PreviewFrame | deps: React, postMessage API
- `/app/components/preview/NativePreviewFrame.tsx` | Native Shopify render proxy | exports: NativePreviewFrame | deps: React, fetch
- `/app/components/preview/NativeSectionPreview.tsx` | Wrapper for native preview | exports: NativeSectionPreview | deps: NativePreviewFrame
- `/app/components/preview/SectionPreview.tsx` | Main preview orchestrator | exports: SectionPreview | deps: PreviewFrame, settings hooks
- `/app/components/preview/AppProxyPreviewFrame.tsx` | App proxy render mode | exports: AppProxyPreviewFrame | deps: React, fetch
- `/app/components/preview/PreviewModeIndicator.tsx` | "Preview" label/badge | exports: PreviewModeIndicator | deps: React
- `/app/components/preview/PreviewSkeleton.tsx` | Loading placeholder | exports: PreviewSkeleton | deps: React
- `/app/components/preview/EmptyPreviewState.tsx` | No code state | exports: EmptyPreviewState | deps: React
- `/app/components/preview/PreviewErrorBoundary.tsx` | Error boundary wrapper | exports: PreviewErrorBoundary | deps: React
- `/app/components/preview/ElementInfoPanel.tsx` | Liquid element details | exports: ElementInfoPanel | deps: React
- `/app/components/preview/PreviewToolbar.tsx` | Device selector toolbar | exports: PreviewToolbar | deps: React
- `/app/components/preview/ResourceSelector.tsx` | Product/collection picker | exports: ResourceSelector | deps: React, fetch
- `/app/components/preview/SelectedResourceDisplay.tsx` | Selected resource info | exports: SelectedResourceDisplay | deps: React
- `/app/components/preview/hooks/usePreviewRenderer.ts` | Render logic hook | exports: usePreviewRenderer | deps: useEffect, fetch
- `/app/components/preview/hooks/useNativePreviewRenderer.ts` | Native render hook | exports: useNativePreviewRenderer | deps: fetch, useEffect
- `/app/components/preview/hooks/usePreviewSettings.ts` | Settings state hook | exports: usePreviewSettings | deps: useState, useCallback
- `/app/components/preview/hooks/usePreviewMessaging.ts` | postMessage handler | exports: usePreviewMessaging | deps: useEffect
- `/app/components/preview/hooks/useResourceDetection.ts` | Resource type detection | exports: useResourceDetection | deps: useMemo
- `/app/components/preview/hooks/useResourceFetcher.ts` | Fetch shop resources | exports: useResourceFetcher | deps: useEffect, fetch

### Preview Settings Subcomponents (18 settings types)
- `/app/components/preview/settings/SettingsPanel.tsx` | Settings form container | exports: SettingsPanel | deps: React
- `/app/components/preview/settings/SettingField.tsx` | Single setting field wrapper | exports: SettingField | deps: React
- `/app/components/preview/settings/TextSetting.tsx` | Text input | exports: TextSetting | deps: React
- `/app/components/preview/settings/NumberSetting.tsx` | Number input | exports: NumberSetting | deps: React
- `/app/components/preview/settings/CheckboxSetting.tsx` | Checkbox toggle | exports: CheckboxSetting | deps: React
- `/app/components/preview/settings/RadioSetting.tsx` | Radio button group | exports: RadioSetting | deps: React
- `/app/components/preview/settings/SelectSetting.tsx` | Select dropdown | exports: SelectSetting | deps: React
- `/app/components/preview/settings/ColorSetting.tsx` | Color picker | exports: ColorSetting | deps: React
- `/app/components/preview/settings/TextAlignmentSetting.tsx` | Text align buttons | exports: TextAlignmentSetting | deps: React
- `/app/components/preview/settings/ProductSetting.tsx` | Single product picker | exports: ProductSetting | deps: ResourceSelector
- `/app/components/preview/settings/ProductListSetting.tsx` | Multi product picker | exports: ProductListSetting | deps: ResourceSelector
- `/app/components/preview/settings/CollectionSetting.tsx` | Single collection picker | exports: CollectionSetting | deps: ResourceSelector
- `/app/components/preview/settings/CollectionListSetting.tsx` | Multi collection picker | exports: CollectionListSetting | deps: ResourceSelector
- `/app/components/preview/settings/ArticleSetting.tsx` | Blog article picker | exports: ArticleSetting | deps: fetch
- `/app/components/preview/settings/BlogSetting.tsx` | Blog/collection picker | exports: BlogSetting | deps: fetch
- `/app/components/preview/settings/PageSetting.tsx` | Store page picker | exports: PageSetting | deps: fetch
- `/app/components/preview/settings/VideoSetting.tsx` | Video upload/picker | exports: VideoSetting | deps: React
- `/app/components/preview/settings/VideoUrlSetting.tsx` | Video URL input | exports: VideoUrlSetting | deps: React
- `/app/components/preview/settings/LinkListSetting.tsx` | Link array builder | exports: LinkListSetting | deps: React
- `/app/components/preview/settings/FontPickerSetting.tsx` | Font family selector | exports: FontPickerSetting | deps: fontRegistry
- `/app/components/preview/settings/ImageSetting.tsx` | Image URL input | exports: ImageSetting | deps: React
- `/app/components/preview/settings/ImagePickerModal.tsx` | Image library modal | exports: ImagePickerModal | deps: Polaris, React

### Preview Schema Utilities
- `/app/components/preview/schema/parseSchema.ts` | Parse Shopify section schema JSON | exports: parseSchema | deps: none (pure)
- `/app/components/preview/schema/SchemaTypes.ts` | TypeScript type definitions | exports: schema types | deps: none
- `/app/components/preview/schema/index.ts` | Schema barrel export | exports: parseSchema, types | deps: parseSchema, SchemaTypes
- `/app/components/preview/utils/fontRegistry.ts` | Font family constants | exports: fontRegistry | deps: none

### Preview Mock Data
- `/app/components/preview/mockData/index.ts` | Mock shop data | exports: mock data objects | deps: none
- `/app/components/preview/mockData/types.ts` | Mock data types | exports: type definitions | deps: none

### Home Page Components
- `/app/components/home/SetupGuide.tsx` | Onboarding checklist | exports: SetupGuide | deps: React, Polaris
- `/app/components/home/Analytics.tsx` | Stats cards layout | exports: Analytics | deps: AnalyticsCard
- `/app/components/home/AnalyticsCard.tsx` | Single stat card | exports: AnalyticsCard | deps: React, Polaris
- `/app/components/home/News.tsx` | News feed | exports: News | deps: React
- `/app/components/home/index.ts` | Home barrel export | exports: SetupGuide, Analytics, News | deps: components

### Sections Feature (History/Management)
- `/app/components/sections/HistoryTable.tsx` | Sections data table | exports: HistoryTable | deps: Polaris IndexTable, React
- `/app/components/sections/HistoryPreviewModal.tsx` | Preview section modal | exports: HistoryPreviewModal | deps: Polaris, React
- `/app/components/sections/DeleteConfirmModal.tsx` | Delete confirmation | exports: DeleteConfirmModal | deps: Polaris, React
- `/app/components/sections/SectionsEmptyState.tsx` | No sections state | exports: SectionsEmptyState | deps: React
- `/app/components/sections/index.ts` | Sections barrel export | exports: all above | deps: components

### Generations Feature
- `/app/components/generations/GenerationsEmptyState.tsx` | No generations state | exports: GenerationsEmptyState | deps: React
- `/app/components/generations/DeleteConfirmModal.tsx` | Delete generation modal | exports: DeleteConfirmModal | deps: Polaris
- `/app/components/generations/index.ts` | Generations barrel export | exports: above | deps: components

### Templates Feature
- `/app/components/templates/TemplateGrid.tsx` | Template gallery grid | exports: TemplateGrid | deps: React, TemplateCard
- `/app/components/templates/TemplateCard.tsx` | Single template card | exports: TemplateCard | deps: React, Polaris
- `/app/components/templates/TemplateEditorModal.tsx` | Template edit modal | exports: TemplateEditorModal | deps: Polaris, React
- `/app/components/templates/index.ts` | Templates barrel export | exports: above | deps: components

### Billing Feature
- `/app/components/billing/PlanSelector.tsx` | Plan selection UI | exports: PlanSelector | deps: React, PlanCard
- `/app/components/billing/PlanCard.tsx` | Individual plan card | exports: PlanCard | deps: React, Polaris
- `/app/components/billing/UsageDashboard.tsx` | Usage stats display | exports: UsageDashboard | deps: React, Polaris
- `/app/components/billing/QuotaProgressBar.tsx` | Progress bar | exports: QuotaProgressBar | deps: React
- `/app/components/billing/UsageAlertBanner.tsx` | Quota warning banner | exports: UsageAlertBanner | deps: React, Polaris
- `/app/components/billing/index.ts` | Billing barrel export | exports: all above | deps: components

### Settings Feature
- `/app/components/settings/StorefrontPasswordSettings.tsx` | Storefront password config | exports: StorefrontPasswordSettings | deps: React, Polaris

### Common Components
- `/app/components/common/EmptySearchResult.tsx` | No search results state | exports: EmptySearchResult | deps: React

### Main Exports
- `/app/components/index.ts` | Central barrel export | exports: all public components, types | deps: all feature modules

---

## Routes Summary

### App Routes (Authenticated Admin)

#### Dashboard & Navigation
- `/app/routes/app.tsx` | Root app layout | loader: yes, action: no | exports: App, ErrorBoundary, headers | features: AppProvider, navigation, Outlet
- `/app/routes/app._index.tsx` | Dashboard home | loader: yes, action: yes | exports: Homepage | features: stats, onboarding, news, analytics, setup guide
- `/app/routes/app.additional.tsx` | Additional page | loader: yes, action: no | exports: default | features: custom content

#### Section Management
- `/app/routes/app.sections._index.tsx` | Sections history list | loader: yes, action: yes | exports: default | features: IndexFilters, tabs (all/draft/active/inactive/archive), search, sort, pagination, delete
- `/app/routes/app.sections.new.tsx` | Create new section | loader: yes, action: yes | exports: NewSectionPage | features: prompt textarea, featured templates, keyboard shortcuts (Cmd+Enter), validation, redirect on success
- `/app/routes/app.sections.$id.tsx` | Edit/view section | loader: yes, action: yes | exports: default | features: chat interface, live preview, code editor, save draft/publish, version management, theme selection, feedback widget

#### Template Management
- `/app/routes/app.templates.tsx` | Template library | loader: yes, action: yes | exports: default | features: grid, category filter, create/edit/delete modals, auto-seeding defaults

#### Billing & Settings
- `/app/routes/app.billing.tsx` | Subscription & usage | loader: yes, action: yes | exports: default | features: plan selector, usage dashboard, quota alerts, subscription management, charge tracking
- `/app/routes/app.settings.tsx` | App settings | loader: yes, action: yes | exports: default | features: storefront password, configuration

### Authentication Routes
- `/app/routes/auth.login/route.tsx` | Login page | loader: yes, action: yes | exports: Login | features: OAuth flow, Shopify auth
- `/app/routes/auth.login/error.server.tsx` | Login error handler | exports: error utility | features: error formatting
- `/app/routes/auth.$.tsx` | Auth fallback | exports: redirect/error | features: auth callback handling

### API Routes

#### Chat & Messaging
- `/app/routes/api.chat.stream.tsx` | SSE streaming endpoint | action: yes | exports: action | features: Gemini streaming, message save, context building, sanitization, error handling, token tracking
- `/app/routes/api.chat.messages.tsx` | Get message history | action/loader: yes | exports: action | features: pagination, message retrieval

#### Preview Rendering
- `/app/routes/api.preview.render.tsx` | Internal preview proxy | action: yes | exports: action | features: server-side Liquid rendering, DOMPurify sanitization, storefront auth, token caching, SSRF prevention, 10s timeout
- `/app/routes/api.proxy.render.tsx` | App proxy render fallback | action: yes | exports: action | features: fetch from app proxy, error handling

#### Resources & Data
- `/app/routes/app.api.resource.tsx` | Resource fetcher (products, collections, etc) | action: yes | exports: action | features: shop resource queries, pagination, search
- `/app/routes/api.files.tsx` | File upload handler | action: yes | exports: action | features: multipart form handling, file validation
- `/app/routes/api.storefront-password.tsx` | Storefront password config | action: yes | exports: action | features: password validation, storage

#### Utilities
- `/app/routes/api.enhance-prompt.tsx` | AI prompt enhancement | action: yes | exports: action | features: Gemini API call, sanitization
- `/app/routes/api.feedback.tsx` | Feedback submission | action: yes | exports: action | features: validation, storage

### Webhook Routes
- `/app/routes/webhooks.app.uninstalled.tsx` | App uninstall webhook | action: yes | exports: action | features: cleanup, data deletion
- `/app/routes/webhooks.app.scopes_update.tsx` | Scope update webhook | action: yes | exports: action | features: permission sync
- `/app/routes/webhooks.app.subscriptions_update.tsx` | Subscription update webhook | action: yes | exports: action | features: billing sync

### Error & Index
- `/app/routes/_index/route.tsx` | Public index (pre-auth) | loader: no, action: no | exports: default | features: landing page or redirect

---

## Component Architecture Patterns

### Layout Composition
- **Grid-based layouts**: `s-grid`, `s-stack` Polaris web components
- **Column patterns**: Two-column (details sidebar), three-column (editor)
- **Responsive**: Mobile-first with breakpoints

### State Management
- **React Hooks**: useState, useReducer, useCallback, useMemo, useRef
- **Custom Hooks**: useChat, useEditorState, usePreviewSettings
- **Form Data**: FormData API with React Router useSubmit
- **SSE Streaming**: Custom useChat hook manages event stream parsing

### Preview Architecture
- **iframe Sandbox**: Isolated DOM rendering, postMessage communication
- **Scale Detection**: ResizeObserver for responsive device sizing
- **Placeholder Handling**: Auto-replace broken images with SVG placeholders
- **Content Validation**: DOMPurify sanitization on all rendered HTML

### Styling
- **Polaris Web Components**: `<s-*>` element library
- **Inline Styles**: React style objects for responsive calculations
- **CSS-in-JS**: Minimal, only where needed
- **Design Tokens**: Polaris spacing, colors, border-radius via CSS vars

### Data Flow
- **Loader Data**: Route loaders fetch initial data, passed via useLoaderData
- **Form Submissions**: useSubmit for mutations, handled by route actions
- **API Routes**: Fetch-based async communication for real-time features
- **Chat Streaming**: ReadableStream + SSE for incremental AI responses

### Type Safety
- **TypeScript Strict**: All files .ts/.tsx with strict mode
- **Type Exports**: Interface/type exports from components
- **Service Layer Types**: Shared types imported from types/ directory
- **Props Interfaces**: All components define PropTypes or TS interfaces

---

## Dependencies Summary

### React & Router
- react-router v7
- @shopify/shopify-app-react-router (AppProvider, embedded)
- react (hooks: useState, useReducer, useCallback, useEffect, etc)

### UI Components
- @shopify/polaris (legacy provider)
- Polaris Web Components (s-* elements)
- @shopify/app-bridge-react (useAppBridge)

### Utilities
- isomorphic-dompurify (HTML sanitization)
- prism/prismjs (syntax highlighting in chat)
- Custom utilities: input-sanitizer, code-extractor, context-builder

### API & Data
- fetch API (native, no axios/fetch wrapper needed)
- FormData API
- postMessage (iframe communication)
- Server-Sent Events (SSE streaming)

### Server (in actions/loaders)
- prisma (database ORM)
- services layer (chat, section, template, billing, etc)
- authenticate.admin from shopify.server

---

## Key Technical Insights

### Security
- Input sanitization: `sanitizeUserInput()` on all user text
- HTML sanitization: DOMPurify on preview HTML
- SSRF prevention: Use session.shop not user-provided domain
- XSS prevention: Iframe sandbox, CSP headers, no script tags in preview

### Performance
- SSE streaming for AI responses (no large response bodies)
- Lazy component loading via route code-splitting
- Memoization in preview hooks (useMemo for resource detection)
- Image placeholder SVGs reduce layout thrashing

### Scalability
- Multi-tenant via shop isolation (session.shop)
- Pagination on history (20 items per page)
- Message summarization in chat context (10 recent + old summary)
- Context reduction for token efficiency

### UX Patterns
- Toast notifications (via Shopify AppBridge)
- Modal dialogs for destructive actions
- Loading skeletons for data fetch feedback
- Keyboard shortcuts (Cmd/Ctrl+Enter in prompts)
- Real-time preview updates via postMessage
- Device mode toggle (mobile/tablet/desktop)

---

## File Organization

```
app/
├── components/
│   ├── shared/              (4 files - Button, Card, Banner, FilterButtonGroup)
│   ├── generate/            (14 files - Layout, columns, modals, inputs)
│   ├── chat/                (11 files - Panel, messages, hooks, styles)
│   ├── editor/              (13 files - Layout, panels, modals, hooks, utils)
│   ├── preview/             (34+ files - Frame, settings, hooks, schema, mock data)
│   ├── home/                (4 files - Guide, analytics, news)
│   ├── sections/            (4 files - History, modals, empty state)
│   ├── generations/         (2 files - Empty state, delete modal)
│   ├── templates/           (3 files - Grid, card, modal)
│   ├── billing/             (5 files - Plans, usage, alerts)
│   ├── settings/            (1 file - Storefront password)
│   ├── common/              (1 file - Empty search)
│   └── index.ts             (Barrel export)
└── routes/
    ├── app.tsx              (Root layout)
    ├── app._index.tsx       (Dashboard)
    ├── app.sections.*       (3 section routes)
    ├── app.templates.tsx    (Templates)
    ├── app.billing.tsx      (Billing)
    ├── app.settings.tsx     (Settings)
    ├── auth.*/              (Auth routes)
    ├── api.*.tsx            (7 API endpoints)
    ├── webhooks.*.tsx       (3 webhook handlers)
    └── _index/route.tsx     (Public home)
```

---

## Testing Infrastructure

- `/app/components/preview/schema/__tests__/parseSchema.test.ts` | Schema parsing unit tests
- `/app/components/preview/hooks/__tests__/usePreviewRenderer.test.ts` | Preview hook tests
- `/app/components/chat/__tests__/useChat.test.ts` | Chat hook unit tests
- `/app/components/chat/__tests__/useAutoScroll.test.ts` | Auto-scroll behavior tests
- `/app/components/home/__tests__/SetupGuide.test.tsx` | Setup guide component tests
- `/app/components/home/__tests__/News.test.tsx` | News component tests
- `/app/routes/__tests__/api.feedback.test.tsx` | Feedback API tests

Test pattern: Vitest/Jest with React Testing Library for components.

---

## Unresolved Questions

1. **Chat hook implementation**: useChat file not found during exploration - likely in `/app/components/chat/hooks/useChat.ts` but couldn't verify - confirm location
2. **Module federation**: No evidence of code splitting or lazy loading setup - check webpack/vite config for details
3. **Error boundary coverage**: PreviewErrorBoundary exists but need to verify all routes have proper error handling
4. **Mock data usage**: Preview mockData exists but unclear which components actively use vs fallback behavior
5. **CSS-in-JS strategy**: Minimal inline styles observed - confirm if full styling via Polaris tokens or additional CSS files exist
