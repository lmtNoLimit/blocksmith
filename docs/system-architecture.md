# System Architecture - AI Section Generator (Blocksmith)

**Document Version**: 1.6
**Last Updated**: 2026-01-25
**Status**: Production-Ready (Phase 4 Complete + Phase 02 Bulk Delete)

## Executive Summary

AI Section Generator is a **Shopify embedded app** using React Router 7 server-side rendering with comprehensive service-oriented architecture. The system generates production-ready Liquid sections using Google Gemini 2.5 Flash AI, renders live previews via App Proxy native Shopify Liquid, and provides full multi-tenant isolation via shop domain verification.

**Architecture Principles**:
- **Service-Oriented**: 19 server modules with clear separation of concerns
- **Component-Based**: 111 React components organized by feature domain
- **Type-Safe**: Full TypeScript strict mode throughout
- **Multi-Tenant**: Complete shop domain isolation (data + operations + billing)
- **Adapter Pattern**: Mock/real service switching (development + testing)
- **Streaming**: Server-Sent Events (SSE) for real-time chat updates
- **Immutable Logs**: Audit trail for compliance and debugging

## High-Level Data Flow

```
User (Shopify Merchant)
        ↓
    [Shopify Admin iframe]
        ↓ HTTPS (App Bridge)
        ↓
[React Router App Server]
    ├─ Routes (29 file-based)
    ├─ Components (111 React)
    └─ Services (19 server modules)
        ├─ AI Service → Google Gemini 2.5 Flash
        ├─ Shopify Service → GraphQL Admin API
        ├─ Database Service → Prisma ORM
        ├─ Billing Service → Shopify App Billing
        └─ Auth Service → OAuth 2.0
            ↓
    [Prisma ORM]
        ↓
    [MongoDB / PostgreSQL / SQLite]
```

## Architecture Diagram

### System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Shopify Admin                                  │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │         Embedded App (iFrame) - Blocksmith                   │     │
│  │                                                               │     │
│  │  [Polaris Web Components - Native Shopify UX]                │     │
│  │  ├─ React Router 7 Pages (29 routes)                         │     │
│  │  ├─ 111 React Components                                     │     │
│  │  │   ├─ Editor (7) - 3-column layout                         │     │
│  │  │   ├─ Chat (23) - SSE streaming interface                  │     │
│  │  │   ├─ Generate (14) - Creation workflow                    │     │
│  │  │   ├─ Preview (45+) - Live rendering                       │     │
│  │  │   ├─ Sections (6) - Management                            │     │
│  │  │   ├─ Billing (8) - Plan + usage                           │     │
│  │  │   ├─ Templates (5) - Library                              │     │
│  │  │   └─ Common (9) - Shared UI                               │     │
│  │  └─ State Management (useReducer hooks + useFetcher)         │     │
│  │                                                               │     │
│  └────────────────────┬─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                        ↓ HTTPS (App Bridge)
         ┌──────────────┴──────────────┐
         ↓                             ↓
┌─────────────────────┐    ┌──────────────────────────┐
│  React Router       │    │  App Proxy               │
│  App Server         │    │  /apps/blocksmith-       │
│                     │    │   preview                │
└─────────────────────┘    └──────────────────────────┘
```

### Request/Response Flow

```
1. USER ACTION (Merchant clicks "Generate")
   ↓
2. BROWSER (React component dispatches fetcher)
   ↓ POST /api/chat/stream or POST /api/sections
3. REACT ROUTER SERVER (Handles loader/action)
   ↓
4. AUTHENTICATE (Verify session + shop domain)
   ↓
5. BUSINESS LOGIC LAYER (Services)
   ├─ Check feature gates (billing.server.ts)
   ├─ Track usage (usage-tracking.server.ts)
   ├─ Call AI or Shopify API
   └─ Persist to database (Prisma)
   ↓
6. RESPONSE
   ├─ For SSE: Stream chunks via Server-Sent Events
   ├─ For JSON: Return JSON response
   └─ For mutations: Return new state + redirect
   ↓
7. BROWSER (React component updates UI with response)
   ↓
