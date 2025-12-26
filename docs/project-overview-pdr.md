# AI Section Generator - Project Overview & PDR

## Project Summary

AI Section Generator is a Shopify embedded app that enables merchants to generate custom Liquid sections for their themes using AI (Google Gemini). Merchants describe sections via natural language prompts, receive generated Liquid code, preview it, and save directly to their Shopify themes.

## Core Value Proposition

- **Rapid Section Creation**: Merchants create custom theme sections in minutes vs hours of manual coding
- **No Technical Expertise Required**: Natural language prompts eliminate need for Liquid/HTML/CSS knowledge
- **Direct Theme Integration**: Generated sections save directly to selected Shopify themes via GraphQL API
- **AI-Powered Quality**: Google Gemini 2.0 Flash generates production-ready, responsive, accessible Liquid code

## Target Users

1. **Shopify Merchants**: Store owners wanting custom sections without hiring developers
2. **Shopify Designers**: Theme customizers accelerating section prototyping
3. **Agency Teams**: Developers streamlining client theme customization

## Product Development Requirements

### Functional Requirements

#### FR1: AI Section Generation
- **Priority**: P0 (Critical)
- **Description**: Generate Liquid sections from natural language prompts
- **Acceptance Criteria**:
  - User enters prompt describing desired section
  - System sends prompt to Google Gemini API with specialized system instructions
  - Generated code includes schema block, style block, and Liquid markup
  - All CSS properly scoped with section ID to prevent conflicts
  - Includes 5-7 configurable settings in schema
  - Falls back to mock response if API unavailable
- **Dependencies**: Google Gemini API, env var GEMINI_API_KEY
- **Status**: Implemented

#### FR2: Theme Selection & Section Saving
- **Priority**: P0 (Critical)
- **Description**: Save generated sections to merchant Shopify themes
- **Acceptance Criteria**:
  - Fetch all merchant themes via GraphQL
  - Display themes with role (MAIN, UNPUBLISHED, etc)
  - Default selection to active (MAIN) theme
  - User specifies filename (auto-append .liquid, auto-prefix sections/)
  - Use themeFilesUpsert mutation to save
  - Display success/error messages
  - Handle GraphQL userErrors gracefully
- **Dependencies**: Shopify write_themes scope approval (pending)
- **Status**: Implemented, awaiting scope approval

#### FR3: Code Preview
- **Priority**: P1 (High)
- **Description**: Display generated Liquid code before saving
- **Acceptance Criteria**:
  - Render code in scrollable, monospace pre block
  - Code visible immediately after generation
  - User can review before saving
  - Code persists during theme/filename changes
- **Status**: Implemented

#### FR4: Session Persistence
- **Priority**: P1 (High)
- **Description**: Maintain merchant authentication and data
- **Acceptance Criteria**:
  - Store sessions in database via Prisma
  - Support offline and online access tokens
  - Track shop, scope, user metadata
  - Handle scope updates via webhook
  - Clean up on app uninstall
- **Status**: Implemented

#### FR5: Draft & Saved Section Management
- **Priority**: P1 (High)
- **Description**: Support two-action save flow with draft persistence and theme publishing
- **Acceptance Criteria**:
  - Generate action returns code only (no DB save)
  - "Save Draft" creates section with status="draft" (no theme required)
  - "Publish to Theme" saves section with status="saved" + publishes to Shopify theme
  - Draft sections can be edited and regenerated without affecting saved versions
  - Saved sections retain theme and filename metadata
  - Both create and edit pages support the dual-action save flow
  - Toast notification "Section saved" on successful save
  - Auto-redirect to edit page after save
  - Display status badge (Draft/Saved) on edit page
- **Dependencies**: Section database model with status, themeId, themeName, fileName fields
- **Status**: Implemented

### Non-Functional Requirements

#### NFR1: Performance
- **Section Generation**: < 10s for 95th percentile
- **Theme Fetching**: < 2s for 95th percentile
- **Section Saving**: < 3s for 95th percentile
- **App Load Time**: < 1s on 3G connection

#### NFR2: Reliability
- **Uptime**: 99.5% availability
- **Error Handling**: Graceful degradation (fallback to mock when API fails)
- **Data Integrity**: Atomic theme file operations

