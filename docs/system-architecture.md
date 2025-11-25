# System Architecture

## Overview

AI Section Generator is a **serverless embedded Shopify app** built on React Router 7 with server-side rendering. The architecture follows a **service-oriented design** with clear separation between presentation, business logic, and data layers.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shopify Admin                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            Embedded App (iFrame)                       │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │    React UI (Polaris Web Components)        │     │    │
│  │  │  - Generate Section Form                     │     │    │
│  │  │  - Theme Selector                            │     │    │
│  │  │  - Code Preview                              │     │    │
│  │  └───────────┬──────────────────────────────────┘     │    │
│  │              │                                          │    │
│  └──────────────┼──────────────────────────────────────────┘    │
└─────────────────┼──────────────────────────────────────────────┘
                  │ HTTPS (App Bridge)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  React Router App Server                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │               Presentation Layer                       │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │  Routes (React Router 7)                    │     │    │
│  │  │  - app.generate.tsx  (loader + action)      │     │    │
│  │  │  - app._index.tsx                           │     │    │
│  │  │  - webhooks.*.tsx                           │     │    │
│  │  │  - auth.*.tsx                               │     │    │
│  │  └───────────┬──────────────────────────────────┘     │    │
│  └──────────────┼──────────────────────────────────────────┘    │
│                 │                                                │
│  ┌──────────────▼──────────────────────────────────────────┐    │
│  │               Business Logic Layer                      │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐   │    │
│  │  │   AIService          │  │   ThemeService       │   │    │
│  │  │  - generateSection() │  │  - getThemes()       │   │    │
│  │  │  - getMockSection()  │  │  - createSection()   │   │    │
│  │  └──────────┬────────────┘  └──────────┬───────────┘   │    │
│  └──────────────┼──────────────────────────┼───────────────┘    │
│                 │                          │                    │
│  ┌──────────────▼──────────────────────────▼───────────────┐    │
│  │               Data Access Layer                         │    │
│  │  ┌──────────────────────────────────────────────┐       │    │
│  │  │   Prisma ORM (db.server.ts)                  │       │    │
│  │  │  - Session CRUD                              │       │    │
│  │  │  - GeneratedSection CRUD                     │       │    │
│  │  └──────────────────────────────────────────────┘       │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────┬──────────────────────────────┬────────────────────┘
              │                              │
              ▼                              ▼
   ┌──────────────────┐          ┌──────────────────────┐
   │  SQLite / MySQL  │          │  Shopify Admin API   │
   │  / PostgreSQL    │          │  (GraphQL)           │
   │                  │          │  - themes query      │
   │  - Session       │          │  - themeFilesUpsert  │
   │  - Generated     │          │                      │
   │    Section       │          └──────────────────────┘
   └──────────────────┘                     │
                                            │
              ┌─────────────────────────────┘
              ▼
   ┌──────────────────────┐
   │  Google Gemini API   │
   │  (gemini-2.0-flash)  │
   │                      │
   │  - generateContent() │
   │  - systemInstruction │
   └──────────────────────┘
