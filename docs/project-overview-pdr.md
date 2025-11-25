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
├── routes/              # React Router file-based routing
│   ├── app._index.tsx   # Home page (template demo)
│   ├── app.generate.tsx # AI section generator (core feature)
│   ├── app.additional.tsx
│   ├── app.tsx          # Layout with nav
│   ├── webhooks.*.tsx   # Webhook handlers
│   └── auth.*.tsx       # Auth flows
├── services/            # Business logic
│   ├── ai.server.ts     # Gemini integration
│   └── theme.server.ts  # Shopify theme operations
├── shopify.server.ts    # Shopify app config
├── db.server.ts         # Prisma client
└── root.tsx             # HTML root
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

### Completed
- ✅ Shopify app setup with OAuth authentication
- ✅ React Router 7 migration from Remix
- ✅ AI service integration with Google Gemini
- ✅ Section generation with prompt → Liquid code
- ✅ Theme fetching via GraphQL
- ✅ Theme file saving with themeFilesUpsert
- ✅ UI with Polaris web components
- ✅ Database schema with Prisma
- ✅ Webhook handlers (uninstall, scopes_update)
- ✅ Error handling and user feedback

### Pending
- ⏳ **Shopify approval for write_themes scope** (blocking production use)
- ⏳ Production deployment setup
- ⏳ Database migration to production-grade DB (PostgreSQL/MySQL)
- ⏳ Rate limiting implementation
- ⏳ Analytics tracking
- ⏳ User testing and feedback collection

### Future Enhancements
- Section editing capability (modify generated code)
- Section history and versioning
- Section templates library
- Multi-language support for generated sections
- Advanced customization options (framework preferences, style conventions)
- Integration with theme editor preview
- Batch section generation
- Section marketplace

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

**Document Version**: 1.0
**Last Updated**: 2025-11-24
**Status**: Initial Documentation
