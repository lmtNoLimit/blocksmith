# App Directory Scout - Quick Reference

**Report**: `scout-251226-1548-app-directory.md`  
**Scope**: Complete `/app` analysis  
**Files**: ~251 | **Tokens**: ~231K

---

## File Inventory

### Routes (20)
```
Main: app._index, app.sections._index, app.sections.new, app.sections.$id
Auth: auth.$, auth.login/route
Webhooks: app.uninstalled, app.subscriptions_update, app.scopes_update
Billing: app.billing, app.settings, app.templates
API: api.chat.stream, api.chat.messages, api.preview.render, api.proxy.render, api.files, api.storefront-password
```

### Services (15)
```
AI: ai.server (Gemini streaming), chat.server (persistence)
Data: section.server (CRUD), template.server (library), shopify-data.server (GraphQL)
Theme: theme.server (Shopify integration), files.server
Billing: billing.server (subscriptions), usage-tracking.server
Config: settings.server, encryption.server, news.server
Auth: storefront-auth.server, preview-token-store.server
```

### Components (100+)
```
Shared: Button, Card, Banner, EmptyState, FilterButtonGroup
Generate: PromptInput, ThemeSelector, CodePreview, GenerateActions (14 total)
Chat: ChatPanel, MessageList, ChatInput, VersionCard (10 total)
Preview: SectionPreview, SettingsPanel, 25+ setting types, schema parser (40+ total)
Editor: PolarisEditorLayout, ChatPanelWrapper, CodePreviewPanel, PublishModal (5 total)
Home: SetupGuide, Analytics, News (4 total)
Sections: HistoryTable, DeleteConfirmModal, SectionsEmptyState (4 total)
Templates: TemplateGrid, TemplateCard, TemplateEditorModal (3 total)
Billing: PlanSelector, UsageDashboard, QuotaProgressBar (5 total)
Settings: StorefrontPasswordSettings (1)
Common: EmptySearchResult (1)
```

### Types (8)
```
index.ts (central hub)
service.types.ts (AIGenerationOptions, AIServiceInterface, etc)
chat.types.ts (UIMessage, MessageRole, CodeVersion, etc)
ai.types.ts (StreamingOptions, ConversationContext)
billing.ts (PlanTier, SubscriptionStatus, etc)
section-status.ts (DRAFT, ACTIVE, INACTIVE, ARCHIVE + validators)
dashboard.types.ts (Analytics, Onboarding, CTA states)
shopify-api.types.ts (Theme, ThemeFile, etc)
```

### Hooks (2+)
```
app/hooks/useKeyboardShortcuts.ts (Cmd+Enter, Esc, etc)
app/components/chat/hooks/useChat.ts (messages, streaming, sendMessage)
```

### Utilities (7+)
```
code-extractor.ts (Extract Liquid from AI response)
input-sanitizer.ts (XSS prevention)
context-builder.ts (Build conversation prompts)
liquid-wrapper.server.ts (Context injection for Liquid)
blocks-iteration.server.ts (Unroll block loops)
settings-transform.server.ts (Settings → Liquid assigns)
error-handler.ts (Error formatting)
```

---

## Key Dependencies

### Data Flow
```
Routes → Services → Prisma (MongoDB)
Routes → Components → Hooks → Services
Components → Types
Services → External APIs (Shopify Admin, Google Gemini)
```

### Critical Services
- **ai.server.ts**: GoogleGenerativeAI + context-builder + code-extractor
- **chat.server.ts**: Conversation persistence + message management
- **section.server.ts**: Section CRUD + status validation
- **theme.server.ts**: Shopify theme file operations
- **shopify-data.server.ts**: GraphQL queries with TTL cache
- **billing.server.ts**: Subscription + usage tracking

---

## Architecture Patterns

| Pattern | Examples |
|---------|----------|
| **Singleton** | ai.server, chat.server, section.server, billing.server |
| **Service-Oriented** | 15+ focused services with single responsibility |
| **Adapter** | theme-adapter, shopify-data-adapter, ai-adapter |
| **Streaming** | SSE via api.chat.stream.tsx |
| **Multi-Tenant** | All queries filtered by shop domain |
| **Type Safety** | TypeScript strict mode + Prisma validation |
| **Component Factory** | Settings panel handles 31+ Shopify input types |

---

## Core Flows

