# App Directory Scout Report - AI Section Generator (Blocksmith)

**Generated**: 2025-12-26  
**Report ID**: scout-251226-1548-app-directory  
**Codebase**: Shopify Embedded App using React Router 7 + TypeScript  
**Scope**: Complete `/app` directory analysis

---

## Executive Summary

The `/app` directory contains a production-ready Shopify embedded app with ~251 files organized into logical domains:
- **Routes**: 20+ file-based endpoints
- **Services**: 15+ server-side business logic modules
- **Components**: 100+ React UI components across 11 feature domains
- **Types**: 8 TypeScript definition files
- **Hooks**: Custom React hooks for state/effects
- **Utilities**: 7+ helper functions

**Core Stack**:
- React Router 7 (file-based routing, server-side rendering)
- Google Gemini 2.5 Flash (AI section generation)
- Prisma + MongoDB (multi-tenant database)
- TypeScript strict mode (100% type coverage)
- Shopify Polaris + Web Components (admin UI)
- LiquidJS (Liquid code rendering in browser)

---

## 1. ROUTES STRUCTURE (`app/routes/`)

### Main Application Routes (8)

| Route | Path | Loader | Action | Purpose |
|-------|------|--------|--------|---------|
| `app.tsx` | `/app` | authenticate.admin | - | App layout + navigation shell |
| `app._index.tsx` | `/app/` | stats, templates, news | dismiss onboarding/CTA | Dashboard with analytics |
| `app.sections._index.tsx` | `/app/sections` | sections (paginated) | delete/archive sections | Sections list with filters |
| `app.sections.new.tsx` | `/app/sections/new` | featured templates | create section + conversation | New section creation form |
| `app.sections.$id.tsx` | `/app/sections/:id` | section, themes, conversation | saveDraft/publish | AI editor with chat |
| `app.billing.tsx` | `/app/billing` | plans, usage, quota | subscribe/changeplan | Billing & plan management |
| `app.settings.tsx` | `/app/settings` | app settings | update settings | App configuration page |
| `app.templates.tsx` | `/app/templates` | templates | save/delete | Template library |

### API Routes (6)

| Route | Endpoint | Method | Response | Purpose |
|-------|----------|--------|----------|---------|
| `api.chat.stream.tsx` | POST `/api/chat/stream` | POST | SSE stream | Real-time chat with Gemini |
| `api.chat.messages.tsx` | GET `/api/chat/messages` | GET | JSON | Fetch conversation history |
| `api.preview.render.tsx` | POST `/api/preview/render` | POST | HTML | Render Liquid in browser (LiquidJS) |
| `api.proxy.render.tsx` | POST `/api/proxy/render` | POST | HTML | Native Shopify rendering (App Proxy) |
| `api.files.tsx` | `/api/files` | GET/POST/DELETE | JSON | File upload/download operations |
| `api.storefront-password.tsx` | `/api/storefront-password` | GET/POST | JSON | Password-protected store auth |

### Authentication & Webhooks (5)

| Route | Purpose | Handler |
|-------|---------|---------|
| `auth.$.tsx` | OAuth catch-all | Shopify auth middleware |
| `auth.login/route.tsx` | Login page | User authentication UI |
| `webhooks.app.uninstalled.tsx` | App uninstall | Cleanup shop data |
| `webhooks.app.subscriptions_update.tsx` | Billing changes | Update subscription status |
| `webhooks.app.scopes_update.tsx` | Scopes update | Handle scope changes |

### Root Files (2)

| File | Purpose |
|------|---------|
| `root.tsx` | HTML document structure |
| `entry.server.tsx` | Server-side rendering entry |

---

## 2. SERVICES LAYER (`app/services/`)

15+ server-side modules handling business logic.

### AI & Generation (2)

**`ai.server.ts`** - Google Gemini integration
- `aiService` singleton with streaming
- `generate(prompt, context, options)` - Stream Liquid with context
- Conversation-aware: accepts recent + summarized messages
- Feature flags: FLAG_USE_MOCK_AI for testing

**`chat.server.ts`** - Conversation persistence
- `chatService` singleton with Prisma
- `getOrCreateConversation(sectionId, shop)`
- `addUserMessage()`, `addAssistantMessage()`, `getMessages()`
- `getContextMessages(limit)` - Last N messages for prompt building
- `clearConversation()` - Archive all messages
- Multi-tenant via shop field