#### NFR3: Security
- **Authentication**: Shopify OAuth 2.0 with session tokens
- **Authorization**: Scope-based access (read_themes, write_themes, write_products)
- **API Keys**: Stored securely in environment variables
- **HTTPS**: All communication encrypted

#### NFR4: Scalability
- **Database**: SQLite for dev, PostgreSQL/MySQL recommended for production
- **Session Storage**: Supports distributed deployment with proper DB
- **API Rate Limits**: Respect Shopify Admin API bucket limits

#### NFR5: Usability
- **Interface**: Polaris web components for native Shopify UX
- **Responsive**: Works on desktop and mobile
- **Accessibility**: ARIA labels, keyboard navigation
- **Error Messages**: Clear, actionable feedback

## Technical Architecture

### Stack Overview
- **Frontend**: React 18, React Router 7
- **Backend**: Node.js (>= 20.19), React Router server-side
- **Database**: Prisma ORM with SQLite (dev) / configurable for production
- **AI**: Google Generative AI SDK (Gemini 2.0 Flash)
- **Shopify Integration**: @shopify/shopify-app-react-router
- **UI**: Polaris Web Components
- **Build**: Vite 6

### Application Structure
```
app/
├── routes/                    # React Router file-based routing
│   ├── app._index.tsx        # Home page (template demo)
│   ├── app.sections.new.tsx  # Create section with dual-action save
│   ├── app.sections.$id.tsx  # Edit section with AI conversation panel
│   ├── app.generate.tsx      # Legacy AI section generator (deprecated)
│   ├── app.additional.tsx    # Demo page
│   ├── app.tsx               # Layout with nav
│   ├── webhooks.*.tsx        # Webhook handlers
│   └── auth.*.tsx            # Auth flows
├── services/                 # Business logic
│   ├── section.server.ts     # Section CRUD operations
│   ├── ai.server.ts          # Gemini integration
│   ├── theme.server.ts       # Shopify theme operations
│   └── usage-tracking.server.ts # Generation tracking
├── components/               # Reusable UI components
│   ├── generate/            # Generate feature components
│   │   ├── GenerateLayout.tsx
│   │   ├── GenerateInputColumn.tsx
│   │   ├── GeneratePreviewColumn.tsx
│   │   ├── CodePreview.tsx
│   │   ├── ThemeSelector.tsx
│   │   └── ...
│   └── preview/             # Preview rendering components
├── shopify.server.ts         # Shopify app config
├── db.server.ts              # Prisma client
└── root.tsx                  # HTML root
```

### Key APIs & Integrations

#### Shopify Admin GraphQL API
- **Version**: October 2025 (2025-10)
- **Scopes**: write_products, write_themes, read_themes
- **Endpoints**:
  - `themes` query: List merchant themes
  - `themeFilesUpsert` mutation: Create/update theme files

#### Google Gemini API
- **Model**: gemini-2.0-flash-exp
- **Configuration**:
  - System instruction for Shopify Liquid expertise
  - Structured output (schema + style + markup)
  - Temperature: default
  - Safety settings: default

### Database Schema

#### Session Table
Stores Shopify OAuth sessions:
- `id` (PK): Session identifier
- `shop`: Shopify shop domain
- `state`: OAuth state
- `isOnline`: Online vs offline token
- `scope`: Granted scopes
- `expires`: Token expiration
- `accessToken`: Shopify access token
- `userId`, `firstName`, `lastName`, `email`: User metadata
- `accountOwner`, `collaborator`, `emailVerified`: User flags

#### GeneratedSection Table
Historical record of generated sections:
- `id` (PK): UUID
- `shop`: Shop domain
- `prompt`: User prompt
- `content`: Generated Liquid code
- `createdAt`: Timestamp

## Current Status

### Completed (Phase 4 - 100% - Settings & Context)
- ✅ Advanced editor layout with 3-panel design (chat + code + preview)
- ✅ Chat versioning and code version tracking
- ✅ 25+ Shopify Liquid filters (array, string, math, color, media, font, metafield)
- ✅ 9+ Shopify Liquid tags (form, paginate, style, tablerow, etc.)
- ✅ 18 context drops for shop, products, collections, articles, customers
- ✅ 20+ schema setting UI components
- ✅ Full TypeScript strict mode throughout codebase
- ✅ 30+ Jest test suites with comprehensive coverage
- ✅ Billing system with usage tracking and quota management
- ✅ Multi-tenant isolation with shop domain verification

