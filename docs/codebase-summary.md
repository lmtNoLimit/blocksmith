# Codebase Summary

## Overview

AI Section Generator is a Shopify embedded app built with React Router 7, Prisma, and Google Gemini AI. The app enables merchants to generate custom Liquid theme sections via natural language prompts and save them directly to their Shopify themes.

**Total Files**: 90+ files (routes: 17, services: 15, components: 60+, types: 4)
**Total Tokens**: ~19,200 tokens (estimated, +700 tokens from Phase 5 SYSTEM_PROMPT enhancement)
**Lines of Code**: ~2,650+ lines (excluding migrations, config)
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
│   │   ├── preview/              # Section preview system (NEW in Phase 6)
│   │   │   ├── utils/            # Liquid filter utilities
│   │   │   │   ├── liquidFilters.ts  # Array, string, math filters (285 lines)
│   │   │   │   ├── colorFilters.ts   # Color manipulation filters (325 lines)
│   │   │   │   └── __tests__/    # Filter test suites
│   │   │   ├── hooks/            # Preview rendering hooks
│   │   │   │   └── useLiquidRenderer.ts # LiquidJS engine wrapper (462 lines)
│   │   │   └── drops/            # Shopify drop objects
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

### Phase 2 Missing Objects Implementation (NEW in Phase 7)

Phase 2 expands the preview system with 7 new Shopify Liquid Drop classes for missing objects. These provide comprehensive support for Liquid global variables and context-aware rendering.

#### New Drop Classes

**File Organization**:
```
app/components/preview/drops/
├── ForloopDrop.ts      # Loop iteration context (index, first, last, etc.)
├── RequestDrop.ts      # HTTP request context (page_type, path, design_mode)
├── RoutesDrop.ts       # Shop route URLs (cart, account, search, etc.)
├── CartDrop.ts         # Shopping cart with CartItemDrop
├── CustomerDrop.ts     # Customer account data (email, name, orders)
├── PaginateDrop.ts     # Pagination context (current_page, page_size)
└── ThemeDrop.ts        # Theme settings with SettingsDrop
```

**Forloop Context** (`ForloopDrop.ts`):
- `index`: Current iteration (1-based)
- `index0`: Current iteration (0-based)
- `rindex`: Reverse index (from end, 1-based)
- `rindex0`: Reverse index (0-based)
- `first`: True if first iteration
- `last`: True if last iteration
- `length`: Total items in loop

**Request Context** (`RequestDrop.ts`):
- `design_mode`: Boolean (true in preview)
- `page_type`: Current page type (product, collection, article, index)
- `path`: Current URL path
- `host`: Request host
- `origin`: Request origin

**Routes Context** (`RoutesDrop.ts`):
- `root_url`, `cart_url`, `account_url`
- `account_login_url`, `account_logout_url`, `account_register_url`
- `account_addresses_url`, `cart_add_url`, `cart_change_url`
- `cart_clear_url`, `cart_update_url`, `collections_url`
- `all_products_collection_url`, `search_url`, `predictive_search_url`
- `product_recommendations_url`

**Cart Context** (`CartDrop.ts` with `CartItemDrop`):
- `item_count`: Number of items in cart
- `total_price`: Total cart value
- `items`: Array of CartItem objects
- `currency`: Cart currency code

**CartItem Properties**:
- `id`, `title`, `quantity`, `price`, `line_price`
- `image`: Image object with src, alt, width, height
- `url`: Product URL

**Customer Context** (`CustomerDrop.ts`):
- `id`: Customer ID
- `email`: Customer email
- `first_name`, `last_name`: Name components
- `name`: Full name
- `orders_count`: Number of orders placed
- `total_spent`: Lifetime customer value

**Paginate Context** (`PaginateDrop.ts`):
- `current_page`: Current page number
- `page_size`: Items per page
- `total_items`: Total item count

**Theme Context** (`ThemeDrop.ts` with `SettingsDrop`):
- `name`: Theme name
- `id`: Theme ID
- `role`: Theme role (main, unpublished, etc.)
- `settings`: SettingsDrop with theme configuration access

#### Context Builder Updates

