# System Architecture

## Overview

AI Section Generator (Blocksmith) is a **Shopify embedded app** built with React Router 7 server-side rendering, TypeScript strict mode, and a comprehensive service-oriented architecture. The system generates production-ready Liquid sections using Google Gemini 2.5 Flash AI, with live preview rendering via App Proxy native Shopify Liquid and full multi-tenant isolation via shop domain verification.

**Key Architecture Traits**:
- **Service-Oriented**: 25+ server modules with clear separation of concerns
- **Component-Based**: 95 React components organized by feature domain
- **Type-Safe**: Full TypeScript strict mode throughout
- **Multi-Tenant**: Complete shop domain isolation for data and operations
- **Adapter Pattern**: Mock/real service switching for development and testing
- **Streaming**: Server-Sent Events (SSE) for real-time chat updates

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
│  │  │  - Service Mode Indicator (dev only)         │     │    │
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
│  │  │      Uses: aiAdapter, themeAdapter          │     │    │
│  │  │      Imports: components from app/components│     │    │
│  │  │  - app._index.tsx                           │     │    │
│  │  │  - webhooks.*.tsx                           │     │    │
│  │  │  - auth.*.tsx                               │     │    │
│  │  └───────────┬──────────────────────────────────┘     │    │
│  │              │                                          │    │
│  │  ┌───────────▼──────────────────────────────────────┐ │    │
│  │  │  Component Layer (Phase 04)                     │ │    │
│  │  │  ┌──────────────────────────────────────────┐   │ │    │
│  │  │  │  Shared Components                       │   │ │    │
│  │  │  │  - Button, Card, Banner (Success/Error)  │   │ │    │
│  │  │  └──────────────────────────────────────────┘   │ │    │
│  │  │  ┌──────────────────────────────────────────┐   │ │    │
│  │  │  │  Generate Feature Components             │   │ │    │
│  │  │  │  - PromptInput, ThemeSelector            │   │ │    │
│  │  │  │  - CodePreview, SectionNameInput         │   │ │    │
│  │  │  │  - GenerateActions                       │   │ │    │
│  │  │  └──────────────────────────────────────────┘   │ │    │
│  │  │  - Barrel export (index.ts)                     │ │    │
│  │  └─────────────────────────────────────────────────┘ │    │
│  └──────────────┼──────────────────────────────────────────┘    │
│                 │                                                │
│  ┌──────────────▼──────────────────────────────────────────┐    │
│  │          Business Logic Layer (Adapter Pattern)         │    │
│  │                                                          │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │  Feature Flag System                              │ │    │
│  │  │  - FLAG_USE_MOCK_THEMES, FLAG_USE_MOCK_AI        │ │    │
│  │  │  - Environment variable overrides                 │ │    │
│  │  │  - flagManager.isEnabled(key)                     │ │    │
│  │  └────────────────┬──────────────────────────────────┘ │    │
│  │                   │                                     │    │
│  │                   ▼                                     │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │  Service Configuration (config.server.ts)         │ │    │
│  │  │  - serviceConfig.aiMode: 'mock' | 'real'         │ │    │
│  │  │  - serviceConfig.themeMode: 'mock' | 'real'      │ │    │
│  │  └────────────────┬──────────────────────────────────┘ │    │
│  │                   │                                     │    │
│  │    ┌──────────────┴───────────────┐                    │    │
│  │    │                              │                    │    │
│  │    ▼                              ▼                    │    │
│  │  ┌─────────────────┐    ┌──────────────────┐          │    │
│  │  │  AI Adapter     │    │  Theme Adapter   │          │    │
│  │  │  (routes calls) │    │  (routes calls)  │          │    │
│  │  └────┬────────────┘    └────┬─────────────┘          │    │
│  │       │                      │                         │    │
│  │       │ if mock              │ if mock                 │    │
│  │       ├─────────┐            ├─────────┐               │    │
│  │       │         │            │         │               │    │
│  │       ▼         ▼            ▼         ▼               │    │
│  │  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │AIService │ │MockAI   │ │Theme     │ │MockTheme │  │    │
│  │  │(real)    │ │Service  │ │Service   │ │Service   │  │    │
│  │  │          │ │(mock)   │ │(real)    │ │(mock)    │  │    │
│  │  └────┬─────┘ └────┬────┘ └────┬─────┘ └────┬─────┘  │    │
│  └───────┼────────────┼───────────┼────────────┼─────────┘    │
│          │            │           │            │               │
│          │            │           │            │               │
└──────────┼────────────┼───────────┼────────────┼───────────────┘
           │            │           │            │
           ▼            │           ▼            │
   ┌─────────────────┐  │  ┌────────────────┐   │
   │  Google Gemini  │  │  │  Shopify API   │   │
   │  API            │  │  │  (GraphQL)     │   │
   │  gemini-2.0     │  │  │  - themes      │   │
   │  -flash-exp     │  │  │  - files       │   │
   └─────────────────┘  │  └────────────────┘   │
                        │                        │
                        ▼                        ▼
                   ┌──────────────┐     ┌────────────────┐
                   │  Mock Data   │     │  Mock Store    │
                   │  - Sections  │     │  (in-memory)   │
                   │  - Themes    │     │  - Saved files │
                   └──────────────┘     └────────────────┘