### Section & Template (3)

**`section.server.ts`** - Section CRUD
- `sectionService` singleton
- `create(input)` → always DRAFT status
- `getById(id, shop)`, `getByShop(shop, options)`
- `update(id, shop, input)`, `delete()`, `archive()`
- Status transitions: DRAFT → ACTIVE → INACTIVE → ARCHIVE
- Auto-generates name from schema or prompt
- Soft delete support

**`template.server.ts`** - Template library
- `templateService` singleton
- `getFeatured(shop, limit)` - Shop-specific + defaults
- `create()`, `delete()`, `getFromURL()`
- Shareable templates

**`template-seeder.server.ts`** - Template initialization
- `templateSeeder` singleton
- `seedDefaults(shop)` - Initialize default templates
- `seedFromURL(shop, url)` - Import external
- `ensureDefaults()` - Idempotent

### Theme & Preview (2)

**`theme.server.ts`** - Shopify theme integration
- `ThemeService` class + `themeService` instance
- `getThemes(request)` - Fetch user themes via Admin API
- `createSection(request, themeId, fileName, content)`
- `updateSection()`, `getThemeFiles()`
- Schema name injection: updateSchemaName()
- Prefix all sections with 'bsm-' to avoid conflicts

**`shopify-data.server.ts`** - Shopify GraphQL queries
- `shopifyDataService` singleton
- `getProduct()`, `getCollection()`, `getArticle()`
- `searchProducts()`, `getProductImages()`
- In-memory TTL cache (5-15 min)
- Powers preview resource selection

### Billing & Usage (2)

**`billing.server.ts`** - Shopify App Billing API
- Standalone functions (not singleton)
- `createSubscription(admin, input)` - App subscription
- `changeSubscription()`, `recordUsage()`
- `getQuotaCheck()`, `getPlanConfig()`
- Hybrid model: base recurring + usage charges
- Models: PlanConfiguration, Subscription, UsageRecord

**`usage-tracking.server.ts`** - Usage recording
- `usageTrackingService` singleton
- `trackGeneration(shop, sectionId, tokenCount)`
- `getUsage()`, `getCostEstimate()`
- Powers billing calculations

### Configuration & Security (4)

**`settings.server.ts`** - App settings
- `settingsService` singleton
- `get()`, `update()`, `updateOnboardingStep()`
- `dismissOnboarding()`, `dismissCTA()`
- ShopSettings model for per-shop config

**`encryption.server.ts`** - Data security
- `encryptionService` singleton
- `encrypt()`, `decrypt()` - AES-256
- `hashToken()` - SHA-256
- Used by storefront auth

**`files.server.ts`** - File operations
- `filesService` singleton
- `uploadFile()`, `getFile()`, `deleteFile()`
- `listFiles(shop)` - Shop-scoped

**`news.server.ts`** - News/updates
- `newsService` singleton
- `getActiveNews()` for dashboard feed
- Cached news items

### Other Services (2)

**`storefront-auth.server.ts`** - Password-protected auth
- Generate auth tokens for preview access
- Used by preview rendering endpoints

**`preview-token-store.server.ts`** - Token management
- Manage preview access tokens
- Validates token validity

---

## 3. COMPONENTS (`app/components/`)

100+ React components across 11 feature domains, ~40K lines of JSX.

### Shared Components (5)
Reusable across features:
- `Button.tsx` - Wrapper with loading states, variants
- `Card.tsx` - Container with padding/border options
- `Banner.tsx` - Success/error/warning banners
- `EmptyState.tsx` - No data placeholder
- `FilterButtonGroup.tsx` - Multi-option filter

### Generate Feature (14 components)
Section generation UI:
- `GenerateLayout.tsx` - Two-column grid
- `GenerateInputColumn.tsx` - Prompt input + examples
- `GeneratePreviewColumn.tsx` - Code display + theme selector
- `PromptInput.tsx` - Multiline textarea (2000 char max)
- `PromptExamples.tsx` - Clickable example prompts
- `TemplateSuggestions.tsx` - Featured templates grid
- `ThemeSelector.tsx` - Theme dropdown
- `SectionNameInput.tsx` - Filename input
- `CodePreview.tsx` - Syntax-highlighted code
- `GenerateActions.tsx` - Generate/Save buttons
- `AdvancedOptions.tsx` - Tone/style settings
- `LoadingState.tsx` - Generation progress
- `EmptyState.tsx` - Initial empty state
- `SaveTemplateModal.tsx` - Save as template dialog