8. DISPLAY (User sees generated section or preview)
```

## Layered Architecture

### Layer 1: Presentation (React Components)

**111 React Components** organized by feature domain:

```
app/components/
├─ editor/               (7 files) - 3-column editor layout
│  ├─ PolarisEditorLayout.tsx
│  ├─ ChatPanelWrapper.tsx
│  ├─ CodePreviewPanel.tsx
│  ├─ PublishModal.tsx
│  ├─ SettingsPanel.tsx
│  ├─ hooks/
│  │  ├─ useEditorState.ts
│  │  ├─ useVersionState.ts
│  │  └─ useAutoSave.ts
│
├─ chat/                 (23 files) - AI chat interface
│  ├─ ChatPanel.tsx (main container)
│  ├─ ChatInput.tsx (message input)
│  ├─ MessageList.tsx (scrollable history)
│  ├─ hooks/
│  │  ├─ useChat.ts (message management)
│  │  ├─ useStreamingMessage.ts (SSE handling)
│  │  ├─ useAutoScroll.ts (scroll sync)
│  │  └─ useChatSuggestions.ts (quick actions)
│
├─ generate/             (14 files) - Generation workflow
│  ├─ GenerateLayout.tsx (2-column: input | preview)
│  ├─ PromptInput.tsx (textarea)
│  ├─ ThemeSelector.tsx (dropdown)
│  ├─ CodePreview.tsx (syntax highlighting)
│  └─ GenerateActions.tsx (Save/Publish buttons)
│
├─ preview/              (45+ files) - Live preview system
│  ├─ AppProxyPreviewFrame.tsx (main renderer)
│  ├─ PasswordConfigModal.tsx (password entry)
│  ├─ hooks/ (4 custom hooks)
│  ├─ schema/ (4 utilities for parsing)
│  ├─ settings/ (20+ setting input controls)
│  ├─ context-drops/ (18 context renderers)
│  ├─ filters/ (25+ filter renderers)
│  └─ resource-picker/ (8+ resource pickers)
│
├─ sections/             (6 files) - Section management
├─ templates/            (5 files) - Template library
├─ billing/              (8 files) - Plan management
├─ home/                 (5 files) - Dashboard
└─ common/               (9 files) - Shared UI (Button, Modal, etc.)
```

**Key Characteristics**:
- 100% Polaris Web Components (`<s-*>` elements)
- useReducer hooks for local state (no Redux/Zustand)
- useFetcher for async operations
- TypeScript strict mode with no `any` types

### Layer 2: Routing (React Router 7)

**29 File-Based Routes**:

```
app/routes/
├─ Protected Routes (auth required):
│  ├─ app._index.tsx         → GET /app (Dashboard)
│  ├─ app.sections._index.tsx → GET /app/sections (List)
│  ├─ app.sections.new.tsx    → GET /app/sections/new (Create)
│  ├─ app.sections.$id.tsx    → GET /app/sections/:id (Edit)
│  ├─ app.templates.tsx       → GET /app/templates (Library)
│  ├─ app.billing.tsx         → GET /app/billing (Plans)
│  ├─ app.settings.tsx        → GET /app/settings (Prefs)
│  └─ app.tsx                 → Layout wrapper
│
├─ API Routes (JSON endpoints):
│  ├─ api.chat.stream.ts      → POST (SSE streaming)
│  ├─ api.chat.messages.ts    → GET (conversation)
│  ├─ api.enhance-prompt.ts   → POST (optimize)
│  ├─ api.preview.render.ts   → POST (render section)
│  ├─ api.feedback.ts         → POST (quality rating)
│  └─ api.sections.*.ts       → CRUD endpoints
│
├─ Webhooks:
│  ├─ webhooks.app.uninstalled.tsx      → Cleanup
│  ├─ webhooks.app.subscriptions-update.tsx → Billing
│  └─ webhooks.app.scopes-update.tsx    → Permissions
│
├─ Auth:
│  ├─ auth.callback.ts → OAuth callback
│  ├─ auth.login.ts    → Initiate flow
│  └─ auth.logout.ts   → Logout
│
└─ Public:
   └─ _index/          → Landing page