```

### Feature Flag Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Environment Variables                                           │
│  FLAG_USE_MOCK_THEMES=true                                      │
│  FLAG_USE_MOCK_AI=false                                         │
│  GEMINI_API_KEY=abc123...                                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  FeatureFlagManager (flags/flag-utils.ts)                       │
│  1. Check runtime overrides                                     │
│  2. Check FLAG_* environment variables                          │
│  3. Fall back to default values                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Service Configuration (config.server.ts)                       │
│                                                                  │
│  getThemeMode():                                                │
│    if FLAG_USE_MOCK_THEMES=true → return 'mock'                │
│    else if SERVICE_MODE='real' → return 'real'                 │
│    else → return 'mock' (safe default)                         │
│                                                                  │
│  getAIMode():                                                   │
│    if FLAG_USE_MOCK_AI=true → return 'mock'                    │
│    else if GEMINI_API_KEY exists → return 'real'               │
│    else → return 'mock'                                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  serviceConfig Object (exported)                                │
│  {                                                              │
│    themeMode: 'mock',        // from FLAG_USE_MOCK_THEMES      │
│    aiMode: 'real',           // from GEMINI_API_KEY            │
│    enableLogging: true,      // from FLAG_VERBOSE_LOGGING      │
│    simulateLatency: false,   // from FLAG_SIMULATE_API_LATENCY │
│    showModeInUI: true        // from FLAG_SHOW_SERVICE_MODE    │
│  }                                                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Service Adapters (at module initialization)                    │
│                                                                  │
│  AIAdapter:                                                     │
│    this.service = serviceConfig.aiMode === 'mock'               │
│      ? mockAIService   ← Selected (aiMode='real' above)        │
│      : aiService       ← USED                                   │
│                                                                  │
│  ThemeAdapter:                                                  │
│    this.service = serviceConfig.themeMode === 'mock'            │
│      ? mockThemeService ← USED (themeMode='mock' above)        │
│      : themeService     ← Not selected                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Runtime Behavior                                               │
│                                                                  │
│  Route calls aiAdapter.generateSection(prompt)                  │
│    → Routes to AIService (real Gemini)                          │
│    → Returns actual AI-generated Liquid code                    │
│                                                                  │
│  Route calls themeAdapter.getThemes(request)                    │
│    → Routes to MockThemeService                                 │
│    → Returns mock themes (Dawn, Refresh, Studio)                │
│                                                                  │
│  Route calls themeAdapter.createSection(...)                    │
│    → Routes to MockThemeService                                 │
│    → Saves to in-memory mock store (no Shopify API call)        │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Breakdown

### 1. Presentation Layer

**Location**: `app/routes/` and `app/components/`

**Responsibilities**:
- Handle HTTP requests (GET, POST)
- Render React components server-side and client-side
- Manage form submissions and navigation
- Display UI with Polaris web components
- Handle authentication redirects

**Architecture**: The presentation layer is divided into two sub-layers:

1. **Route Layer** (`app/routes/`): Handles data fetching, actions, and orchestrates component composition
2. **Component Layer** (`app/components/`): Pure UI components for rendering (introduced Phase 04)

**Key Components**:

#### Route Layer

**`app.generate.tsx` (Core Feature Route)**
- **Loader**: Fetches merchant themes on page load
- **Action**: Handles two actions:
  - `generate`: Sends prompt to AI service, returns generated code
  - `save`: Saves generated code to selected theme
- **Component**: Orchestrates UI using components from `app/components/`:
  - PromptInput, ThemeSelector, CodePreview
  - SectionNameInput, GenerateActions
  - SuccessBanner, ErrorBanner
- **Phase 04 Refactoring**: Extracted all inline UI into reusable components

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

#### Component Layer (Phase 04)

**Location**: `app/components/`

**Organization**:
- **`shared/`**: Reusable components across features
  - `Button.tsx`: Polaris button wrapper with TypeScript props
  - `Card.tsx`: Polaris card wrapper
  - `Banner.tsx`: Banner components (Base, Success, Error)

- **`generate/`**: Feature-specific components for generate route
  - `PromptInput.tsx`: Multiline prompt input field
  - `ThemeSelector.tsx`: Theme dropdown selector
  - `CodePreview.tsx`: Code display with syntax formatting
  - `SectionNameInput.tsx`: Filename input with .liquid suffix
  - `GenerateActions.tsx`: Generate and Save action buttons

- **`ServiceModeIndicator.tsx`**: Debug mode indicator (dev only)
- **`index.ts`**: Barrel export for centralized imports

**Design Principles**:
- **Pure Presentation**: No business logic, only UI rendering
- **Fully Typed**: All props defined with TypeScript interfaces
- **Small & Focused**: Each component under 200 lines
- **Composable**: Components combine to build complex UIs
- **Testable**: Pure functions enable isolated testing
- **Reusable**: Components can be used across multiple routes

**Benefits**:
- Improved code reusability and maintainability
- Clear separation between UI and business logic
- Easier testing (components testable in isolation)
- Reduced route file complexity
- Scalable architecture for future features

**Technology**:
- React Router 7 (file-based routing)
- Server-side rendering (SSR)
- Polaris Web Components (UI)
- React 18 hooks (useState, useEffect, etc.)
- Component-based architecture (Phase 04)

#### Phase 02: Block Defaults & Schema Parsing Expansion

**Purpose**: Provide comprehensive default value handling for all 31 Shopify schema setting types, ensuring blocks render correctly with sensible defaults. DRY refactor using shared `buildInitialState()` function across components.

**Key Changes**:

1. **Enhanced buildInitialState() Function** (`app/components/preview/schema/parseSchema.ts`)
   - **Coverage**: All 31 Shopify setting types (previously ~10)
   - **Type-Specific Defaults**:
     - Text inputs (text, textarea, richtext, inline_richtext, html, liquid): `''` (empty string)
     - Numbers (number, range): `setting.min ?? 0`
     - Boolean (checkbox): `false`
     - Colors (color, color_background): `'#000000'`
     - Selection (select, radio): First option value
     - Text alignment: `'left'`
     - Font picker: `'system-ui'`
     - Media (image_picker): `'placeholder'` (preview only)
     - Video (video, video_url): `''`
     - URL: `'#'` (for button links)
     - Resource pickers (product, collection, article, blog, page, link_list): `''` (empty)
     - Resource lists (product_list, collection_list): `'[]'` (JSON string)
     - Metaobjects (metaobject, metaobject_list): `''`
     - Color schemes (color_scheme, color_scheme_group): `''`
     - Display-only (header, paragraph): Skip (no value needed)

2. **DRY Refactor in SettingsPanel** (`app/components/preview/settings/SettingsPanel.tsx`)
   - `handleResetDefaults()` now uses `buildInitialState(settings)` instead of inline defaults
   - Single source of truth for default value logic
   - Reduced code duplication

3. **Enhanced Schema Parser** (`app/components/preview/schema/parseSchema.ts`)
   - `extractSettings()` explicitly supports 25+ types
   - `buildBlockInstancesFromPreset()` initializes block settings with proper defaults
   - Respects explicit `default` field when provided by schema author

4. **Test Coverage** (`app/components/preview/schema/__tests__/parseSchema.test.ts`)
   - 14 new test cases covering buildInitialState()
   - Tests for each major type category
   - Validates explicit defaults override type defaults
   - Tests resource lists, colors, fonts, text alignment

**Data Flow**:
```
Schema Definition (with or without defaults)
    ↓