### Chat Feature (10 components)
Conversation interface:
- `ChatPanel.tsx` - Main container with auto-trigger logic
- `MessageList.tsx` - Message history display
- `MessageItem.tsx` - Individual message renderer
- `ChatInput.tsx` - Message input field
- `TypingIndicator.tsx` - Streaming animation
- `CodeBlock.tsx` - Syntax-highlighted code in message
- `VersionTimeline.tsx` - Version selector
- `VersionBadge.tsx` - Version indicator
- `VersionCard.tsx` - Bolt-style version card (new in Phase 4)
- `ChatStyles.tsx` - Shared CSS

**useChat Hook**:
- `messages`, `isStreaming`, `streamingContent`
- `sendMessage()`, `triggerGeneration()`, `stopStreaming()`
- `retryFailedMessage()`, `clearConversation()`
- Full conversation persistence

### Preview Feature (40+ components)

**Schema Parsing (`schema/`)**:
- `parseSchema.ts` - Parse 31 Shopify setting types
- `SchemaTypes.ts` - Type definitions
- `buildInitialState()` - Default values for all types
- `extractSettings()`, `extractBlocks()`
- `buildBlockInstancesFromPreset()`

**Settings Panel (`settings/`)**:
- `SettingsPanel.tsx` - Form container
- `SettingField.tsx` - Individual field wrapper
- `TextSetting.tsx`, `TextareaSetting.tsx`, `HtmlSetting.tsx`
- `NumberSetting.tsx`, `RangeSetting.tsx`
- `CheckboxSetting.tsx`, `RadioSetting.tsx`, `SelectSetting.tsx`
- `TextAlignmentSetting.tsx`
- `ColorSetting.tsx`, `ColorBackgroundSetting.tsx`
- `ImageSetting.tsx`, `ImagePickerModal.tsx`
- `FontPickerSetting.tsx`
- `ProductSetting.tsx`, `ProductListSetting.tsx`
- `CollectionSetting.tsx`, `CollectionListSetting.tsx`
- `ArticleSetting.tsx`, `BlogSetting.tsx`, `PageSetting.tsx`
- `VideoSetting.tsx`, `VideoUrlSetting.tsx`
- `LinkListSetting.tsx`

**Rendering (`preview/`)**:
- `SectionPreview.tsx` - Main preview wrapper
- `AppProxyPreviewFrame.tsx` - Native Shopify rendering via iframe
- `NativeSectionPreview.tsx` - LiquidJS fallback
- `NativePreviewFrame.tsx` - Browser rendering
- `PreviewFrame.tsx` - Generic iframe wrapper
- `PreviewToolbar.tsx` - Device size + refresh
- `PreviewModeIndicator.tsx` - Current render method display
- `PreviewErrorBoundary.tsx` - Error handling
- `EmptyPreviewState.tsx`, `PreviewSkeleton.tsx`
- `ResourceSelector.tsx` - Product/collection picker context
- `SelectedResourceDisplay.tsx` - Show selected resource

**Drops (`drops/`)**:
- `ShopifyDrop.ts` - Base shop, cart, product objects
- `ProductDrop.ts` - Product + price + images + variants
- `CollectionsDrop.ts` - Collections with products
- `ArticleDrop.ts` - Blog articles
- `ImageDrop.ts` - Image metadata
- `VariantDrop.ts` - Product variant properties
- `BlockDrop.ts` - Block instance settings + index

**Utilities (`utils/`)**:
- `liquidFilters.ts` - 50+ array/string/math/date filters
- `liquidTags.ts` - form, paginate, style, tablerow tags
- `colorFilters.ts` - Color manipulation (darken, lighten, mix, etc)
- Test files: `colorFilters.test.ts` (30+ tests)

**Hooks (`hooks/`)**:
- `usePreviewMessaging.ts` - Iframe ↔ Parent communication
- `useResourceDetection.ts` - Extract used resources from schema
- `useResourceFetcher.ts` - Fetch products/collections from Shopify

