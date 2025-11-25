# Codebase Summary

## Overview

AI Section Generator is a Shopify embedded app built with React Router 7, Prisma, and Google Gemini AI. The app enables merchants to generate custom Liquid theme sections via natural language prompts and save them directly to their Shopify themes.

**Total Files**: 34 files
**Total Tokens**: 15,944 tokens
**Lines of Code**: ~2,015 lines (excluding migrations, config)

## Directory Structure

```
ai-section-generator/
├── app/                          # Application code
│   ├── routes/                   # React Router file-based routes
│   │   ├── _index/               # Landing page
│   │   ├── auth.login/           # Login page
│   │   ├── app._index.tsx        # Home page (template demo)
│   │   ├── app.generate.tsx      # AI section generator (CORE FEATURE)
│   │   ├── app.additional.tsx    # Additional demo page
│   │   ├── app.tsx               # App layout with navigation
│   │   ├── auth.$.tsx            # Catch-all auth route
│   │   └── webhooks.*.tsx        # Webhook handlers
│   ├── services/                 # Business logic layer
│   │   ├── ai.server.ts          # Google Gemini integration
│   │   └── theme.server.ts       # Shopify theme operations
│   ├── shopify.server.ts         # Shopify app configuration
│   ├── db.server.ts              # Prisma client instance
│   ├── entry.server.tsx          # Server entry point
│   ├── root.tsx                  # HTML root component
│   ├── routes.ts                 # Route configuration
│   └── globals.d.ts              # TypeScript global declarations
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # Prisma schema
│   └── migrations/               # Database migrations
├── docs/                         # Documentation (this folder)
├── .claude/                      # Claude Code workflows
├── shopify.app.toml              # Shopify app configuration
├── shopify.web.toml              # Shopify web component config
├── vite.config.ts                # Vite build configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
├── .graphqlrc.ts                 # GraphQL config
└── .mcp.json                     # Model Context Protocol config
```

## Key Files Analysis

### Core Application Routes

#### `/app/routes/app.generate.tsx` (1,349 tokens, 182 lines)
**Purpose**: Main AI section generator interface
**Key Features**:
- Prompt input form with multiline text field
- Theme selection dropdown (fetches via loader)
- Section filename input (auto-appends .liquid)
- Generate button (calls AI service)
- Code preview area (displays generated Liquid)
- Save button (saves to selected theme)
- Success/error banner feedback
- Loading states for async operations

**Data Flow**:
1. **Loader**: Fetches merchant themes via `themeService.getThemes()`
2. **Action (generate)**: Sends prompt to `aiService.generateSection()`
3. **Action (save)**: Calls `themeService.createSection()` with themeId, filename, content
4. **UI**: React component with Polaris web components

**Notable Implementation Details**:
- Uses `@ts-nocheck` (needs type definitions for Polaris web components)
- Defaults to active (MAIN) theme
- Validates filename (adds sections/ prefix, .liquid suffix)
- Handles action data for success/error feedback
- Navigation state for loading indicators

#### `/app/routes/app._index.tsx` (1,637 tokens, 255 lines)
**Purpose**: Template demo page (Shopify app starter)
**Features**:
- Product creation demo with GraphQL mutations
- Shows productCreate and productVariantsBulkUpdate
- App specs sidebar (framework, DB, API info)
- Next steps links

**Note**: This is template boilerplate; can be customized or removed for production.

#### `/app/routes/app.tsx` (40 lines)
**Purpose**: App layout wrapper with navigation
**Features**:
- App Bridge provider with API key
- Navigation menu (`<ui-nav-menu>`)
  - Home
  - Additional page
  - Generate Section (core feature link)
- Outlet for child routes
- Error boundary with Shopify boundary helpers

#### `/app/routes/webhooks.app.uninstalled.tsx` (23 lines)
**Purpose**: Handle app uninstallation
**Action**:
- Receives webhook via `authenticate.webhook()`
- Deletes all sessions for shop from database
- Returns empty response