extractSettings() → Filter supported types
    ↓
buildInitialState() → Apply type-specific defaults
    ↓
SettingsPanel → Initial form state & Reset button
    ↓
Liquid Preview → Populated with default values
```

**Benefits**:
- Eliminates "undefined" values in block previews
- Consistent default behavior across all setting types
- Blocks render immediately with sensible defaults
- DRY principle - single source for defaults
- Type-safe with comprehensive test coverage
- Supports both explicit schema defaults and fallback type defaults

---

### 2. Business Logic Layer

**Location**: `app/services/`

**Responsibilities**:
- Implement core business logic
- Integrate with external APIs
- Handle error recovery and fallbacks
- Validate and transform data
- Route requests to appropriate service implementations (mock vs real)

**Architecture Pattern**: Adapter Pattern with Feature Flag Control

The business logic layer uses an **adapter pattern** to enable seamless switching between mock and real service implementations. This architecture supports:
- Development without external API dependencies
- Testing with consistent mock data
- Gradual migration from mock to real services
- Runtime service mode switching via environment variables

**Service Layer Structure**:
```
app/services/
├── adapters/              # Service routing layer
│   ├── ai-adapter.ts      # Routes AI requests to mock/real service
│   └── theme-adapter.ts   # Routes theme requests to mock/real service
├── flags/                 # Feature flag system
│   ├── feature-flags.ts   # Flag definitions and defaults
│   └── flag-utils.ts      # Flag manager and utilities
├── mocks/                 # Mock implementations
│   ├── mock-ai.server.ts      # Mock AI service
│   ├── mock-theme.server.ts   # Mock theme service
│   ├── mock-data.ts           # Predefined mock data
│   └── mock-store.ts          # In-memory storage for mocks
├── ai.server.ts           # Real AI service (Google Gemini)
├── theme.server.ts        # Real theme service (Shopify API)
└── config.server.ts       # Service configuration manager
```

#### Feature Flag System

**Purpose**: Control which features and services are enabled at runtime

**Components**:

1. **`flags/feature-flags.ts`** - Flag Definitions
   - Defines all available feature flags with metadata
   - Provides default values for each flag
   - Categorizes flags by purpose (service mode, features, performance, debug)

2. **`flags/flag-utils.ts`** - Flag Manager
   - Manages flag state and overrides
   - Reads flag values from environment variables (`FLAG_*` prefix)
   - Provides convenience functions for checking flag states
   - Supports runtime overrides for testing

**Available Flags**:

**Service Mode Flags**:
- `USE_MOCK_THEMES`: Switch between mock and real theme service (default: true)
- `USE_MOCK_AI`: Switch between mock and real AI service (default: false)

**Performance Flags**:
- `SIMULATE_API_LATENCY`: Add realistic delays to mock responses (default: false)
- `CACHE_THEME_LIST`: Cache theme list to reduce API calls (default: false)

**Debug Flags**:
- `VERBOSE_LOGGING`: Enable detailed service logging (default: dev mode only)
- `SHOW_SERVICE_MODE`: Display service mode indicator in UI (default: dev mode only)

**Feature Toggle Flags** (future):
- `ENABLE_SECTION_HISTORY`: Section generation history viewer
- `ENABLE_TEMPLATE_LIBRARY`: Pre-built section templates
- `ENABLE_AI_SETTINGS`: AI model configuration UI

**Environment Variable Configuration**:
```bash
# Format: FLAG_{FLAG_NAME}={value}
FLAG_USE_MOCK_THEMES=false    # Use real Shopify API
FLAG_USE_MOCK_AI=true         # Use mock AI service
FLAG_VERBOSE_LOGGING=true     # Enable debug logs
FLAG_SIMULATE_API_LATENCY=true  # Add realistic delays
```

#### Service Configuration (`config.server.ts`)

**Purpose**: Determine which service implementations to use based on flags

**Configuration Logic**:

1. **Theme Mode Determination**:
   - Check `FLAG_USE_MOCK_THEMES` environment variable
   - Fall back to legacy `SERVICE_MODE` environment variable
   - Default to 'mock' if nothing specified (safe for development)

2. **AI Mode Determination**:
   - Check `FLAG_USE_MOCK_AI` environment variable
   - Check if `GEMINI_API_KEY` exists (auto-enables real mode)
   - Default to 'mock' if no API key

**Service Config Object**:
```typescript
export const serviceConfig: ServiceConfig = {
  themeMode: getThemeMode(),      // 'mock' | 'real'
  aiMode: getAIMode(),            // 'mock' | 'real'
  enableLogging: boolean,         // Verbose logging enabled?
  simulateLatency: boolean,       // Add delays to mocks?
  showModeInUI: boolean          // Show mode indicator?
};
```

#### Service Adapters

**Purpose**: Route service calls to appropriate implementation based on configuration

**Pattern**:
```typescript
class AIAdapter implements AIServiceInterface {
  private service: AIServiceInterface;