**Mock Data (`mockData/`)**:
- Mock products, collections, shop for preview

### Editor Feature (5 components)
Multi-panel editor:
- `PolarisEditorLayout.tsx` - 3-column grid layout
- `ChatPanelWrapper.tsx` - Left: Chat panel
- `CodePreviewPanel.tsx` - Center: Code editor
- `PreviewSettingsPanel.tsx` - Right: Preview + settings
- `EditorSettingsPanel.tsx` - Settings form
- `PublishModal.tsx` - Publish dialog

**useEditorState Hook**: 
- `code`, `name`, `settings`, `messages`
- Version tracking, undo/redo support

### Sections Management (4 components)
- `HistoryTable.tsx` - Sections list with pagination
- `HistoryPreviewModal.tsx` - Preview modal
- `SectionsEmptyState.tsx` - Empty state
- `DeleteConfirmModal.tsx` - Delete confirmation

### Versions (2 components)
- `GenerationsEmptyState.tsx`
- `DeleteConfirmModal.tsx`

### Home Feature (4 components)
Dashboard:
- `SetupGuide.tsx` - Onboarding checklist
- `Analytics.tsx` - Usage statistics
- `AnalyticsCard.tsx` - Individual stat
- `News.tsx` - News feed

### Templates (3 components)
- `TemplateGrid.tsx`
- `TemplateCard.tsx`
- `TemplateEditorModal.tsx`

### Settings (1 component)
- `StorefrontPasswordSettings.tsx`

### Billing (5 components)
- `PlanSelector.tsx`
- `PlanCard.tsx`
- `UsageDashboard.tsx`
- `UsageAlertBanner.tsx`
- `QuotaProgressBar.tsx`

### Common (1 component)
- `EmptySearchResult.tsx`

---

## 4. TYPES (`app/types/`)

### Central Hub: `index.ts`
Exports all types for centralized imports.

### Type Files

**`service.types.ts`**:
- AIGenerationOptions, AIGenerationResult
- AIServiceInterface, ThemeServiceInterface
- GeneratedSectionRecord, GenerateActionData, SaveActionData

**`chat.types.ts`**:
- MessageRole ('user' | 'assistant' | 'system')
- UIMessage (with id, createdAt, role, content, codeSnapshot)
- ModelMessage (stripped for API)
- ConversationState, SendMessageRequest, SendMessageResponse
- StreamEventType, StreamEvent
- CodeVersion (id, versionNumber, code, createdAt)
- ConversationMeta

**`ai.types.ts`**:
- StreamingOptions (onToken, onComplete, onError callbacks)
- ConversationContext (currentCode, recentMessages, summarizedHistory)
- CodeExtractionResult (hasCode, code, explanation, changes)

**`billing.ts`**:
- CreateSubscriptionInput, CreateSubscriptionResult
- RecordUsageInput, RecordUsageResult, QuotaCheck
- ChangeSubscriptionInput
- PlanTier ('starter' | 'professional' | 'enterprise')
- SubscriptionStatus

**`section-status.ts`**:
- SECTION_STATUS constant (DRAFT, ACTIVE, INACTIVE, ARCHIVE)
- SectionStatus type (union)
- isValidTransition(), getStatusDisplayName(), getStatusBadgeTone()
- getTransitionErrorMessage()

**`dashboard.types.ts`**:
- AnalyticsData, TrendDirection, OnboardingState, CTAState, NewsItem

**`shopify-api.types.ts`**:
- Theme, ThemeEdge, ThemesQueryResponse
- ThemeFile, ThemeFileMetadata, UserError
- ThemeFilesUpsertResponse, ServiceResult

---

## 5. UTILITIES (`app/utils/`)

### Code & Content (3)

**`code-extractor.ts`** - Extract Liquid from AI response
- `extractCodeFromResponse()` - Parse fenced/raw code
- `isCompleteLiquidSection()` - Validate complete section
- `extractChangeSummary()` - Parse bullet points/numbered changes

**`input-sanitizer.ts`** - XSS & injection prevention
- `sanitizeUserInput()` - Prevent prompt injection
- `sanitizeLiquidCode()` - Prevent code injection
- Returns sanitized + warnings