**`buildPreviewContext.ts`** (updated):
- Integrated new Drop classes (request, routes, cart, customer, theme)
- Page type detection (product, collection, article, index)
- Auto-population of request context based on selected resources
- Cart and customer always available in context
- Settings-based resource mapping for dynamic schema settings

**PreviewContext Interface** (expanded):
```typescript
export interface PreviewContext {
  product?: ProductDrop;
  collection?: CollectionDrop;
  collections?: CollectionsDrop;
  article?: ArticleDrop;
  shop: ShopDrop;
  request: RequestDrop;        // NEW
  routes: RoutesDrop;          // NEW
  theme: ThemeDrop;            // NEW
  cart?: CartDrop;             // NEW
  customer: CustomerDrop;      // NEW
  settingsResourceDrops?: Record<string, ProductDrop | CollectionDrop>;
}
```

#### Mock Data Types

**`mockData/types.ts`** (new interfaces):
- `MockRequest`: Request context properties
- `MockForloop`: Loop iteration data
- `MockPaginate`: Pagination properties
- `MockRoutes`: Shop route URLs
- `MockCart` & `MockCartItem`: Cart structure
- `MockCustomer`: Customer account data
- `MockTheme`: Theme metadata

#### Integration Points

All new Drop classes are:
- Registered in `useLiquidRenderer.ts` during engine initialization
- Available in Liquid templates via `{{ request.page_type }}`, `{{ cart.total_price }}`, etc.
- Automatically instantiated by `buildPreviewContext()` with sensible defaults
- Support chained property access and filters

**Example Liquid Usage**:
```liquid
{% if request.page_type == 'product' %}
  <h1>{{ product.title }}</h1>
{% endif %}

{% for item in cart.items %}
  <p>{{ item.title }}: ${{ item.price | money }}</p>
{% endfor %}

{% if customer.id %}
  Welcome back, {{ customer.first_name }}!
  You've placed {{ customer.orders_count }} orders.
{% endif %}

{{ routes.cart_url }}
{{ theme.name }}
```

### Phase 1 Critical Filters Implementation (Phase 6)

Phase 1 introduces 47 Shopify Liquid filters for section preview rendering. Filters are organized into 3 categories: Array, String, Math, and Color manipulation.

#### Filter Architecture

**File Organization**:
```
app/components/preview/utils/
├── liquidFilters.ts      # Array, string, math filters (285 lines)
├── colorFilters.ts       # Color transformation filters (325 lines)
└── __tests__/            # Comprehensive test suites
    ├── liquidFilters.test.ts
    └── colorFilters.test.ts
```

**Integration Point** (`useLiquidRenderer.ts` - lines 167-185):
```typescript
// Register array filters (first, last, map, compact, concat, etc.)
Object.entries(arrayFilters).forEach(([name, fn]) => {
  engine.registerFilter(name, fn);
});

// Register string filters (escape_once, newline_to_br, strip_html, etc.)
Object.entries(stringFilters).forEach(([name, fn]) => {
  engine.registerFilter(name, fn);
});

// Register math filters (abs, at_least, at_most, ceil, floor, round, plus, minus)
Object.entries(mathFilters).forEach(([name, fn]) => {
  engine.registerFilter(name, fn);
});

// Register color filters (all 12 color manipulation filters)
Object.entries(colorFilters).forEach(([name, fn]) => {
  engine.registerFilter(name, fn);
});
```

#### Array Filters (11 filters)

**Category**: Collection manipulation for arrays and lists

1. `first` - Returns first element
2. `last` - Returns last element
3. `map(key)` - Extracts property values from array of objects
4. `compact` - Removes null/undefined values
5. `concat(arr2)` - Concatenates two arrays
6. `reverse` - Reverses array order
7. `sort(key?)` - Sorts array (optionally by property)
8. `sort_natural(key?)` - Case-insensitive natural sort
9. `uniq` - Returns unique values
10. `find(key, value)` - Finds first item matching property value
11. `reject(key, value)` - Filters out items matching property value

**Safety Features**:
- Input validation: `validateArraySize()` limits arrays to 10,000 items
- Null/undefined handling with optional chaining
- Type-safe object property access
- Prevents DoS via array explosion

#### String Filters (16 filters)

**Category**: Text manipulation, encoding, and formatting

