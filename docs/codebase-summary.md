# Codebase Summary

## Overview

AI Section Generator is a Shopify embedded app built with React Router 7, Prisma, and Google Gemini AI. The app enables merchants to generate custom Liquid theme sections via natural language prompts and save them directly to their Shopify themes.

**Total Files**: 90+ files (routes: 17, services: 15, components: 60+, types: 4)
**Total Tokens**: ~18,500 tokens (estimated)
**Lines of Code**: ~2,500+ lines (excluding migrations, config)
**Architecture**: Clean service layer with adapter pattern, singleton pattern, comprehensive billing system, multi-tenant support

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
│   ├── components/               # UI component library (NEW in Phase 04)
│   │   ├── shared/               # Reusable shared components
│   │   │   ├── Button.tsx        # Button wrapper
│   │   │   ├── Card.tsx          # Card container wrapper
│   │   │   └── Banner.tsx        # Banners (Base, Success, Error)
│   │   ├── generate/             # Feature-specific components
│   │   │   ├── PromptInput.tsx   # Prompt input field
│   │   │   ├── ThemeSelector.tsx # Theme dropdown selector
│   │   │   ├── CodePreview.tsx   # Generated code display
│   │   │   ├── SectionNameInput.tsx # Filename input
│   │   │   └── GenerateActions.tsx  # Generate/Save buttons
│   │   ├── ServiceModeIndicator.tsx # Debug mode indicator
│   │   └── index.ts              # Barrel export file
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

### UI Component Library (Phase 04)

The application follows a component-based architecture introduced in Phase 04, extracting reusable UI elements from route files into dedicated components.

#### Component Organization

**Structure**:
```
app/components/
├── shared/          # Reusable components across features
│   ├── Button.tsx   # Button wrapper with loading states
│   ├── Card.tsx     # Card container wrapper
│   └── Banner.tsx   # Banner variants (Success, Error)
├── generate/        # Feature-specific components
│   ├── PromptInput.tsx      # Multiline prompt input
│   ├── ThemeSelector.tsx    # Theme dropdown
│   ├── CodePreview.tsx      # Code display with syntax
│   ├── SectionNameInput.tsx # Filename input with .liquid suffix
│   └── GenerateActions.tsx  # Generate/Save buttons
├── ServiceModeIndicator.tsx # Debug mode indicator
└── index.ts                 # Barrel export (9 components + types)
```

#### Shared Components

**`shared/Button.tsx`** (42 lines)
- Wrapper for Polaris `<s-button>` web component
- Props: variant, size, loading, disabled, onClick, submit, fullWidth
- Type-safe interface with TypeScript
- Supports all Polaris button variants (primary, secondary, plain, destructive)

**`shared/Card.tsx`** (20 lines)
- Wrapper for Polaris `<s-section>` web component
- Props: title, children, sectioned
- Provides consistent card layout

**`shared/Banner.tsx`** (57 lines)
- Base `Banner` component with tone variants (info, success, warning, critical)
- Pre-configured `SuccessBanner` for success messages
- Pre-configured `ErrorBanner` for error messages
- Props: tone, heading, dismissible, onDismiss, children

#### Generate Feature Components

**`generate/PromptInput.tsx`** (40 lines)
- Multiline text input for section descriptions
- Props: value, onChange, placeholder, helpText, error, disabled
- Default placeholder with example prompt
- Validation error display support

**`generate/ThemeSelector.tsx`** (39 lines)
- Dropdown selector for merchant themes
- Props: themes, selectedThemeId, onChange, disabled
- Displays theme name and role (MAIN, UNPUBLISHED, etc.)
- Type-safe with Theme interface

**`generate/CodePreview.tsx`** (35 lines)
- Displays generated Liquid code in formatted pre block
- Props: code, maxHeight
- Scrollable container with syntax styling
- Uses Polaris `<s-box>` for consistent styling
- Monospace font (Monaco, Courier) for code readability