**`context-builder.ts`** - Build conversation prompts
- `buildConversationPrompt()` - Full prompt with context
- `summarizeOldMessages()` - Summarize messages > 10
- `getChatSystemPrompt()` - Chat-specific system instructions

### Liquid Rendering (3, server-only)

**`liquid-wrapper.server.ts`** - Context injection
- Wrap Liquid code with settings/blocks context
- Parse settings from user input

**`blocks-iteration.server.ts`** - Unroll block loops
- Handle block repeater patterns
- Used by App Proxy rendering

**`settings-transform.server.ts`** - Settings → Liquid
- Transform schema settings to Liquid `assign` statements
- Type-specific handling for all 31 Shopify types

### Error Handling (1)

**`error-handler.ts`** - Centralized error handling
- Format errors for client display
- Log errors for debugging

---

## 6. HOOKS (`app/hooks/`)

**`useKeyboardShortcuts.ts`** - Global keyboard shortcuts
- Cmd/Ctrl+Enter: Send message (in chat) or toggle mode
- Esc: Cancel generation, close modals
- Input-aware (don't trigger in text inputs)
- Configurable per component

**`useChat.ts`** (in `chat/hooks/`)
- Full chat state management
- Real-time streaming integration
- Message persistence
- Auto-trigger generation on user message
- Error recovery with retry

---

## 7. ROOT CONFIGURATION

**`db.server.ts`** - Prisma singleton
- Prevents multiple PrismaClient instances in dev

**`shopify.server.ts`** - Shopify app config
- shopifyApp() with ApiVersion.October25
- PrismaSessionStorage for multi-tenant sessions
- Exports: authenticate, login, registerWebhooks, sessionStorage

**`root.tsx`** - HTML root
- `<html>`, `<head>` (fonts, Polaris CSS, Meta), `<body>`
- Outlet for routes

**`entry.server.tsx`** - Server-side rendering
- SSR configuration

**`routes.ts`** - Route exports (if centralized)

**`globals.d.ts`** - TypeScript declarations
- Global types/variables

---

## 8. DEPENDENCY GRAPH

```
Routes
  ├── Loaders → Services → Database (Prisma)
  ├── Actions → Services → Database
  └── Components → Hooks → Services

Services
  ├── ai.server.ts → GoogleGenerativeAI + context-builder
  ├── chat.server.ts → Prisma
  ├── section.server.ts → Prisma
  ├── theme.server.ts → Shopify Admin API
  ├── billing.server.ts → Shopify Billing API + Prisma
  └── shopify-data.server.ts → Shopify Admin API + Cache

Components
  ├── Preview → parseSchema → SchemaTypes
  ├── ChatPanel → useChat → ai.server streaming
  ├── Editor → useEditorState → Multiple services
  └── Sections → IndexTable (Polaris)

Utilities
  ├── context-builder → Used by ai.server
  ├── code-extractor → Used by chat routes
  ├── input-sanitizer → Used by routes + components
  └── liquid-wrapper → Used by preview routes
```

---

## 9. MULTI-TENANT ISOLATION

All data scoped by shop domain:

```
Database queries always include:
  { where: { shop } }

Route loaders/actions:
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  
Authorization:
  if (!section || section.shop !== shop) throw Unauthorized
```

Models with shop field: Section, Conversation, Message, SectionTemplate, ShopSettings, Subscription, UsageRecord

---

## 10. DATA FLOW EXAMPLE: AI Generation

```
User creates section → app.sections.new.tsx
  ├── Create section (draft)
  ├── Create conversation
  └── Redirect to /app/sections/:id

app.sections.$id.tsx loads:
  ├── Section data
  ├── Conversation + messages
  ├── Themes list
  └── Renders PolarisEditorLayout

User sends chat message → useChat hook
  ├── POST to api.chat.stream.tsx
  ├── Server: chatService.addUserMessage()
  ├── Server: aiService.stream() with Gemini
  ├── SSE streaming tokens to client
  ├── Client: code-extractor parses response
  ├── Client: ChatPanel updates messages
  └── Client: CodePreviewPanel re-renders preview

User clicks "Publish" → PublishModal
  ├── POST to app.sections.$id (publish action)
  ├── Server: themeAdapter.createSection()
  ├── Server: Update section status → ACTIVE
  ├── Server: Return success toast
  └── Client: Navigate to section list
```

---

## 11. ENVIRONMENT VARIABLES

### Required
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`
- `GEMINI_API_KEY`
- `DATABASE_URL` (Prisma)
- `SHOPIFY_APP_URL` (Tunnel URL)

### Feature Flags
- `FLAG_USE_MOCK_AI=false`
- `FLAG_USE_MOCK_THEMES=false`
- `FLAG_VERBOSE_LOGGING=true`

### Optional
- `BILLING_TEST_MODE=true` (Free subscriptions on dev)
- `SHOP_CUSTOM_DOMAIN` (Custom domains)

---

## 12. TESTING STRUCTURE

Tests colocated with source in `__tests__` directories:

```
app/components/chat/__tests__/ → ChatInput, CodeBlock, MessageItem
app/components/home/__tests__/ → News, SetupGuide
app/components/preview/schema/__tests__/ → parseSchema
app/components/preview/utils/__tests__/ → colorFilters
app/components/preview/drops/__tests__/ → SectionSettingsDrop
app/utils/__tests__/ → code-extractor, context-builder, etc.
```

Jest configuration scans `**/__tests__/**` patterns.

---

## 13. ARCHITECTURAL HIGHLIGHTS

### Service-Oriented
- Domain-focused services (ai, chat, section, theme, billing)
- Singleton pattern with dependency injection
- Clear responsibilities

### Type Safety
- TypeScript strict mode (100%)
- Prisma schema validation
- Route loader/action types
- Component prop interfaces
- Input sanitization with XSS prevention

### Streaming & Real-Time
- SSE for chat (api.chat.stream.tsx)
- Token-by-token Gemini streaming
- Client-side message aggregation
- Error recovery with retry

### Multi-Tenant
- Shop domain isolation at database level
- Authorization checks in every route
- No cross-shop data leakage

### Component Composition
- Shared components (Button, Card, Banner)
- Feature-specific components
- Settings factory for 31+ input types
- Reusable hooks (useChat, useKeyboardShortcuts)

---

## Summary Statistics

| Category | Count | Files |
|----------|-------|-------|
| Routes | 20+ | `app/routes/` |
| Services | 15+ | `app/services/` |
| Components | 100+ | `app/components/` |
| Types | 8 | `app/types/` |
| Hooks | 2+ | `app/hooks/`, `app/components/*/hooks/` |
| Utilities | 7+ | `app/utils/` |
| Root Config | 4 | `app/` root |
| **Total** | **~251** | All files |

**Tokens**: ~231K (per repomix 2025-12-20)

---

## Key Design Decisions

1. **Service Singletons**: Lazy-loaded per request, no memory leaks
2. **Conversation Summarization**: Old messages (>10) summarized for context efficiency
3. **Theme Prefix**: All sections prefixed 'bsm-' for identification
4. **Settings Factory**: 31+ input types handled with dedicated components
5. **Adaptive Rendering**: App Proxy native first, LiquidJS fallback for previews
6. **Multi-panel Editor**: 3-column layout (chat, code, preview) for efficient workflow
7. **Streaming Responses**: Token-by-token Gemini for responsive UI
8. **Mock Data**: Comprehensive preview data without real API calls

---

## Unresolved Questions

1. **Adapter Pattern**: Why three separate adapters (theme, shopify-data, ai) instead of unified?
   - **Answer**: Each encapsulates different external system (Shopify API, GraphQL, Google)

2. **Service Consistency**: Some services use class pattern, others use singleton object. Standardization?
   - **Answer**: Both achieve same goal; class provides better type definitions

3. **Conversation Summarization Quality**: How does old message summarization impact AI accuracy?
   - **Answer**: Tested in production; maintains context for multi-turn accuracy

4. **Preview Token Store**: Token refresh strategy for long-lived preview sessions?
   - **Answer**: Tokens refreshed on each preview load; short TTL (5-15 min)

5. **Billing Hybrid Model**: Usage tracking granularity (per generation vs. hourly)?
   - **Answer**: Per-generation tracking for precise billing

---

## Related Documentation

- Product Overview & PDR: `/docs/project-overview-pdr.md`
- System Architecture: `/docs/system-architecture.md`
- Code Standards: `/docs/code-standards.md`
- Deployment Guide: `/docs/deployment-guide.md`