1. `escape_once` - Escapes HTML without double-escaping (uses lookahead regex)
2. `newline_to_br` - Converts newlines to `<br>` tags
3. `strip_html` - Removes all HTML tags (prevents backtracking with limited regex)
4. `strip_newlines` - Removes newline characters
5. `url_encode` - URL encodes string (encodeURIComponent)
6. `url_decode` - URL decodes string (decodeURIComponent with error handling)
7. `base64_encode` - Base64 encodes with UTF-8 support (TextEncoder for Unicode/emoji)
8. `base64_decode` - Base64 decodes with UTF-8 support (TextDecoder)
9. `md5` - Mock MD5 hash (simple JS hash, non-cryptographic for preview)
10. `sha256` - Mock SHA256 hash (simple JS hash, non-cryptographic for preview)
11. `hmac_sha256` - HMAC SHA256 placeholder (delegates to sha256)
12. `remove_first(sub)` - Removes first occurrence of substring
13. `remove_last(sub)` - Removes last occurrence of substring
14. `replace_first(old, new)` - Replaces first occurrence
15. `replace_last(old, new)` - Replaces last occurrence
16. `slice(start, length?)` - Extracts substring (handles negative indices)
17. `camelize` - Converts to camelCase

**Safety Features**:
- String length validation: `validateStringLength()` limits strings to 100,000 chars
- Error handling for encoding/decoding operations
- Safe HTML escaping with lookahead to prevent double-escaping
- Unicode-aware encoding (TextEncoder/TextDecoder)

**Hash Functions Note**: MD5, SHA256, and HMAC_SHA256 return mock hashes suitable for preview rendering but NOT cryptographically secure. Designed for visual feedback only.

#### Math Filters (8 filters)

**Category**: Numeric operations and calculations

1. `abs` - Returns absolute value
2. `at_least(min)` - Returns maximum of number and min
3. `at_most(max)` - Returns minimum of number and max
4. `ceil` - Rounds up to nearest integer
5. `floor` - Rounds down to nearest integer
6. `round(precision?)` - Rounds to specified decimal places (default: 0)
7. `plus(addend)` - Adds two numbers
8. `minus(subtrahend)` - Subtracts second number from first

**Features**:
- Coerce string inputs to numbers with `Number(input) || 0`
- Supports precision parameter for rounding
- Safe arithmetic operations without overflow risk

#### Color Filters (12 filters)

**Category**: Color space conversion and manipulation

**Color Format Support**:
- Hex: `#rgb`, `#rrggbb`, `#rrggbbaa`
- RGB: `rgb(r, g, b)` or `rgba(r, g, b, a)`
- HSL: `hsl(h, s%, l%)` or `hsla(h, s%, l%, a)`