**`generate/SectionNameInput.tsx`** (34 lines)
- Text input for section filename
- Props: value, onChange, error, disabled
- Automatically shows `.liquid` suffix
- Validation error display support

**`generate/GenerateActions.tsx`** (49 lines)
- Action buttons for generate and save operations
- Props: onGenerate, onSave, isGenerating, isSaving, canSave, generateButtonText, saveButtonText
- Conditional rendering (Save button only shows when code is generated)
- Loading states for both buttons
- Mutual exclusion (can't generate while saving, vice versa)

#### Barrel Export (`index.ts`)

Provides centralized imports for all components and their TypeScript types:

```typescript
// Usage in routes
import {
  PromptInput,
  ThemeSelector,
  CodePreview,
  SectionNameInput,
  GenerateActions,
  SuccessBanner,
  ErrorBanner
} from "../components";
```

**Benefits**:
- Single import source for all components
- Clean import statements in route files
- Automatic type exports
- Easier refactoring and reorganization

#### Component Design Principles

1. **Pure Presentation**: Components handle only UI rendering, no business logic
2. **Fully Typed**: All props defined with TypeScript interfaces
3. **Small & Focused**: Each component under 200 lines
4. **Composable**: Components can be combined to build complex UIs
5. **Testable**: Pure functions make testing straightforward
6. **Consistent**: All components follow same patterns and conventions

#### Benefits Achieved in Phase 04

- **Code Reusability**: Components can be used across multiple routes
- **Separation of Concerns**: Clear boundary between UI and business logic
- **Easier Testing**: Components can be tested in isolation
- **Reduced Complexity**: Route files focus on data flow, not UI details
- **Scalability**: New features can reuse existing components
- **Maintainability**: Changes to UI components don't affect route logic
- **Type Safety**: TypeScript interfaces prevent prop errors

### Core Application Routes

#### `/app/routes/app.generate.tsx` (189 lines, refactored in Phase 04)
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
1. **Loader**: Fetches merchant themes via `themeAdapter.getThemes()`
2. **Action (generate)**: Sends prompt to `aiAdapter.generateSection()`
3. **Action (save)**: Calls `themeAdapter.createSection()` with themeId, filename, content
4. **UI**: React component using extracted components from `app/components/`

**Phase 04 Refactoring**:
- Extracted all UI elements into reusable components
- Reduced route file complexity from 182 to 189 lines (cleaner structure)
- Improved separation of concerns (presentation vs logic)
- Centralized imports via barrel export (`app/components/index.ts`)
- All components fully typed with TypeScript interfaces
- Components are now testable in isolation

#### `/app/routes/app.sections.new.tsx` (427 lines)
**Purpose**: Create new AI-generated section with two-action save flow
**Key Features**:
- Prompt input, section name, advanced options (tone, style, section type)
- Generate button (AI generation without DB save)
- Live code/preview toggle for generated Liquid
- Side-by-side action buttons: "Save Draft" + "Publish to Theme"
- Theme selector (required for publish, optional for draft)
- Filename input (required for publish, optional for draft)
- Save as Template modal
- Success/error banners with recovery guidance
- Auto-redirect to edit page after successful save

**Actions**:
1. **generate**: Calls `aiAdapter.generateSection()`, returns code only (no DB save)
2. **saveDraft**: Creates section with status="draft" (no theme required)
3. **save**: Publishes to theme (saves to Shopify + DB with status="saved")
4. **saveAsTemplate**: Saves prompt/code as reusable template

**Data Flow**:
1. **Loader**: Fetches merchant themes via `themeAdapter.getThemes()`
2. **Action (generate)**: Returns { code, prompt, name?, tone?, style? }
3. **Action (saveDraft)**: Creates section in DB, redirects to /app/sections/{id}
4. **Action (save)**: Publishes to theme, creates section in DB, redirects
5. **UI**: Displays code, shows appropriate feedback messages, redirects on success

**Component Used**: `GeneratePreviewColumn` with dual-action buttons

#### `/app/routes/app.sections.$id.tsx` (586 lines)
**Purpose**: Edit existing section with regenerate + dual-save capabilities
**Key Features**:
- Display existing section metadata (created date, status badge, theme info)
- Edit prompt to regenerate code
- Regeneration notification banner ("New section created...")
- Same dual-action save buttons as create page: "Save Draft" + "Publish to Theme"
- Delete button with confirmation modal
- Name editing (auto-saves on blur)
- Theme selector (uses original theme if saved)
- Save as Template modal
- Status badge: "Draft" (neutral) or "Saved" (success)

**Actions**:
1. **generate**: Regenerates code, returns updated code
2. **saveDraft**: Updates section to status="draft" with new code
3. **save**: Publishes updated code to theme
4. **updateName**: Auto-saves section name on blur
5. **delete**: Deletes section with confirmation
6. **saveAsTemplate**: Saves as template

**Data Flow**:
1. **Loader**: Fetches section by ID + merchant themes
2. **Action (generate)**: Regenerates without affecting existing section
3. **Action (saveDraft)**: Updates section code, keeps as draft
4. **Action (save)**: Updates section code + theme info, publishes to theme
5. **UI**: Displays section info banner, allows editing and re-publishing

**Component Used**: Same `GeneratePreviewColumn` as create page

**Error Boundary**: Custom error page for 404/missing sections

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

#### Billing Service (`app/services/billing.server.ts`)

**Purpose**: Shopify subscription billing management (hybrid: base recurring + usage overages)

**Key Functions**:
- `createSubscription()`: Creates hybrid subscription (recurring + usage)
- `changeSubscription()`: Upgrade/downgrade flow (cancel old + create new)
- `updateSubscriptionStatus()`: Webhook handler updates (status + period end)
- `fetchCurrentPeriodEnd()`: GraphQL fallback for missing webhook data
- `recordUsage()`: Track usage charges (overages)
- `checkQuota()`: Verify quota before generation

**Critical Fixes (251202)**:
1. **Webhook Type Safety**: Optional `current_period_end` field handling
2. **GraphQL Fallback**: Query Shopify when webhook data incomplete
3. **Pending Subscription Upgrade**: Reconcile pending → active on webhook
4. **Status Normalization**: Case-insensitive status comparison
5. **Error Context**: Enhanced logging with shop/subscriptionId/status

**Webhook Flow** (`app/routes/webhooks.app.subscriptions_update.tsx`):
```
1. Authenticate webhook (HMAC validation)
2. Extract payload (subscriptionId, status, currentPeriodEnd?)
3. Handle optional currentPeriodEnd:
   - IF present: Use webhook value
   - IF missing + active: Query Shopify GraphQL
   - Store as Date | undefined (safe)
4. Database lookup by shopifySubId
5. Pending subscription handler (upgrade scenario):
   - Find pending by shop + status=pending
   - Update with real shopifySubId from Shopify
   - Activate + reset usage counters
6. Update status + period end in DB
```

**Upgrade Flow Fix**:
- Problem: New subscription ID not in DB when webhook arrives
- Solution: Find pending subscription by shop, update with real ID
- Handles two-phase activation (create → approve → activate)

#### Service Architecture (Adapter Pattern)

The application uses an **adapter pattern** to switch between mock and real service implementations based on feature flags. This enables development and testing without external API dependencies.

**Service Layer Components**:
- **Real Services**: `ai.server.ts`, `theme.server.ts` (production implementations)
- **Mock Services**: `mocks/mock-ai.server.ts`, `mocks/mock-theme.server.ts` (test/dev implementations)
- **Adapters**: `adapters/ai-adapter.ts`, `adapters/theme-adapter.ts` (routing layer)
- **Configuration**: `config.server.ts` (determines which implementation to use)
- **Feature Flags**: `flags/feature-flags.ts`, `flags/flag-utils.ts` (flag definitions and management)

#### `/app/services/adapters/ai-adapter.ts` & `/app/services/adapters/theme-adapter.ts`
**Purpose**: Route service calls to mock or real implementations

**Pattern**:
```typescript
class AIAdapter implements AIServiceInterface {
  private service: AIServiceInterface;

  constructor() {
    this.service = serviceConfig.aiMode === 'mock'
      ? mockAIService
      : aiService;
  }

  async generateSection(prompt: string): Promise<string> {
    return this.service.generateSection(prompt);
  }
}
```

Routes use adapters instead of services directly:
```typescript
import { aiAdapter } from "../services/adapters/ai-adapter";
import { themeAdapter } from "../services/adapters/theme-adapter";

// In action:
const code = await aiAdapter.generateSection(prompt);
const themes = await themeAdapter.getThemes(request);
```

#### `/app/services/ai.server.ts` (128 lines)
**Purpose**: Google Gemini AI integration for Liquid section generation (Real Implementation)

**Key Components**:
1. **SYSTEM_PROMPT** (lines 4-44):
   - Comprehensive system instruction for Gemini
   - Enforces Liquid section structure (schema + style + markup)
   - CSS scoping rules (#shopify-section-{{ section.id }})
   - Best practices (responsive, semantic HTML, translations)
   - Output format requirements (no markdown blocks)

2. **AIService Class**:
   - Implements `AIServiceInterface`
   - **Constructor**: Initializes GoogleGenerativeAI if GEMINI_API_KEY set
   - **generateSection(prompt)**: Uses gemini-2.0-flash-exp model
   - **getMockSection(prompt)**: Returns basic fallback Liquid section

**Error Handling**:
- Falls back to getMockSection() on API errors
- Logs warnings if API key missing
- Always returns valid Liquid code

#### `/app/services/mocks/mock-ai.server.ts` (41 lines)
**Purpose**: Mock AI service for development/testing without Gemini API

**Features**:
- Returns predefined sections for common prompts (hero, product grid)
- Generates dynamic mock sections for custom prompts
- Simulates API latency (configurable via feature flags)
- Tracks generation count via mock store
- Console logging for debugging

#### `/app/services/theme.server.ts` (91 lines)
**Purpose**: Shopify theme operations via GraphQL (Real Implementation)

**Key Components**:
1. **ThemeService Class**:
   - Implements `ThemeServiceInterface`
   - **getThemes(request)**: Queries themes (first 10) from Shopify
   - **createSection(request, themeId, fileName, content)**: Creates/updates theme files via themeFilesUpsert mutation

**Implementation Details**:
- Filename normalization (adds sections/ prefix, .liquid suffix)
- GraphQL error handling (checks userErrors)
- Returns metadata or throws Error with details

#### `/app/services/mocks/mock-theme.server.ts` (55 lines)
**Purpose**: Mock theme service for development without Shopify write_themes scope

**Features**:
- Returns predefined mock themes (Dawn, Refresh, Studio)
- Validates theme IDs before saving
- Saves sections to mock store (in-memory)
- Simulates API latency
- Filename normalization (matches real service)

#### `/app/services/config.server.ts` (76 lines)
**Purpose**: Service configuration and mode determination

**Key Functions**:
- **getThemeMode()**: Determines theme service mode (mock/real)
  - Checks `FLAG_USE_MOCK_THEMES` env var first
  - Falls back to `SERVICE_MODE` env var
  - Defaults to 'mock' (safe for development)

- **getAIMode()**: Determines AI service mode (mock/real)
  - Checks `FLAG_USE_MOCK_AI` env var first
  - Checks if `GEMINI_API_KEY` exists
  - Defaults to 'mock' if no API key

**Exported Config**:
```typescript
export const serviceConfig: ServiceConfig = {
  themeMode: getThemeMode(),
  aiMode: getAIMode(),
  enableLogging: flagManager.isEnabled(FeatureFlagKey.VERBOSE_LOGGING),
  simulateLatency: flagManager.isEnabled(FeatureFlagKey.SIMULATE_API_LATENCY),
  showModeInUI: flagManager.isEnabled(FeatureFlagKey.SHOW_SERVICE_MODE)
};
```

#### `/app/services/flags/feature-flags.ts` (81 lines)
**Purpose**: Feature flag definitions and default values

**Flag Categories**:

1. **Service Mode Flags**:
   - `USE_MOCK_THEMES`: Use mock theme service (default: true)
   - `USE_MOCK_AI`: Use mock AI service (default: false)

2. **Feature Flags** (future):
   - `ENABLE_SECTION_HISTORY`: Section generation history
   - `ENABLE_TEMPLATE_LIBRARY`: Section template library
   - `ENABLE_AI_SETTINGS`: AI model configuration UI

3. **Performance Flags**:
   - `SIMULATE_API_LATENCY`: Add delay to mock services (default: false)
   - `CACHE_THEME_LIST`: Cache theme list to reduce API calls (default: false)

4. **Debug Flags**:
   - `VERBOSE_LOGGING`: Detailed service logging (default: dev mode only)
   - `SHOW_SERVICE_MODE`: Show mode indicator in UI (default: dev mode only)

**Flag Structure**:
```typescript
export const featureFlags: Record<FeatureFlagKey, FeatureFlag> = {
  [FeatureFlagKey.USE_MOCK_THEMES]: {
    key: 'use_mock_themes',
    description: 'Use mock theme service instead of Shopify API',
    defaultValue: true
  },
  // ...
};
```

#### `/app/services/flags/flag-utils.ts` (108 lines)
**Purpose**: Feature flag management and utilities

**Key Components**:

1. **FeatureFlagManager Class**:
   - **getFlag(key)**: Get flag value with env override
     - Checks runtime overrides first
     - Checks `FLAG_{KEY}` environment variable
     - Falls back to default value

   - **isEnabled(key)**: Check if boolean flag is enabled
   - **setOverride(key, value)**: Override flag at runtime (testing)
   - **getAllFlags()**: Get all flags with current values
   - **logFlags()**: Log all flags to console (debug mode)

2. **Environment Variable Override**:
   - Flags can be overridden via `FLAG_{KEY}` env vars
   - Example: `FLAG_USE_MOCK_THEMES=false` enables real theme service
   - Supports boolean, number, and string values

**Convenience Exports**:
```typescript
export const flagManager = new FeatureFlagManager();
export const isEnabled = (key: FeatureFlagKey) => flagManager.isEnabled(key);
export const getFlag = (key: FeatureFlagKey) => flagManager.getFlag(key);
```

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

### UI Components (Polaris Web Components)

The app uses **Polaris Web Components** (native HTML elements, not React components).
Types provided by `@shopify/polaris-types` in devDependencies.
- `<s-page>`: Page container
- `<s-layout>`, `<s-layout-section>`: Layout system
- `<s-section>`: Card container/Section container
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

### Section Save Flow (Two-Action Model)

The section save flow has been redesigned to separate draft saves from theme publication. Both create page (`app.sections.new.tsx`) and edit page (`app.sections.$id.tsx`) support two save actions:

#### Action 1: Save Draft
User saves section to database with "draft" status (without publishing to theme).

```
User: Click "Save Draft" button
  ↓
[app.sections.new.tsx or app.sections.$id.tsx] action (action=saveDraft)
  ↓
[services/section.server.ts] create() or update()
  ↓
Database: Insert/Update Section record with status="draft"
  ↓
[services/usage-tracking.server.ts] trackGeneration() - log usage
  ↓
[Success] Return { success: true, message: "Draft saved successfully!", sectionId }
[Error] Return { success: false, message: error message }
  ↓
Toast notification: "Section saved"
  ↓
Redirect to edit page: /app/sections/{sectionId}
```

**Section Record Created/Updated**:
```typescript
{
  shop: string;
  prompt: string;
  code: string;
  name?: string;              // From generated schema or user input
  tone?: string;              // Advanced option: professional, friendly, etc
  style?: string;             // Advanced option: minimal, detailed, etc
  status: "draft";            // Not yet published to theme
  themeId?: undefined;        // No theme associated yet
  themeName?: undefined;
  fileName?: undefined;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Action 2: Publish to Theme (Save + Publish)
User saves section to database AND publishes to selected Shopify theme with "saved" status.

```
User: Enter filename + Select theme + Click "Publish to Theme"
  ↓
[app.sections.new.tsx or app.sections.$id.tsx] action (action=save)
  ↓
[services/theme.server.ts] createSection(request, themeId, fileName, content)
  ↓
Validate filename (add sections/, .liquid if needed)
  ↓
Shopify Admin API: themeFilesUpsert mutation
  ↓
Check response.data.themeFilesUpsert.userErrors
  ↓
[If theme save successful]
  ↓
[services/section.server.ts] create() or update()
  ↓
Database: Insert/Update Section with status="saved" + theme info
  ↓
[services/usage-tracking.server.ts] trackGeneration() - log usage
  ↓
[Success] Return { success: true, message: "Section published to {filename}!", sectionId }
[If theme save failed] Return { success: false, message: error from Shopify }
[If DB save failed] Return { success: false, message: database error }
  ↓
Toast notification: "Section saved"
  ↓
Redirect to edit page: /app/sections/{sectionId}
```

**Section Record Created/Updated**:
```typescript
{
  shop: string;
  prompt: string;
  code: string;
  name?: string;              // From generated schema or user input
  tone?: string;
  style?: string;
  status: "saved";            // Published to theme
  themeId: string;            // Associated theme ID
  themeName: string;          // Theme display name
  fileName: string;           // sections/ai-section.liquid
  createdAt: Date;
  updatedAt: Date;
}
```

#### Key Type Changes

**`app/types/service.types.ts`**:
```typescript
export interface GenerateActionData {
  success?: boolean;
  code?: string;
  prompt?: string;
  message?: string;
  error?: string;
  quota?: QuotaCheck;
  // Generation metadata - saved to DB only when user saves
  name?: string;
  tone?: string;
  style?: string;
}

export interface SaveActionData {
  success: boolean;
  message: string;
  sectionId?: string;        // ID of created/updated section
  templateSaved?: boolean;   // For Save as Template action
}
```

**`app/services/section.server.ts`** - Extended `CreateSectionInput`:
```typescript
export interface CreateSectionInput {
  shop: string;
  prompt: string;
  code: string;
  name?: string;
  tone?: string;
  style?: string;
  status?: string;           // "draft" or "saved" (default: "draft")
  themeId?: string;          // Optional - set when publishing to theme
  themeName?: string;        // Optional - theme display name
  fileName?: string;         // Optional - only when publishing
}
```

#### UI Changes - GeneratePreviewColumn

Both create and edit pages render the same `GeneratePreviewColumn` component with two save buttons side-by-side:

```
┌─ Save Draft Button ─┐    ┌─ Publish to Theme Button ─┐
│  Creates draft      │    │  Saves to DB + Theme      │
│  No theme required  │    │  Requires theme selected   │
│  Disabled: No code  │    │  Disabled: No code/theme   │
└────────────────────┘    └───────────────────────────┘
```

**Props Interface**:
```typescript
export interface GeneratePreviewColumnProps {
  generatedCode: string;
  themes: Theme[];
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  // Create page - two save options
  onSaveDraft?: () => void;
  onPublish?: () => void;
  isSavingDraft?: boolean;
  isPublishing?: boolean;
  canPublish?: boolean;
  // Common
  onSaveAsTemplate?: () => void;
  isGenerating?: boolean;
}
```

#### Critical Behavior Changes

1. **Generate Action**: No longer saves to database automatically
   - Only returns code in `GenerateActionData`
   - Section only created when user explicitly clicks "Save Draft" or "Publish"

2. **Save Draft**: Creates section with "draft" status
   - No theme integration
   - Can be edited and published later
   - Useful for saving work-in-progress sections

3. **Publish to Theme**: Creates section with "saved" status
   - Immediately publishes to selected Shopify theme
   - Theme info (themeId, themeName, fileName) stored in database
   - Replaces existing file if it exists

4. **Edit Page Redesign**: Same flow applies to editing sections
   - Can regenerate code without losing section
   - Can save draft of regenerated code
   - Can publish changes to theme

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

### Production Dependencies (11)
- `@google/generative-ai`: Google Gemini SDK
- `@prisma/client`: Database ORM client
- `@react-router/*`: React Router v7 packages (dev, fs-routes, node, serve)
- `@shopify/app-bridge-react`: App Bridge for embedded apps
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

### Required
- `SHOPIFY_API_KEY`: Shopify app API key
- `SHOPIFY_API_SECRET`: Shopify app secret
- `SHOPIFY_APP_URL`: App URL (auto-set by CLI)
- `SCOPES`: Comma-separated scopes (auto-set by CLI)

### Optional
- `GEMINI_API_KEY`: Google AI Studio API key (if missing, uses mock AI service)
- `SHOP_CUSTOM_DOMAIN`: Custom shop domain for development
- `NODE_ENV`: production/development

### Feature Flag Environment Variables

Feature flags can be controlled via environment variables with the `FLAG_` prefix:

**Service Mode Flags**:
- `FLAG_USE_MOCK_THEMES`: Set to `false` to use real Shopify theme API (default: `true`)
- `FLAG_USE_MOCK_AI`: Set to `true` to force mock AI service even if GEMINI_API_KEY exists (default: `false`)

**Performance Flags**:
- `FLAG_SIMULATE_API_LATENCY`: Set to `true` to add realistic delays to mock services (default: `false`)
- `FLAG_CACHE_THEME_LIST`: Set to `true` to cache theme list (future feature, default: `false`)

**Debug Flags**:
- `FLAG_VERBOSE_LOGGING`: Set to `true` for detailed service logging (default: `true` in dev, `false` in production)
- `FLAG_SHOW_SERVICE_MODE`: Set to `true` to show service mode indicator in UI (default: `true` in dev, `false` in production)

**Feature Toggle Flags** (future features):
- `FLAG_ENABLE_SECTION_HISTORY`: Enable section generation history (default: `false`)
- `FLAG_ENABLE_TEMPLATE_LIBRARY`: Enable section template library (default: `false`)
- `FLAG_ENABLE_AI_SETTINGS`: Enable AI configuration UI (default: `false`)

**Example Configuration**:
```bash
# Use real services in development
FLAG_USE_MOCK_THEMES=false
FLAG_USE_MOCK_AI=false
GEMINI_API_KEY=your_key_here

# Enable debug features
FLAG_VERBOSE_LOGGING=true
FLAG_SHOW_SERVICE_MODE=true
FLAG_SIMULATE_API_LATENCY=true
```

**Legacy Environment Variable**:
- `SERVICE_MODE`: Set to `real` or `mock` (deprecated, use `FLAG_USE_MOCK_THEMES` instead)

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

**Document Version**: 1.4
**Last Updated**: 2025-12-09
**Codebase Size**: ~18,500 tokens across 90+ files
**Primary Language**: TypeScript (TSX)
**Recent Changes** (December 2025):
- **251209**: Redirect after save feature with toast notifications
- **251209**: s-select and s-text-field component consolidation
- **251202**: Billing system fixes - webhook type safety, GraphQL fallback, upgrade flow
- **Phase 04**: Component-based architecture (9 reusable UI components)
- **Phase 03**: Feature flag system, adapter pattern, mock services, dual-action save flow