```

**Route Characteristics**:
- Each route has optional `loader` (GET data) + `action` (POST/PATCH/DELETE)
- Authentication via `authenticate.admin` (Shopify middleware)
- Error boundaries for graceful error handling
- Streaming responses for SSE endpoints

### Layer 3: Business Logic (Services)

**19 Server-Only Modules** (`.server.ts`):

```
app/services/
├─ CORE AI
│  └─ ai.server.ts (290 LOC)
│     - generateSection(prompt, context) → Liquid code
│     - enhancePrompt(prompt) → improved prompt
│     - Stream handling + mock fallback
│
├─ DATA MANAGEMENT
│  ├─ section.server.ts (430 LOC, Phase 02)
│  │   - CRUD: create, read, update, delete
│  │   - bulkDelete(ids, shop): Transactional cascade delete
│  │     * All-or-nothing semantics via Prisma $transaction
│  │     * Ownership validation (shop domain)
│  │     * Dependency cascade: messages → conversations → records → sections
│  │   - Status: DRAFT → ACTIVE → ARCHIVE
│  │
│  ├─ chat.server.ts (220 LOC)
│  │   - Conversation persistence
│  │   - Message threading
│  │
│  └─ generation-log.server.ts (150 LOC)
│      - Immutable audit trail
│
├─ EXTERNAL INTEGRATIONS
│  ├─ shopify-data.server.ts (340 LOC)
│  │   - GraphQL: themes, products, collections, articles
│  │   - Pagination + field selection
│  │
│  ├─ theme.server.ts (290 LOC)
│  │   - themeFilesUpsert mutation
│  │   - Error handling: GraphQL userErrors, rate limits
│  │
│  └─ shopify.server.ts (280 LOC)
│      - OAuth configuration
│      - Session storage (online/offline)
│      - API client initialization
│
├─ BILLING & FEATURE CONTROL
│  ├─ billing.server.ts (450 LOC)
│  │   - getSubscription(shop)
│  │   - createSubscriptionIntent(shop, planName)
│  │   - confirmSubscription(chargeId)
│  │   - calculateUsageCharge(shop, usage)
│  │   - Hybrid: recurring + usage-based
│  │
│  ├─ feature-gate.server.ts (180 LOC)
│  │   - isFeatureEnabled(shop, feature)
│  │   - getFeatureLimit(shop, feature)
│  │   - Features: live_preview, publish_theme, chat_refinement
│  │
│  └─ usage-tracking.server.ts (280 LOC)
│      - recordUsage(shop, feature, amount)
│      - getUsage(shop, feature, period)
│      - checkQuota(shop, feature)
│      - isOverQuota(shop, feature)
│
├─ SECURITY & PRIVACY
│  ├─ encryption.server.ts (170 LOC)
│  │   - encryptPassword(password, key) → AES-256-GCM
│  │   - decryptPassword(ciphertext, key)
│  │
│  └─ storefront-auth.server.ts (210 LOC)
│      - createStorefrontSession(shop, password)
│      - validateStorefrontToken(shop, token)
│
└─ (Additional services: database, logger, error handler, etc.)
```

**Service Characteristics**:
- Server-only (cannot be imported on client)
- Async/await with proper error handling
- Dependency injection via function parameters
- Testable interfaces for mock implementations

### Layer 4: Database (Prisma ORM)

**11 Models** with relationships:

```
┌─────────────────────────────────────────┐
│        Core Business Models             │
├─────────────────────────────────────────┤
│ Section                                 │
│  ├─ id (PK), shop (FK), prompt         │
│  ├─ content (Liquid code), status      │
│  ├─ themeId?, themeName?, fileName?    │
│  ├─ conversationId? (FK)               │
│  └─ createdAt, updatedAt               │
│                                         │
│ Conversation  ←─────────────────────┐   │
│  ├─ id, shop, sectionId (FK)        │   │
│  ├─ messages[] (relation)           │   │
│  └─ createdAt, updatedAt            │   │
│                                     │   │
│ Message                             │   │
│  ├─ id, conversationId (FK) ────────┘   │
│  ├─ role (user|assistant)               │
│  ├─ content, codeVersion?               │
│  └─ createdAt                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          Billing Models                 │
├─────────────────────────────────────────┤
│ Subscription                            │
│  ├─ id, shop (UK), planId (FK)         │
│  ├─ chargeId, status (active|cancelled)│
│  ├─ billingCycle, nextBillingDate      │
│  └─ cancelledAt?                        │
│                                         │
│ UsageRecord                             │
│  ├─ id, shop, feature                  │
│  ├─ amount, billingPeriod              │
│  └─ createdAt                          │
│                                         │
│ PlanConfiguration                      │
│  ├─ id, planName (UK)                  │
│  ├─ basePrice, features[] (JSON)       │
│  ├─ limits (JSON), quotas (JSON)       │
│  └─ createdAt                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Template & Supporting Models       │
├─────────────────────────────────────────┤
│ SectionTemplate                         │
│  ├─ id, name, category                 │
│  ├─ code, schema, previewCode?         │
│  ├─ tags, downloads, rating            │
│  ├─ createdBy, createdAt               │
│
│ ShopSettings                            │
│  ├─ shop (PK), timezone                │
│  ├─ defaultTheme, preferences (JSON)   │
│
│ GenerationLog                           │
│  ├─ id, shop, prompt, code             │
│  ├─ result (JSON), createdAt           │
│
│ FailedUsageCharge                      │
│  ├─ id, shop, amount, reason           │
│  ├─ retryCount, createdAt              │
│
│ SectionFeedback                         │
│  ├─ id, sectionId (FK), rating         │
│  ├─ comment, createdAt                 │
└─────────────────────────────────────────┘
```

**Database Characteristics**:
- SQLite (dev) / PostgreSQL or MongoDB (production)
- Multi-tenant via shop domain foreign key
- Immutable audit logs (GenerationLog, FailedUsageCharge)
- Soft deletes via status enum (ARCHIVE state)
- Atomic cascade delete via Prisma transactions (Phase 01)

**Cascade Delete Pattern (Phase 01 - Section Service)**:

When a Section is deleted, all dependent records are removed in a single atomic transaction:

```
DELETE Section
  ├─ DELETE Conversation (1:1 relation to Section)
  │   └─ DELETE Messages (child of Conversation)
  ├─ DELETE UsageRecords (references Section)
  ├─ DELETE SectionFeedback (references Section)
  └─ DELETE FailedUsageCharge (references Section)