  constructor() {
    logServiceConfig();
    this.service = serviceConfig.aiMode === 'mock'
      ? mockAIService   // Use mock implementation
      : aiService;      // Use real implementation
  }

  async generateSection(prompt: string): Promise<string> {
    return this.service.generateSection(prompt);
  }
}

export const aiAdapter = new AIAdapter();
```

**Benefits**:
- Single import point for routes (`aiAdapter`, `themeAdapter`)
- Transparent switching between implementations
- No conditional logic in route handlers
- Configuration logged once at startup

**Usage in Routes**:
```typescript
import { aiAdapter } from "../services/adapters/ai-adapter";
import { themeAdapter } from "../services/adapters/theme-adapter";

// Generate section (routes to mock or real AI service)
const code = await aiAdapter.generateSection(prompt);

// Fetch themes (routes to mock or real theme service)
const themes = await themeAdapter.getThemes(request);
```

#### Real Service Implementations

**`ai.server.ts` - AIService**
**Purpose**: Generate Liquid sections using Google Gemini AI

**Implementation**:
- Uses `@google/generative-ai` SDK
- Model: `gemini-2.0-flash-exp`
- System prompt enforces Liquid structure
- Falls back to mock section on API errors

**`theme.server.ts` - ThemeService**
**Purpose**: Interact with Shopify themes via GraphQL

**Implementation**:
- Uses Shopify Admin GraphQL API (October 2025)
- Authenticates via `authenticate.admin(request)`
- Queries themes and creates/updates theme files
- Handles GraphQL errors and userErrors

#### Mock Service Implementations

**`mocks/mock-ai.server.ts` - MockAIService**
**Purpose**: Simulate AI generation without external API calls

**Features**:
- Returns predefined sections for common prompts (hero, product grid)
- Generates dynamic mock sections for custom prompts
- Simulates API latency (configurable)
- Tracks generation count for debugging
- Console logging with `[MOCK]` prefix

**`mocks/mock-theme.server.ts` - MockThemeService**
**Purpose**: Simulate Shopify theme operations without API calls

**Features**:
- Returns predefined themes (Dawn, Refresh, Studio)
- Validates theme IDs before operations
- Saves sections to in-memory mock store
- Simulates API latency (configurable)
- Filename normalization (matches real service)

**`mocks/mock-store.ts` - MockStore**
**Purpose**: In-memory storage for mock service data

**Capabilities**:
- Store saved sections by theme ID and filename
- Track generation count
- Retrieve saved sections for inspection
- Clear all data (useful for testing)

**`mocks/mock-data.ts` - Mock Data Definitions**
- Predefined themes with realistic data
- Predefined section templates (hero, product grid, etc.)
- Dynamic section generator function

---

### Subscription Billing System

**Location**: `app/services/billing.server.ts`, `app/routes/webhooks.app.subscriptions_update.tsx`

**Architecture**: Hybrid subscription model (base recurring + usage overages)

#### Webhook Flow - APP_SUBSCRIPTIONS_UPDATE

**Purpose**: Handle subscription lifecycle events (activated, cancelled, expired, upgraded)

**Flow Diagram**:
```
┌─────────────────────────────────────────────────────────────┐
│  Shopify sends APP_SUBSCRIPTIONS_UPDATE webhook             │
│  - Triggered on status change (active, cancelled, etc.)     │
│  - Payload includes subscriptionId, status, currentPeriodEnd│
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Webhook Handler (webhooks.app.subscriptions_update.tsx)    │
│  1. Authenticate webhook (HMAC validation)                  │
│  2. Extract payload (subscriptionId, status, period end)    │
│  3. Validate payload structure                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Check currentPeriodEnd presence                            │
│  - IF present: Use webhook value                            │
│  - IF missing: Query Shopify GraphQL API (fallback)         │
│  - Handles optional field safely                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Database Lookup by shopifySubId                            │
│  - Find existing subscription record                         │
│  - IF NOT FOUND: Check for pending subscription             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ Existing Record Found ──────────────┐
                     │                                        │
                     │                                        ▼
                     │                           ┌──────────────────────┐
                     │                           │ Update Status        │
                     │                           │ - status = new value │
                     │                           │ - period end updated │
                     │                           │ - reset usage (cycle)│
                     │                           └──────────────────────┘
                     │
                     ├─ Not Found + Active Status ──────────┐
                     │                                        │
                     │                                        ▼
                     │                           ┌──────────────────────┐
                     │                           │ Pending Subscription │
                     │                           │ Upgrade Handler      │
                     │                           │ - Find pending by shop│
                     │                           │ - Update with real ID │
                     │                           │ - Activate record     │
                     │                           │ - Fetch period end    │
                     │                           │ - Reset usage counters│
                     │                           └──────────────────────┘
                     │
                     └─ Shop Validation ─────────────────────┐
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ Verify shop matches  │
                                                   │ subscription record  │
                                                   └──────────────────────┘