### Completed (Phase 3 - 100% - Theme Integration & Editing)
- ✅ Shopify app setup with OAuth authentication
- ✅ React Router 7 migration (complete)
- ✅ AI service integration with Google Gemini 2.5 Flash
- ✅ Section generation with prompt → Liquid code (137-line system prompt)
- ✅ Theme fetching via GraphQL
- ✅ Theme file saving with themeFilesUpsert mutation
- ✅ UI with Polaris web components (`<s-*>` elements)
- ✅ Database schema with Prisma (8 models: Session, Section, SectionTemplate, ShopSettings, Subscription, UsageRecord, PlanConfiguration, FailedUsageCharge)
- ✅ Webhook handlers (uninstall, scopes_update, subscriptions_update)
- ✅ Dual-action save flow (Save Draft + Publish to Theme)
- ✅ Redirect to edit page after section save with toast notifications
- ✅ Section editing and regeneration capability
- ✅ Code preview with syntax highlighting
- ✅ Feature flag system with adapter pattern (mock/real services)
- ✅ Comprehensive error handling and user feedback
- ✅ 9 reusable UI components (Phase 04 refactoring complete)
- ✅ Billing system with hybrid pricing (base recurring + usage-based)
- ✅ Multi-tenant architecture with session isolation
- ✅ Subscription webhook processing with GraphQL fallback

### Pending
- ⏳ **Shopify approval for write_themes scope** (blocking production deployment)
- ⏳ Production deployment (Google Cloud Run, Fly.io, or Render)
- ⏳ Database migration to PostgreSQL (production-grade)
- ⏳ Rate limiting and DDoS protection
- ⏳ Analytics and usage dashboards
- ⏳ User acceptance testing and feedback loops

### Future Enhancements (Phase 5+)
- Section template library with community templates
- Section versioning with rollback capability
- Section marketplace and sharing platform
- Advanced framework preferences (TailwindCSS, SCSS, etc.)
- Batch section generation
- A/B testing and analytics dashboard
- Multi-language section generation
- API for programmatic section creation

## Risk Assessment

### Technical Risks
1. **Gemini API Reliability**: Mitigated by fallback mock response
2. **Shopify Scope Approval Delay**: Currently blocking production; no mitigation
3. **SQLite Single-Instance Limit**: Requires DB migration for scale; documented in README
4. **GraphQL Rate Limits**: Needs rate limit handling for high-traffic scenarios

### Business Risks
1. **Gemini API Costs**: Usage-based pricing may scale with user adoption
2. **Code Quality Variance**: AI-generated code quality depends on prompt clarity
3. **Shopify API Changes**: Breaking changes in Admin API require updates

## Success Metrics

### Adoption Metrics
- Monthly active users (MAU)
- Section generation attempts per user
- Section save success rate
- User retention (D7, D30)

### Performance Metrics
- Average section generation time
- API error rate
- Theme save success rate
- Page load times

### Quality Metrics
- User satisfaction score (survey)
- Generated section usage rate (sections kept vs deleted)
- Support ticket volume

## Compliance & Security

### Data Privacy
- Minimal PII collection (email, name from Shopify)
- Session tokens stored encrypted
- No generated code stored beyond logging (only in GeneratedSection table)

### Shopify Requirements
- Embedded app (runs in Shopify admin iframe)
- GDPR webhook handlers (planned)
- App store listing requirements compliance

### API Key Management
- Environment variables for secrets
- No keys committed to repository
- Production key rotation policy needed

## Next Steps

1. **Immediate**: Obtain write_themes scope approval from Shopify
2. **Short-term**: Production deployment with PostgreSQL
3. **Mid-term**: User testing, analytics implementation
4. **Long-term**: Feature enhancements (editing, templates, history)

---

**Document Version**: 1.2
**Last Updated**: 2025-12-26
**Status**: Phase 4 Complete - Production Ready (awaiting Shopify scope approval)