### Section Creation
```
app.sections.new (form) 
  → create section (DRAFT) + conversation
  → redirect to app.sections.$id
  
app.sections.$id (editor)
  → Load section + themes + conversation
  → User sends chat message
  → api.chat.stream (SSE with Gemini)
  → Parse code from response
  → Re-render preview
  → User publishes
  → theme.server.createSection() → Shopify API
  → Update section status → ACTIVE
```

### Chat & Preview
```
ChatPanel (useChat hook)
  → sendMessage() 
  → Fetch POST api/chat/stream
  → SSE stream tokens
  → code-extractor parses Liquid
  → Update section code
  → SectionPreview re-renders
  → AppProxyPreviewFrame (native) or NativePreviewFrame (LiquidJS)
```

---

## Multi-Tenant Isolation

Every data access includes shop validation:
```typescript
// Routes
const { session } = await authenticate.admin(request);
const shop = session.shop;

// Queries
await sectionService.getByShop(shop, options)
await chatService.getOrCreateConversation(sectionId, shop)

// Authorization
const section = await sectionService.getById(id, shop);
if (!section || section.shop !== shop) throw Unauthorized;
```

Models with shop field: Section, Conversation, Message, SectionTemplate, ShopSettings, Subscription, UsageRecord, News

---

## Configuration

### Environment Variables
```bash
# Required
SHOPIFY_API_KEY, SHOPIFY_API_SECRET
GEMINI_API_KEY
DATABASE_URL (Prisma)
SHOPIFY_APP_URL (Tunnel)

# Feature Flags
FLAG_USE_MOCK_AI=false
FLAG_USE_MOCK_THEMES=false
FLAG_VERBOSE_LOGGING=true

# Optional
BILLING_TEST_MODE=true
SHOP_CUSTOM_DOMAIN=...
```

### Database Models
```
Section, Conversation, Message, SectionTemplate
ShopSettings, Subscription, UsageRecord, PlanConfiguration
News
```

---

## Quick Navigation

**For Feature Development**:
1. Add route in `app/routes/`
2. Create service in `app/services/` if new domain
3. Add component(s) in `app/components/`
4. Define types in `app/types/`
5. Add utilities as needed

**For Bug Fixes**:
1. Locate route or component path
2. Check service implementation
3. Validate database model
4. Check type definitions

**For Performance**:
1. Review `shopify-data.server.ts` cache strategy
2. Check component re-render patterns
3. Optimize Liquid rendering in `api.preview.render.tsx`
4. Review streaming efficiency in `api.chat.stream.tsx`

**For Security**:
1. Verify shop isolation in all loaders/actions
2. Check input-sanitizer usage
3. Review encryption.server for sensitive data
4. Check OAuth flow in auth routes

---

## Code Style & Standards

- **TypeScript**: Strict mode, no `any`
- **Components**: Props interfaces, no implicit children
- **Services**: Singleton pattern with initialization guard
- **Routes**: Loader types, Action types, error boundaries
- **Testing**: Colocated in `__tests__` directories
- **Naming**: camelCase (functions), PascalCase (components/types)

---

## Testing Infrastructure

Jest with:
- Chat component tests (`chat/__tests__/`)
- Home feature tests (`home/__tests__/`)
- Preview schema tests (`preview/schema/__tests__/`)
- Color filter tests (`preview/utils/__tests__/`)
- Utility tests (`utils/__tests__/`)

Run: `npm test`

---

## Performance Considerations

1. **Streaming**: Token-by-token Gemini for responsive chat
2. **Caching**: shopify-data.server uses TTL cache (5-15 min)
3. **Pagination**: Sections list paginated 20 per page
4. **Context Reduction**: Old messages (>10) summarized for Gemini
5. **Preview**: App Proxy native rendering preferred, LiquidJS fallback
6. **Debouncing**: Input fields debounced (300ms)

---

## Known Limitations

1. **Message Summarization**: Old messages summarized; may lose nuance
2. **Theme Prefix**: All sections prefixed 'bsm-'; not customizable
3. **Resource Limit**: Product queries limited to 50 items
4. **Preview Cache**: Mock data doesn't refresh with shop changes
5. **Conversation History**: Max ~50 messages per conversation

---

## Next Steps / Future Work

- Template versioning system
- Section marketplace/sharing
- Batch generation API
- Custom section blocks library
- Advanced Liquid debugging tools
- Performance monitoring dashboard

---

**Full Report**: `scout-251226-1548-app-directory.md` (685 lines)