```

#### Subscription Upgrade Flow

**Problem**: Shopify billing API creates new subscription on upgrade, cancels old subscription
**Solution**: Two-phase activation with pending status + webhook reconciliation

**Upgrade Sequence**:
```
1. User initiates upgrade (changeSubscription)
   ├─ Cancel old subscription
   └─ Create new subscription (status: pending, temp shopifySubId)

2. User approves subscription in Shopify
   └─ Shopify activates subscription (new shopifySubId assigned)

3. Webhook received (APP_SUBSCRIPTIONS_UPDATE)
   ├─ Payload: new shopifySubId, status=ACTIVE
   ├─ Database lookup by shopifySubId: NOT FOUND
   ├─ Fallback: Find pending subscription by shop
   ├─ Update pending record:
   │   ├─ shopifySubId = actual ID from Shopify
   │   ├─ status = active
   │   ├─ currentPeriodEnd = fetched from GraphQL (if missing)
   │   └─ Reset usage counters
   └─ Activation complete
```

#### GraphQL Fallback Strategy

**Scenario**: Webhook payload missing optional `currentPeriodEnd` field

**Implementation**:
```typescript
// Check if webhook includes currentPeriodEnd
if (app_subscription.current_period_end) {
  currentPeriodEnd = new Date(app_subscription.current_period_end);
} else if (app_subscription.status.toLowerCase() === "active" && admin) {
  // ACTIVE but no period end - query Shopify
  const fetchedDate = await fetchCurrentPeriodEnd(admin, shopifySubId);
  currentPeriodEnd = fetchedDate ?? undefined;
}
```

**GraphQL Query** (`billing.server.ts`):
```graphql
query getSubscription($id: ID!) {
  appSubscription(id: $id) {
    currentPeriodEnd
  }
}
```

**Benefits**:
- Handles webhook payload variations
- Ensures data consistency
- Prevents Invalid Date errors
- Graceful degradation (undefined if query fails)

#### Error Handling Patterns

**Webhook Processing**:
- Validate topic matches APP_SUBSCRIPTIONS_UPDATE
- Check payload structure (admin_graphql_api_id present)
- Verify shop matches subscription record
- Log all errors with context (shop, subscriptionId, status)
- Return HTTP 400/404/500 with descriptive messages

**Type Safety**:
```typescript
// Optional field handling
current_period_end?: string | null;