PRESERVE: GenerationLog (sectionId becomes orphan reference for audit purposes)
```

This pattern ensures:
- **Data consistency**: All related records removed together (atomicity)
- **No orphans**: No dangling foreign key references
- **Audit trail**: Immutable logs preserved for compliance/debugging
- **Transaction safety**: Rollback on any deletion failure

See `Code Standards > Data Integrity & Transaction Patterns` for implementation details.

### Layer 5: External APIs

#### Google Gemini 2.5 Flash

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent

Request:
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Generate a testimonials section..."
        }
      ]
    }
  ],
  "systemInstruction": {
    "parts": [
      {
        "text": "[137-line system prompt on Shopify Liquid expertise]"
      }
    ]
  },
  "safetySettings": [...]
}

Response:
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "{% schema %}\n{\n  \"name\": \"...\",\n  \"settings\": [...],\n  \"blocks\": [...]\n}\n{% endschema %}\n\n{% stylesheet %}\n  ...\n{% endstylesheet %}\n\n<div ...>\n  ...\n</div>"
          }
        ]
      }
    }
  ]
}

Features:
- Streaming (chunked response)
- System instruction (137 lines of expertise)
- Temperature: default (0.7)
- Safety settings: default (minimal blocking)
```

#### Shopify GraphQL Admin API (2025-10)

```
Scopes Required:
- write_products (admin_graphql_api access)
- write_themes (theme:write, themeFilesUpsert)
- read_themes (theme:read)
- read_files (for theme file access)
- write_app_proxy (for /apps/blocksmith-preview)

Key Queries:
- GetThemes { themes { id, name, role, createdAt } }
- GetProducts { products { id, title, handle, images } }
- GetCollections { collections { id, title, handle } }
- GetArticles { articles { id, title, content, author } }

Key Mutations:
- themeFilesUpsert(
    themeId, files: [
      { path: "sections/my-section.liquid", body: "..." }
    ]
  ) → { files, userErrors }
```

#### Shopify App Billing API

```
- Create charge: CreateAppSubscription(plan, returnUrl)
- Confirm charge: AppSubscription { chargeId, confirmationUrl }
- Cancel: CancelAppSubscription(id)
- Usage-based: CreatePublicAppSubscription(plan)
  { chargeId, returnUrl }

Payment Webhook (subscriptions/update):
{
  "app_subscription": {
    "id": "gid://...",
    "name": "Pro Plan",
    "price": "19.99",
    "returnUrl": "...",
    "status": "active|pending|cancelled|declined",
    "lineItems": [{ ... }]
  }
}
```