#### `/app/routes/webhooks.app.scopes_update.tsx` (21 lines)
**Purpose**: Handle scope updates
**Action**:
- Updates session scope when merchant grants/revokes permissions
- Fetches session by ID and updates scope field

### Business Logic Services

#### `/app/services/ai.server.ts` (801 tokens, 128 lines)
**Purpose**: Google Gemini AI integration for Liquid section generation
**Key Components**:

1. **SYSTEM_PROMPT** (lines 3-43):
   - Comprehensive system instruction for Gemini
   - Enforces Liquid section structure (schema + style + markup)
   - CSS scoping rules (#shopify-section-{{ section.id }})
   - Best practices (responsive, semantic HTML, translations)
   - Output format requirements (no markdown blocks)

2. **AIService Class**:
   - **Constructor**: Initializes GoogleGenerativeAI if GEMINI_API_KEY set
   - **generateSection(prompt)**:
     - Uses gemini-2.0-flash-exp model
     - Sends prompt with system instruction
     - Returns trimmed response text
     - Falls back to getMockSection() on error
   - **getMockSection(prompt)**: Returns basic demo Liquid section

**Error Handling**:
- Logs warnings if API key missing
- Catches Gemini API errors and falls back gracefully
- Always returns valid Liquid code structure

#### `/app/services/theme.server.ts` (74 lines)
**Purpose**: Shopify theme operations via GraphQL
**Key Components**:

1. **ThemeService Class**:
   - **getThemes(request)**:
     - Queries themes (first 10)
     - Returns array of { id, name, role }

   - **createSection(request, themeId, fileName, content)**:
     - Validates filename (adds sections/ prefix, .liquid suffix)
     - Uses themeFilesUpsert mutation
     - Passes TEXT body type with content
     - Checks for userErrors in response
     - Throws Error with error messages if save fails
     - Returns upserted file metadata on success

**GraphQL Usage**:
- Uses Admin API via authenticated admin client
- Handles GraphQL response structure with data/errors
- Properly formats variables for mutations

### Core Configuration

#### `/app/shopify.server.ts` (32 lines)
**Purpose**: Shopify app initialization and exports
**Configuration**:
- API version: October 2025
- Scopes: write_products, write_themes, read_themes
- Session storage: Prisma (SQLite dev, configurable for production)
- Distribution: AppStore
- Auth path prefix: /auth
- Custom shop domains support

**Exports**:
- `authenticate`: OAuth authentication
- `login`: Login handler
- `sessionStorage`: Session management
- `registerWebhooks`: Webhook registration
- Other Shopify utilities

#### `/app/db.server.ts` (18 lines)
**Purpose**: Prisma client singleton
**Implementation**:
- Global prisma instance for dev (hot reload support)
- New instance for production
- Prevents multiple client instances in dev mode

### Database Schema

#### `/prisma/schema.prisma` (41 lines)

**Session Model**:
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
Stores Shopify OAuth sessions with user metadata.

**GeneratedSection Model**:
```prisma
model GeneratedSection {
  id        String   @id @default(uuid())
  shop      String
  prompt    String
  content   String
  createdAt DateTime @default(now())
}
```
Historical record of generated sections (currently unused in UI).

**Migrations**:
- `20240530213853_create_session_table`: Initial Session table
- `20251121041941_add_generated_section`: Added GeneratedSection table

### Configuration Files

#### `shopify.app.toml`
**Key Settings**:
- `client_id`: 7ecb57c3cbe103bb659936a2841c60b4
- `name`: AI Section generator
- `embedded`: true (runs in Shopify admin iframe)
- `scopes`: write_products, write_themes, read_themes
- `webhooks.api_version`: 2026-01
- Webhook subscriptions: app/uninstalled, app/scopes_update

#### `package.json`
**Key Dependencies**:
- `@google/generative-ai`: ^0.24.1 (Gemini SDK)
- `@shopify/shopify-app-react-router`: ^1.0.0
- `@shopify/shopify-app-session-storage-prisma`: ^7.0.0
- `@prisma/client`: ^6.16.3
- `react-router`: ^7.9.3
- `react`: ^18.3.1

**Scripts**:
- `dev`: shopify app dev (runs Shopify CLI)
- `build`: react-router build
- `setup`: prisma generate && migrate deploy
- `start`: react-router-serve ./build/server/index.js

#### `vite.config.ts`
**Configuration**:
- React Router plugin with SSR
- TSConfig paths resolver
- Dev server on port 3000 (configurable)
- HMR config for localhost and remote (Cloudflare tunnel)
- Allowed hosts: SHOPIFY_APP_URL hostname
- CORS: preflight continue
- Asset inline limit: 0 (prevent inlining)

### UI Components

#### Polaris Web Components
Used throughout the app (declared in `app/globals.d.ts`):
- `<s-page>`: Page container
- `<s-layout>`, `<s-layout-section>`: Layout system
- `<s-card>`: Card container
- `<s-stack>`: Flexbox stack
- `<s-text>`, `<s-text-field>`: Text components
- `<s-button>`: Button with loading state
- `<s-banner>`: Alert/notification banners
- `<s-box>`: Styled box container
- `<s-select>`, `<s-option>`: Dropdown select
- `<ui-nav-menu>`: App navigation menu

These are Shopify's custom web components that match Polaris design system.

## Data Flow

### AI Section Generation Flow

```
User Input (Prompt)
  ↓
[app.generate.tsx] action (action=generate)
  ↓
[services/ai.server.ts] generateSection(prompt)
  ↓
Google Gemini API (gemini-2.0-flash-exp + SYSTEM_PROMPT)
  ↓
Generated Liquid Code (schema + style + markup)
  ↓
[app.generate.tsx] actionData { code, prompt }
  ↓
UI: Display in <pre> block for preview
```

### Theme Save Flow

```
User: Select Theme + Enter Filename + Click Save
  ↓
[app.generate.tsx] action (action=save)
  ↓
[services/theme.server.ts] createSection(request, themeId, fileName, content)
  ↓
Validate filename (add sections/, .liquid)
  ↓
Shopify Admin API: themeFilesUpsert mutation
  ↓
Check response.data.themeFilesUpsert.userErrors
  ↓
[Success] Return { success: true, message }
[Error] Return { success: false, message }
  ↓
UI: Display <s-banner> with result
```

### Authentication Flow

```
Merchant visits app URL
  ↓
[auth.login/route.tsx] or redirect to /auth/login
  ↓
[shopify.server.ts] login() initiates OAuth
  ↓
Shopify OAuth consent screen
  ↓
Merchant approves
  ↓
[auth.$.tsx] handles callback
  ↓
[shopify.server.ts] authenticate.admin()
  ↓
Session stored in database via Prisma
  ↓
Redirect to /app (embedded in Shopify admin)
```

## Code Quality Observations

### Strengths
- Clear separation of concerns (routes, services, config)
- Service layer abstracts Shopify and AI operations
- Comprehensive error handling with user feedback
- Fallback mechanisms (mock AI responses)
- Type-safe with TypeScript
- Database schema properly indexed
- Webhook handlers for lifecycle events
- Follows Shopify app best practices

### Areas for Improvement
1. **Type Safety**: app.generate.tsx uses `@ts-nocheck` and `any` types
2. **GeneratedSection Model**: Created but never used (save/retrieve history)
3. **Testing**: No test files present
4. **Validation**: Limited input validation on prompts/filenames
5. **Rate Limiting**: No rate limit handling for Gemini or Shopify APIs
6. **Logging**: Basic console.log, needs structured logging for production
7. **Analytics**: No tracking of generation success/quality metrics
8. **Code Documentation**: Limited JSDoc comments

## Dependencies

### Production Dependencies (12)
- `@google/generative-ai`: Google Gemini SDK
- `@prisma/client`: Database ORM client
- `@react-router/*`: React Router v7 packages (dev, fs-routes, node, serve)
- `@shopify/app-bridge-react`: App Bridge for embedded apps
- `@shopify/polaris`: Polaris component library
- `@shopify/shopify-app-react-router`: Shopify app framework
- `@shopify/shopify-app-session-storage-prisma`: Prisma session storage adapter
- `isbot`: Bot detection
- `prisma`: Prisma CLI
- `react`, `react-dom`: React 18
- `react-router`: Router core
- `vite-tsconfig-paths`: Vite path resolver

### Dev Dependencies (15)
- TypeScript tooling (typescript, @types/*)
- ESLint and plugins
- Shopify codegen preset
- GraphQL config
- Prettier
- Vite

## Environment Variables

Required:
- `SHOPIFY_API_KEY`: Shopify app API key
- `SHOPIFY_API_SECRET`: Shopify app secret
- `SHOPIFY_APP_URL`: App URL (auto-set by CLI)
- `SCOPES`: Comma-separated scopes (auto-set by CLI)

Optional:
- `GEMINI_API_KEY`: Google AI Studio API key (falls back to mock if missing)
- `SHOP_CUSTOM_DOMAIN`: Custom shop domain for development
- `NODE_ENV`: production/development

## API Integrations

### Shopify Admin GraphQL API
- **Version**: 2025-10 (October 2025)
- **Authentication**: OAuth 2.0 with session tokens
- **Queries Used**:
  - `themes`: Fetch merchant themes
  - `products`: Demo query in app._index.tsx
- **Mutations Used**:
  - `themeFilesUpsert`: Save/update theme files
  - `productCreate`, `productVariantsBulkUpdate`: Demo mutations

### Google Gemini API
- **Model**: gemini-2.0-flash-exp
- **Authentication**: API key (GEMINI_API_KEY)
- **Method**: generateContent(prompt) with systemInstruction
- **Input**: Natural language prompt
- **Output**: Structured Liquid section code

## Security Considerations

### Current Implementation
- ✅ OAuth 2.0 authentication via Shopify
- ✅ Session tokens stored in database (encrypted by Prisma/DB)
- ✅ API keys in environment variables (not committed)
- ✅ HTTPS enforced (Shopify requirement)
- ✅ Embedded app security (iframe sandbox)
- ✅ GraphQL query/mutation authentication

### Needs Attention
- ⚠️ Input sanitization on prompts (injection risk)
- ⚠️ Rate limiting on generation endpoint
- ⚠️ CSRF protection (App Bridge provides some)
- ⚠️ Content Security Policy headers
- ⚠️ SQL injection protection (Prisma handles this)

## Performance Characteristics

### Measured Performance (from repomix)
- **Largest Files**:
  1. README.md (3,017 tokens)
  2. app/routes/app._index.tsx (1,637 tokens)
  3. CHANGELOG.md (1,467 tokens)
  4. app/routes/app.generate.tsx (1,349 tokens)
  5. app/services/ai.server.ts (801 tokens)

### Expected Runtime Performance
- **AI Generation**: 3-10s (Gemini API latency)
- **Theme Fetch**: <1s (GraphQL query)
- **Theme Save**: 1-3s (GraphQL mutation)
- **Page Load**: <1s (server-side rendering)

### Scalability Notes
- SQLite single-instance limit (requires PostgreSQL/MySQL for multi-instance)
- No caching layer (all requests hit DB/API)
- Stateless app design (scales horizontally with proper DB)

## Deployment Considerations

### Current State: Development
- SQLite database (`dev.sqlite`)
- Local dev server via Shopify CLI
- Cloudflare tunnel for public access
- No production hosting configured

### Production Requirements
- Migrate to PostgreSQL or MySQL
- Configure production DATABASE_URL
- Set NODE_ENV=production
- Run `prisma migrate deploy`
- Deploy to hosting provider (Google Cloud Run, Fly.io, Render)
- Configure environment variables on host
- Enable HTTPS with valid cert
- Update shopify.app.toml with production URLs

---

**Document Version**: 1.0
**Last Updated**: 2025-11-24
**Codebase Size**: 15,944 tokens across 34 files
**Primary Language**: TypeScript (TSX)