// Safe Date construction
const currentPeriodEnd = app_subscription.current_period_end
  ? new Date(app_subscription.current_period_end)
  : undefined;
```

**Status Normalization**:
```typescript
// Case-insensitive comparison (Shopify inconsistent casing)
if (app_subscription.status.toLowerCase() === "active") {
  // Handle active status
}
```

#### Billing Service Functions

**`createSubscription(admin, input)`**:
- Creates hybrid subscription (base + usage)
- Cancels existing pending/declined subscriptions
- Stores record with status=pending
- Returns confirmationUrl for merchant approval

**`changeSubscription(admin, input)`**:
- Cancels old subscription
- Creates new subscription (pending)
- Webhook activates when merchant approves

**`updateSubscriptionStatus(shopifySubId, status, currentPeriodEnd?)`**:
- Updates subscription status in DB
- Handles optional currentPeriodEnd
- Resets usage counters on new billing cycle

**`fetchCurrentPeriodEnd(admin, shopifySubId)`**:
- Queries Shopify GraphQL for currentPeriodEnd
- Fallback when webhook data incomplete
- Returns Date | null (safe handling)

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

### App Proxy Liquid Rendering Flow (Phase 01)

**Purpose**: Render generated Liquid sections on the storefront with shop context

```
┌─────────────────────────┐
│  Merchant Preview Link  │
│  /apps/blocksmith-      │
│  preview?code=BASE64    │
└────────────┬────────────┘
             │
             ▼