## Multi-Tenant Architecture

Every operation is scoped to a **shop domain**:

```
┌─────────────────────────────────────────────────────────────┐
│                      Shopify Multi-Tenant                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Shop A (shop-a.myshopify.com)                              │
│  ├─ Sessions (A's oauth tokens)                             │
│  ├─ Sections (A's generated sections)                       │
│  ├─ Conversations (A's chat history)                        │
│  ├─ Subscription (A's billing)                              │
│  ├─ UsageRecords (A's generation count)                     │
│  └─ ShopSettings (A's preferences)                          │
│                                                              │
│  Shop B (shop-b.myshopify.com)                              │
│  ├─ Sessions (B's oauth tokens)                             │
│  ├─ Sections (B's generated sections)                       │
│  ├─ Conversations (B's chat history)                        │
│  ├─ Subscription (B's billing)                              │
│  ├─ UsageRecords (B's generation count)                     │
│  └─ ShopSettings (B's preferences)                          │
│                                                              │
│  ... (100+ more shops)                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Isolation Mechanisms**:

1. **Session Verification**: Every authenticated request verifies session exists + is valid
2. **Query Filtering**: All database queries include `WHERE shop = <currentShop>`
3. **API Authorization**: Shopify OAuth tokens scoped to specific shop
4. **Webhook Validation**: HMAC signature verification (shop domain in webhook)
5. **Billing Isolation**: Plan + usage tracked per shop independently

## SSE Streaming Architecture (Chat)

For real-time AI responses without polling:

```
Browser                       Server

User sends message
    │
    ├─→ POST /api/chat/stream
    │   { message: "...", conversationId: "..." }
    │
    │   ←─ HTTP 200 (streaming)
    │   ←─ Content-Type: text/event-stream
    │   ←─ data: { "chunk": "{% schema %}\n", "status": "streaming" }\n\n
    │   ←─ data: { "chunk": "{\n", "status": "streaming" }\n\n
    │   ←─ data: { "chunk": "  \"name\": \"...\",\n", ... }\n\n
    │   ...
    │   ←─ data: { "chunk": "", "status": "complete", "messageId": "msg_123" }\n\n
    │
    └─→ (connection closes)

React Component:
- useStreamingMessage() hook handles stream
- Accumulates chunks into code buffer
- Real-time UI updates as chunks arrive
- On complete: calls saveAutoSave (if enabled)
```

**Benefits**:
- No polling overhead
- Real-time feedback to user
- Automatic reconnection on network interruption
- Proper cleanup on component unmount

## Error Handling Strategy

```
Layer 1: Input Validation
  ├─ input-sanitizer.ts (XSS/injection prevention)
  ├─ validators.ts (schema validation)
  └─ TypeScript strict mode (compile-time checks)
           ↓
Layer 2: Service Error Handling
  ├─ Try-catch blocks with structured logging
  ├─ Retry logic (exponential backoff)
  ├─ Graceful degradation (fallback to mock)
  └─ Error transformation (user-friendly messages)
           ↓
Layer 3: Route Error Handling
  ├─ Error boundaries in React components
  ├─ Toast notifications for user feedback
  ├─ Fallback UI for failed operations
  └─ Redirect to error page if critical
           ↓
Layer 4: User Feedback
  ├─ Toast notifications (success/error/warning)
  ├─ Error banners with actionable text
  ├─ Loading states + spinners
  └─ Empty states with next steps