```

## Layer Breakdown

### 1. Presentation Layer

**Location**: `app/routes/`

**Responsibilities**:
- Handle HTTP requests (GET, POST)
- Render React components server-side and client-side
- Manage form submissions and navigation
- Display UI with Polaris web components
- Handle authentication redirects

**Key Components**:

#### `app.generate.tsx` (Core Feature Route)
- **Loader**: Fetches merchant themes on page load
- **Action**: Handles two actions:
  - `generate`: Sends prompt to AI service, returns generated code
  - `save`: Saves generated code to selected theme
- **Component**: Renders form with prompt input, theme selector, code preview, save button

#### `app.tsx` (Layout Route)
- Wraps all `/app/*` routes
- Provides App Bridge context
- Renders navigation menu
- Error boundary

#### `webhooks.*.tsx` (Webhook Routes)
- `webhooks.app.uninstalled.tsx`: Cleans up sessions on app uninstall
- `webhooks.app.scopes_update.tsx`: Updates session scopes

#### `auth.*.tsx` (Auth Routes)
- `auth.login/route.tsx`: Login page with shop input
- `auth.$.tsx`: OAuth callback handler

**Technology**:
- React Router 7 (file-based routing)
- Server-side rendering (SSR)
- Polaris Web Components (UI)
- React 18 hooks (useState, useEffect, etc.)

---

### 2. Business Logic Layer

**Location**: `app/services/`

**Responsibilities**:
- Implement core business logic
- Integrate with external APIs
- Handle error recovery and fallbacks
- Validate and transform data

**Key Services**:

#### `ai.server.ts` - AIService
**Purpose**: Generate Liquid sections using Google Gemini AI

**Methods**:
- `generateSection(prompt: string): Promise<string>`
  - Validates GEMINI_API_KEY exists
  - Sends prompt to Gemini with system instruction
  - Returns generated Liquid code
  - Falls back to mock on error

**Implementation Details**:
- Uses `@google/generative-ai` SDK
- Model: `gemini-2.0-flash-exp`
- System prompt enforces Liquid structure (schema + style + markup)
- Graceful degradation with mock response

**Error Handling**:
- Logs warnings if API key missing
- Catches API errors and returns fallback
- Always returns valid Liquid code structure

#### `theme.server.ts` - ThemeService
**Purpose**: Interact with Shopify themes via GraphQL

**Methods**:
- `getThemes(request: Request): Promise<Theme[]>`
  - Authenticates request
  - Queries Shopify for merchant themes
  - Returns array of { id, name, role }

- `createSection(request, themeId, fileName, content): Promise<FileMetadata>`
  - Authenticates request
  - Validates and normalizes filename
  - Calls `themeFilesUpsert` mutation
  - Checks for GraphQL userErrors
  - Returns file metadata or throws error

**Implementation Details**:
- Uses Shopify Admin GraphQL API
- Authenticates via `authenticate.admin(request)`
- Handles GraphQL response structure
- Filename normalization (adds `sections/`, `.liquid`)

---

### 3. Data Access Layer

**Location**: `app/db.server.ts`, `prisma/schema.prisma`

**Responsibilities**:
- Database connection management
- Data persistence
- Schema migrations
- Query execution

**Technology**: Prisma ORM

**Database Models**:

#### Session
```prisma
model Session {
  id            String    @id
  shop          String
  state         String
  isOnline      Boolean   @default(false)
  scope         String?
  expires       DateTime?
  accessToken   String
  userId        BigInt?
  firstName     String?
  lastName      String?
  email         String?
  accountOwner  Boolean   @default(false)
  locale        String?
  collaborator  Boolean?  @default(false)
  emailVerified Boolean?  @default(false)
}
```

**Usage**:
- Stores Shopify OAuth sessions (online and offline)
- Accessed by Shopify session storage adapter
- Updated on scope changes
- Deleted on app uninstall

#### GeneratedSection
```prisma
model GeneratedSection {
  id        String   @id @default(uuid())
  shop      String
  prompt    String
  content   String
  createdAt DateTime @default(now())
}
```

**Usage**:
- Historical record of generated sections
- Currently unused in UI (future feature: history viewer)
- Could be used for analytics

**Database Configuration**:
- **Development**: SQLite (`dev.sqlite`)
- **Production**: PostgreSQL or MySQL (configurable via DATABASE_URL)

**Prisma Client**:
```typescript
// Singleton pattern for hot reload support
declare global {
  var prismaGlobal: PrismaClient;
}

const prisma = global.prismaGlobal ?? new PrismaClient();
export default prisma;
```

---

### 4. Integration Layer

#### Shopify Integration

**Configuration**: `app/shopify.server.ts`

```typescript
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: ApiVersion.October25,
  scopes: ["write_products", "write_themes", "read_themes"],
  appUrl: process.env.SHOPIFY_APP_URL,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
});
```

**Authentication Flow**:
1. Merchant visits app URL
2. Redirects to `/auth/login` if not authenticated
3. OAuth flow initiated via `login(request)`
4. Shopify OAuth consent screen
5. Callback to `/auth/*` with code
6. Exchange code for access token
7. Store session in database
8. Redirect to `/app` (embedded in Shopify admin)

**Session Management**:
- Sessions stored in database via Prisma adapter
- Supports online and offline tokens
- Automatic token refresh
- Session cleanup on uninstall

**GraphQL API**:
- Version: October 2025 (2025-10)
- Authentication: Bearer token from session
- Rate limiting: Shopify Admin API bucket (40 requests/sec)

**Webhooks**:
- `app/uninstalled`: Triggers cleanup
- `app/scopes_update`: Updates session scopes
- Registered in `shopify.app.toml`
- Version: 2026-01

#### Google Gemini Integration

**SDK**: `@google/generative-ai` v0.24.1

**Configuration**:
```typescript
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: SYSTEM_PROMPT
});
```

**System Prompt**:
- Enforces Liquid section structure
- Defines CSS scoping rules
- Sets best practices (responsive, semantic HTML, accessibility)
- Specifies output format (no markdown blocks)

**API Call**:
```typescript
const result = await model.generateContent(prompt);
const text = result.response.text();
```

**Error Handling**:
- Fallback to mock response on API error
- Logs errors for debugging
- Never returns empty response

---

## Data Flow Diagrams

### AI Section Generation Flow

```
┌─────────────┐
│   Merchant  │
│  enters     │
│  prompt     │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ app.generate.tsx     │
│ action(generate)     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ AIService            │
│ generateSection()    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Google Gemini API    │
│ gemini-2.0-flash-exp │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Generated Liquid     │
│ Code (string)        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Action returns       │
│ { code, prompt }     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ UI displays code     │
│ in preview area      │
└──────────────────────┘
```

### Theme Save Flow

```
┌─────────────┐
│  Merchant   │
│  selects    │
│  theme &    │
│  filename   │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ app.generate.tsx     │
│ action(save)         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ ThemeService         │
│ createSection()      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Normalize filename   │
│ (sections/*.liquid)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Shopify Admin API    │
│ themeFilesUpsert     │
│ mutation             │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Check userErrors     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Return success/error │
│ to action            │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Display banner with  │
│ feedback message     │
└──────────────────────┘
```

### Authentication Flow

```
┌─────────────┐
│  Merchant   │
│  visits app │
│  URL        │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ Shopify redirects    │
│ to app URL           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Check session exists │
└──────┬───────────────┘
       │
       │ No session
       ▼
┌──────────────────────┐
│ Redirect to          │
│ /auth/login          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Merchant enters      │
│ shop domain          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ login(request)       │
│ initiates OAuth      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Shopify OAuth        │
│ consent screen       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Merchant approves    │
│ scopes               │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Callback to /auth/*  │
│ with auth code       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Exchange code for    │
│ access token         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Store session in DB  │
│ via Prisma           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Redirect to /app     │
│ (embedded)           │
└──────────────────────┘
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────┐
│  Local Machine                      │
│  ┌───────────────────────────────┐ │
│  │  React Router Dev Server      │ │
│  │  (Vite)                       │ │
│  │  Port: 3000                   │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  SQLite Database              │ │
│  │  File: dev.sqlite             │ │
│  └───────────────────────────────┘ │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Cloudflare Tunnel                  │
│  (Shopify CLI)                      │
│  HTTPS: *.cloudflare.com            │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Shopify Admin (Development Store)  │
│  Embeds app in iframe               │
└─────────────────────────────────────┘
```

### Production Environment (Recommended)

```
┌──────────────────────────────────────────────────┐
│  Load Balancer (HTTPS)                           │
│  - SSL Termination                               │
│  - Health checks                                 │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  Application Servers (Horizontal Scaling)        │
│  ┌────────────────┐  ┌────────────────┐         │
│  │  React Router  │  │  React Router  │  ...    │
│  │  Server        │  │  Server        │         │
│  │  Instance 1    │  │  Instance 2    │         │
│  └────────────────┘  └────────────────┘         │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  PostgreSQL / MySQL (Managed Database)           │
│  - Session table                                 │
│  - GeneratedSection table                        │
│  - Connection pooling                            │
└──────────────────────────────────────────────────┘
```

**Recommended Hosting Platforms**:
1. **Google Cloud Run**: Serverless, auto-scaling, built-in load balancing
2. **Fly.io**: Edge hosting, fast global deployment
3. **Render**: Managed containers, auto-scaling, integrated DB

---

## Security Architecture

### Authentication & Authorization

**OAuth 2.0 Flow**:
- Shopify handles authentication
- App receives access token
- Token stored in database (encrypted by Prisma)
- Token used for all API calls

**Scope-Based Authorization**:
- `read_themes`: View theme files
- `write_themes`: Create/update theme files
- `write_products`: Demo feature (can be removed)

**Session Security**:
- HttpOnly cookies (App Bridge handles)
- CSRF protection (App Bridge provides)
- Token expiration handling
- Automatic token refresh

### Data Security

**API Keys**:
- Stored in environment variables
- Never committed to repository
- Rotated regularly in production

**Database Security**:
- Connection strings in environment variables
- SSL/TLS for production database connections
- Row-level security (future enhancement)

**Input Validation**:
- Prompt length limits (future enhancement)
- Filename sanitization (implemented)
- GraphQL injection prevention (Shopify handles)

### Network Security

**HTTPS**:
- Required by Shopify for embedded apps
- SSL certificates managed by hosting provider
- Cloudflare tunnel in development

**CORS**:
- Configured for Shopify admin origins
- App Bridge handles cross-origin communication

**Rate Limiting**:
- Shopify Admin API: 40 requests/sec
- Gemini API: Per-project quota
- App-level rate limiting (future enhancement)

---

## Scalability Considerations

### Horizontal Scaling

**Stateless Design**:
- No in-memory state
- All state in database or client
- Can deploy multiple instances

**Database Connection Pooling**:
```typescript
// Prisma supports connection pooling
// Configure in DATABASE_URL
// postgresql://user:pass@host/db?connection_limit=10
```

**Load Balancing**:
- Round-robin or least-connections
- Health check endpoint (future)
- Session affinity not required

### Performance Optimization

**Caching Strategy** (Future):
- Cache theme list (TTL: 5 minutes)
- Cache generated sections (per prompt hash)
- Use Redis for distributed caching

**Database Optimization**:
- Indexes on frequently queried fields (shop, createdAt)
- Prepared statements (Prisma provides)
- Connection pooling

**API Optimization**:
- Batch GraphQL queries when possible
- Use dataloader pattern for N+1 prevention (future)
- Implement retry logic with exponential backoff

### Monitoring & Observability

**Logging** (Future):
- Structured logging (JSON format)
- Log levels (debug, info, warn, error)
- Request ID tracing

**Metrics** (Future):
- API response times
- Generation success rate
- Database query performance
- Error rates

**Alerting** (Future):
- High error rate alerts
- API downtime alerts
- Database connection failures

---

## Technology Stack Summary

### Frontend
- **UI Framework**: React 18.3
- **Routing**: React Router 7.9
- **Component Library**: Polaris Web Components
- **State Management**: React hooks (useState, useEffect)
- **Form Handling**: React Router useSubmit, FormData

### Backend
- **Runtime**: Node.js >= 20.19
- **Framework**: React Router 7 (SSR)
- **Language**: TypeScript 5.9
- **Build Tool**: Vite 6.3

### Database
- **ORM**: Prisma 6.16
- **Development**: SQLite
- **Production**: PostgreSQL or MySQL (recommended)

### External APIs
- **Shopify Admin API**: GraphQL (October 2025)
- **Google Gemini API**: gemini-2.0-flash-exp model

### DevOps
- **Version Control**: Git
- **CI/CD**: Not configured (future)
- **Hosting**: Configurable (Google Cloud Run, Fly.io, Render)
- **Monitoring**: Not configured (future)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-24
**Architecture Status**: Current Implementation