┌──────────────────────────┐
│  Shopify Storefront      │
│  Routes to proxy URL     │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  api.proxy.render        │
│  authenticate.public.    │
│  appProxy()              │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  HMAC Signature          │
│  Validation              │
│  (Shopify-signed only)   │
└────────────┬─────────────┘
             │ Valid
             ▼
┌──────────────────────────┐
│  Verify app installed    │
│  Check session exists    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Fetch code param        │
│  Max 100KB (DoS limit)   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Decode Base64 Liquid    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Strip schema blocks     │
│  Regex: {%-?schema-?%}   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Return liquid()         │
│  Content-Type:           │
│  application/liquid      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Shopify renders Liquid  │
│  in storefront context   │
│  (products, collections) │
└──────────────────────────┘
```

**Key Details**:
- **URL**: `https://{shop}.myshopify.com/apps/blocksmith-preview?code={base64-liquid}`
- **Config**: Defined in `shopify.app.toml` (`[app_proxy]` block)
- **Max Payload**: 100KB (prevents DoS attacks via oversized code)
- **Schema Stripping**: Liquid `schema` blocks cannot be rendered by Shopify Liquid engine, must be removed
- **Security**: HMAC signature validation ensures only Shopify can access the endpoint

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

## 5. Auto-Save Data Flow (Phase 1)

### Overview