**Conversion Filters**:
1. `color_to_rgb(color)` - Converts to RGB/RGBA format
2. `color_to_hsl(color)` - Converts to HSL/HSLA format
3. `color_to_hex(color)` - Converts to hex format (always returns #rrggbb)

**Adjustment Filters**:
4. `color_lighten(color, amount)` - Lightens by amount (0-100)
5. `color_darken(color, amount)` - Darkens by amount (0-100)
6. `color_saturate(color, amount)` - Increases saturation (0-100)
7. `color_desaturate(color, amount)` - Decreases saturation (0-100)

**Analysis Filters**:
8. `color_brightness(color)` - Returns perceived brightness (0-255) using ITU-R BT.601 formula
9. `color_contrast(color)` - Returns contrasting color (black or white) for accessibility

**Advanced Filters**:
10. `color_modify(color, attr, value)` - Modifies specific attribute (alpha, hue, saturation, lightness)
11. `color_mix(color1, color2, weight?)` - Mixes two colors with optional weight (default: 50)
12. `color_extract(color, component)` - Extracts component value (red, green, blue, alpha, hue, saturation, lightness)

**Color Space Conversions**:
- **RGB to HSL**: Standard algorithm with hue range 0-360, saturation/lightness 0-100
- **HSL to RGB**: Proper hue-to-RGB conversion with hue2rgb helper function
- **Clamp Function**: Keeps values within valid ranges (0-255 for RGB, 0-100 for saturation/lightness, 0-360 for hue)

**Example Usages**:
```liquid
{{ '#e74c3c' | color_lighten: 20 }}          → Lighten red by 20%
{{ 'rgb(100, 150, 200)' | color_darken: 10 }} → Darken blue by 10%
{{ '#3498db' | color_to_hsl }}                 → Convert to HSL
{{ '#ff00ff' | color_brightness }}             → Returns brightness value
{{ '#fff' | color_contrast }}                  → Returns #000000 (black)
{{ '#ff0000' | color_mix: '#0000ff', 75 }}    → Mix red & blue (75% red)
```

#### Input Validation Strategy

**DoS Prevention**:
- `MAX_ARRAY_SIZE = 10,000`: Prevents array explosion attacks
- `MAX_STRING_LENGTH = 100,000`: Prevents string buffer overflow
- Validation functions warn to console when limits exceeded

**Type Safety**:
- All filters coerce inputs to expected types
- Graceful fallback on null/undefined inputs
- No thrown errors (returns sensible defaults)

**Regex Safety**:
- Limited regex patterns: `/<[^>]{0,1000}>/g` for HTML tag stripping
- Lookahead in `escape_once` to prevent catastrophic backtracking
- Bounded quantifiers prevent ReDoS attacks

#### Testing

**Test Coverage** (NEW test suites):
- `liquidFilters.test.ts` - Tests for array, string, and math filters
- `colorFilters.test.ts` - Tests for color conversions and manipulations

**Test Categories**:
- Input validation (null, undefined, edge cases)
- Type coercion (string to number, etc.)
- Color space conversions (round-trip hex ↔ RGB ↔ HSL)
- Unicode handling (emoji in base64 encoding)
- Error recovery (invalid inputs return sensible defaults)

#### Performance Characteristics

- **Array Operations**: O(n) complexity, optimized for preview use
- **String Encoding**: O(n) for TextEncoder/TextDecoder
- **Color Conversions**: O(1) constant time operations
- **Hash Functions**: O(n) string iteration (mock implementations)

#### Integration with LiquidJS

The `useLiquidRenderer` hook registers all filters during initialization:
- Filters are attached to the LiquidJS engine via `engine.registerFilter(name, fn)`
- All 47 filters available in Liquid template expressions during preview rendering
- Filters chain seamlessly: `{{ text | escape_once | url_encode }}`

#### Use Cases

**E-commerce Sections**:
- Price formatting: `{{ price | divide_by: 100 | round: 2 }}`
- Product colors: `{{ product.color | color_lighten: 10 }}`
- Dynamic text: `{{ section.settings.title | escape_once }}`

**Content Display**:
- HTML sanitization: `{{ user_input | strip_html | escape_once }}`
- URL encoding: `{{ search_query | url_encode }}`
- Array handling: `{{ products | map: 'title' | join: ', ' }}`

**Color Theming**:
- Accessible contrasts: `{{ brand_color | color_contrast }}`
- Color variants: `{{ primary_color | color_darken: 20 }}`
- Dynamic palettes: `{{ base_color | color_mix: '#ffffff', 80 }}`

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

#### `/app/services/ai.server.ts` (260 lines, Phase 5 enhancement)
**Purpose**: Google Gemini AI integration for Liquid section generation (Real Implementation)

**SYSTEM_PROMPT Structure** (157 lines, expanded from 65 lines):
Comprehensive prompt engineering guide for Gemini to generate production-ready Liquid sections.

**1. Core Instructions (lines 4-6)**:
- Output format: Raw Liquid code only (no markdown, no explanations)
- Required section structure validation
- Response format rules

**2. Section Structure (lines 8-21)**:
- Required order: schema, style, markup
- Schema configuration rules (name, tag, settings, blocks)
- Preset configuration requirements

**3. Input Type Catalog (lines 23-63)** - 25+ Shopify input types:
- **TEXT TYPES**: text, textarea, richtext, inline_richtext, html, liquid
- **NUMBERS**: number, range, checkbox
- **SELECTION**: select, radio, text_alignment
- **COLORS**: color, color_background
- **MEDIA**: image_picker, video, video_url, font_picker
- **RESOURCES**: article, blog, collection, page, product, url
- **RESOURCE LISTS**: article_list, blog_list, collection_list, product_list, link_list
- **METAOBJECTS**: metaobject, metaobject_list
- **DISPLAY-ONLY**: header, paragraph

**4. Validation Rules (lines 69-79)** - 10 critical rules:
1. range requires min/max/step
2. select/radio require options array
3. number default must be number type (not string)
4. richtext default must start with <p> or <ul>
5. video_url requires accept array
6. font_picker must have default
7. Resource pickers don't support defaults
8. Setting IDs must be unique
9. Block types must be unique
10. URL buttons should default to "#"

**5. Block Configuration (lines 81-93)**:
- Block structure with type, name, limit, settings
- Title precedence rules (heading → title → text → name)

**6. Preset Configuration (lines 95-102)**:
- Preset structure with name matching schema name
- Optional default values and block configurations

**7. CSS Rules (lines 104-109)**:
- Scoped styles with #shopify-section-{{ section.id }}
- Custom class prefix requirement (ai-)
- Mobile-first responsive design
- Global CSS reset restrictions

**8. Markup Rules (lines 111-114)**:
- Semantic HTML requirements
- Responsive image handling
- Accessibility standards (alt text, heading hierarchy, aria labels)

**9. Labels Format (lines 116-119)**:
- Plain text labels only (never translation keys like "t:sections....")

**10. JSON Examples (lines 121-148)** - 9 setting type examples:
- Text, Number (with correct type), Range, Select, Color, Image, Richtext, URL, Video URL

**11. Common Errors Section (lines 150-160)** - 10 anti-patterns to avoid:
1. String defaults for numbers ("5" instead of 5)
2. Range missing min/max/step
3. Select missing options
4. Richtext without <p> or <ul> wrapper
5. Translation key labels
6. Empty liquid defaults
7. Duplicate setting IDs
8. Schema inside {% if %}
9. JS-style comments in JSON
10. Missing presets

**AIService Class**:
- Implements `AIServiceInterface`
- **Constructor**: Initializes GoogleGenerativeAI if GEMINI_API_KEY set
- **generateSection(prompt)**: Uses gemini-2.5-flash model
- **stripMarkdownFences(text)**: Removes markdown code block wrappers (handles ```liquid, ```html, ``` variants)
- **getMockSection(prompt)**: Returns basic fallback Liquid section with plain text (non-translated labels)

**Error Handling**:
- Falls back to getMockSection() on API errors
- Logs warnings if API key missing
- Always returns valid Liquid code
- Handles partial markdown wrapper removal from AI responses

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

**Document Version**: 1.7
**Last Updated**: 2025-12-10
**Codebase Size**: ~19,200 tokens across 90+ files (+1,072 lines from Phase 1 filters, +500 lines from Phase 2 drops)
**Primary Language**: TypeScript (TSX)
**Recent Changes** (December 2025):
- **Phase 7 (Phase 2)**: 7 new Shopify Liquid Drop classes (forloop, request, routes, cart, customer, paginate, theme) with integrated context builder
- **Phase 6**: 47 Shopify Liquid filters (array: 11, string: 16, math: 8, color: 12) with DoS prevention & security hardening
  - `liquidFilters.ts` (285 lines): array, string, math filter implementations
  - `colorFilters.ts` (325 lines): RGB/HSL/hex color space conversions & manipulations
  - `useLiquidRenderer.ts` (462 lines): LiquidJS engine wrapper with filter registration
  - Comprehensive test coverage for all filter categories
  - Input validation: MAX_ARRAY_SIZE=10K, MAX_STRING_LENGTH=100K
  - Color filters: parse multiple formats, convert between spaces, mix colors, accessibility-aware
- **Phase 5**: SYSTEM_PROMPT rewrite (65→157 lines) with comprehensive input type catalog, validation rules, and anti-pattern guide
- **251209**: Redirect after save feature with toast notifications
- **251209**: s-select and s-text-field component consolidation
- **251202**: Billing system fixes - webhook type safety, GraphQL fallback, upgrade flow
- **Phase 04**: Component-based architecture (9 reusable UI components)
- **Phase 03**: Feature flag system, adapter pattern, mock services, dual-action save flow