```

## Security Patterns

### Authentication
- **OAuth 2.0**: Shopify handles credential exchange
- **Offline tokens**: Long-lived API access
- **Online tokens**: Expires in 24 hours
- **Session storage**: Encrypted in database

### Authorization
- **Scope-based**: write_themes, write_products, read_themes
- **Shop isolation**: All queries filtered by shop domain
- **Feature gates**: Plan-based access (live_preview, publish_theme)
- **Usage limits**: Quota tracking per shop per period

### Data Privacy
- **Minimal PII**: Email, name from Shopify (no tracking)
- **Password encryption**: AES-256-GCM for storefront passwords
- **Immutable logs**: GenerationLog for audit trail
- **No code caching**: AI responses not persisted beyond user session

### API Security
- **HTTPS only**: All communication encrypted
- **HMAC verification**: Webhooks signed by Shopify
- **Rate limiting**: Respect Shopify API buckets
- **Environment secrets**: GEMINI_API_KEY not committed

## Performance Optimization

### Frontend
- **Code splitting**: Route-based lazy loading
- **Image optimization**: Shopify CDN for product images
- **Streaming responses**: SSE reduces perceived latency
- **Auto-save**: Silent background saves (useFetcher)

### Backend
- **Query optimization**: GraphQL field selection
- **Connection pooling**: Prisma manages DB connections
- **Caching**: Session tokens cached in-memory
- **Async operations**: Non-blocking I/O throughout

### Database
- **Indexes**: shop + createdAt for common queries
- **Pagination**: limit 20-50 per query
- **Soft deletes**: status column avoids hard deletes
- **Connection pooling**: Configurable in DATABASE_URL

**Performance Targets**:
- Section generation: < 10s (95th percentile)
- Theme fetch: < 2s (95th percentile)
- Section save: < 3s (95th percentile)
- App load: < 1s (3G connection)

## Deployment Architecture

```
Production Environment:
  ├─ App Server (Node.js 20+)
  │  ├─ React Router app (SSR)
  │  ├─ API routes (JSON)
  │  ├─ Webhook handlers
  │  └─ Static assets (Vite build output)
  │
  ├─ Database
  │  ├─ PostgreSQL 13+ (primary)
  │  └─ or MongoDB 4.4+ (secondary)
  │
  ├─ Caching Layer
  │  ├─ Session tokens (in-memory)
  │  ├─ Theme list (5 min TTL)
  │  └─ Plan config (1 hour TTL)
  │
  ├─ External Services
  │  ├─ Google Gemini API
  │  ├─ Shopify GraphQL Admin API
  │  └─ Shopify App Billing API
  │
  └─ Monitoring
     ├─ Error tracking (Sentry)
     ├─ Performance monitoring (New Relic)
     ├─ Log aggregation (CloudWatch/Datadog)
     └─ Uptime monitoring (Pingdom)

Options:
- Google Cloud Run (recommended)
- Fly.io
- Render
- Heroku (legacy)
- Custom Docker on ECS/GKE
```

## Scalability Considerations

### Horizontal Scaling
- **Stateless servers**: Sessions in database (not memory)
- **Load balancing**: Multiple app instances behind LB
- **Database replication**: Read replicas for analytics
- **Session affinity**: Not required (sessions are DB-backed)

### Vertical Scaling
- **Resource limits**: CPU/memory per instance
- **Connection pools**: Database connections pooled per instance
- **Timeout configuration**: Reasonable defaults (30s route, 10s AI)

### Sharding (if needed)
- **By shop domain**: Shop A → shard 1, Shop B → shard 2
- **By feature**: Billing data separate database
- **By time**: Logs in separate hot/cold storage

## Testing Strategy

```
Unit Tests (Components + Services)
  ├─ Jest + React Testing Library
  ├─ 30+ test suites
  ├─ Mock services (MockAIService, MockThemeService)
  └─ Snapshot tests for complex components

Integration Tests (Routes + Services)
  ├─ Loader + action testing
  ├─ Database operations
  ├─ API mocking with MSW
  └─ End-to-end flows

E2E Tests (Full user journey)
  ├─ Playwright scripts
  ├─ Shopify sandbox store
  ├─ Real Gemini API calls
  └─ Billing flows (test mode)
```

## Monitoring & Observability

```
Metrics:
  ├─ Generation latency (histogram)
  ├─ API error rate (counter)
  ├─ Active sessions (gauge)
  ├─ Database query time (histogram)
  └─ Gemini API cost (counter)

Logs:
  ├─ Structured JSON logs
  ├─ Shop domain in every log entry
  ├─ Request ID for tracing
  └─ Error stack traces

Traces:
  ├─ Distributed tracing (OpenTelemetry)
  ├─ Service-to-service calls
  ├─ Database queries
  └─ External API calls
```

---

**Document Version**: 1.5
**Last Updated**: 2026-01-20
**Maintainer**: Documentation Manager