**Auto-Save** automatically persists draft sections to the database when AI generates and applies a version, without requiring user action.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ChatPanel (Component)                         │
│  Receives AI response, adds to message stream                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  useVersionState Hook (Editor)                                  │
│                                                                  │
│  1. Detect new AI response (message with codeSnapshot)         │
│  2. Add to versions array                                      │
│  3. Auto-apply latest version (if not dirty, not browsing)    │
│  4. Call onCodeChange() → update draft code                   │
│  5. Call onAutoApply() → (optional) UI feedback               │
│  6. Call onAutoSave(code) → Silent background save ✨        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  useEditorState Hook                                            │
│                                                                  │
│  handleAutoSave(code):                                          │
│    - Create FormData with action="saveDraft"                  │
│    - Include code + sectionName                               │
│    - Submit via useFetcher (silent, no UI notification)       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  React Router Action Handler                                    │
│  (app/routes/app.sections.$id.tsx)                            │
│                                                                  │
│  if (action === "saveDraft"):                                 │
│    - Validate code length (max 100KB)                         │
│    - Update Section in database                               │
│    - Return success/error (no redirect)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Database (Prisma)                                              │
│                                                                  │
│  Section.update({                                              │
│    code: generatedCode,                                        │
│    name: sectionName,                                          │
│    updatedAt: now()                                            │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

**useVersionState Hook** (`app/components/editor/hooks/useVersionState.ts`):
- Line 114: `onAutoSave?.(latestVer.code)` - Calls auto-save callback when version auto-applies
- Triggered only when:
  - New AI version detected (message with codeSnapshot)
  - Draft is NOT dirty (not modified by user)
  - User is NOT browsing version history
  - Version is first OR newly added

**useEditorState Hook** (`app/components/editor/hooks/useEditorState.ts`):
- Line 78: `const autoSaveFetcher = useFetcher()` - Create fetcher for silent requests
- Line 81-87: `handleAutoSave()` callback:
  - Submits FormData with `action: "saveDraft"`
  - Includes current code and section name
  - Uses `method: 'post'` for idempotent saves
- Line 120: Passed to `useVersionState` as `onAutoSave` prop

**Router Action Handler** (`app/routes/app.sections.$id.tsx`):
- Handles `action === "saveDraft"` from FormData
- Validates code length (prevents oversized saves)
- Updates Section in database with new code
- Returns success response (no redirect/reload)

### Characteristics

**Silent Persistence**:
- No toast notification displayed
- No UI flashing or loading indicators
- User continues editing without interruption

**Automatic Trigger**:
- Happens automatically when AI applies version
- No explicit "Save" button click required
- User only needs to "Publish to Theme" for theme deployment

**Data Loss Prevention**:
- Saves current code state to database
- If user refreshes page after generation, draft is preserved
- New chat messages still restore from latest saved draft on page reload

**Concurrency**:
- Multiple rapid generations may queue multiple saves
- Latest save wins (database row updated with most recent code)
- No locking or transaction conflicts (row-level atomicity via Prisma)

### Integration Points

| Component | Hook | Purpose |
|-----------|------|---------|
| ChatPanel | useEditorState | Triggers on new AI message |
| Editor Hook | useVersionState | Detects version auto-apply |
| Version Hook | onAutoSave | Calls handleAutoSave callback |
| Fetcher | React Router | Silent background submission |
| Database | Prisma | Persistent storage |

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

**Document Version**: 1.9
**Last Updated**: 2026-01-01
**Architecture Status**: Native App Proxy Rendering Only, Phase 01 Auto-Save + Phase 02-04 Complete
**Recent Changes** (January 2026):
- **260101**: Phase 01 Auto-Save - Added silent background persistence when AI generates and applies version (useVersionState onAutoSave callback + useEditorState useFetcher auto-save)
- **251226**: LiquidJS Removal - Removed client-side LiquidJS rendering engine, Drop classes (18 files), useLiquidRenderer hook, and liquidjs dependency. All preview rendering now uses native Shopify Liquid via App Proxy
- **251225**: Phase 01 Completion - Added transformSectionSettings: true to api.proxy.render.tsx for automatic syntax transformation ({{ section.settings.X }} → {{ settings_X }}) in native Shopify Liquid rendering
- **251212**: Phase 02 Block Defaults - Expanded buildInitialState() to support all 31 Shopify schema types, DRY refactor with shared function in SettingsPanel
- **251209**: Redirect after save with toast notifications (Section edit flow complete)
- **251209**: s-select and s-text-field Web Components consolidation
- **251202**: Subscription billing fixes - webhook processing, upgrade flow, GraphQL fallback
- **Phase 04**: Component layer with 9 reusable UI components (Button, Card, Banner, PromptInput, ThemeSelector, CodePreview, SectionNameInput, GenerateActions, ServiceModeIndicator)
- **Phase 03**: Feature flag system, adapter pattern with mock services, dual-action save flow, section editing
- **Phase 02**: Block defaults and schema parsing expansion for 31 Shopify setting types
- **Phase 01**: Resource context integration with SectionSettingsDrop
