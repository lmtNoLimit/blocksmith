# Configuration & Infrastructure Scout Report

Date: 2025-12-26 | Time: 15:48
Project: AI Section Generator (Blocksmith)
Scope: Root configs, database schema, environment, build, GitHub workflows, .claude directory

## 1. ROOT CONFIGURATIONS

### 1.1 package.json
Path: /Users/lmtnolimit/working/ai-section-generator/package.json
Purpose: Node.js project metadata, dependencies, scripts

Key Settings:
- Name: ai-section-generator (private)
- Node: >=20.19 <22 || >=22.12
- Type: module (ES modules)
- Author: lmtnolimit

Core Dependencies:
- React 18.3.1, react-dom 18.3.1
- React Router 7.9.3 (full-stack)
- Shopify: shopify-app-react-router@1.0.0
- Shopify Polaris 13.9.5 + types
- Google Generative AI 0.24.1 (Gemini 2.5 Flash)
- Prisma 6.16.3 (MongoDB ORM)
- Vite 6.3.6, TypeScript 5.9.3 (strict)
- Jest 30.2.0 + ts-jest
- ESLint 8.57.1
- LiquidJS 10.24.0
- React Resizable Panels 3.0.6
- Dompurify 2.34.0

Dev Dependencies:
- Playwright 1.57.0 (E2E testing)
- Testing Library React 16.3.0
- Prettier 3.6.2

Scripts:
- build: react-router build
- dev: shopify app dev
- deploy: shopify app deploy
- start: react-router-serve ./build/server/index.js
- docker-start: setup + start
- setup: prisma generate && prisma db push
- lint: eslint with cache
- typecheck: react-router typegen + tsc
- test: jest
- test:watch, test:coverage
- test:e2e: playwright
- migrate:status: section status normalization

Workspaces: extensions/*
Trusted Dependencies: @shopify/plugin-cloudflare
Overrides:
- p-map@^4.0.0
- react-router-dom@npm:react-router@^7.9.3

### 1.2 tsconfig.json
Path: /Users/lmtnolimit/working/ai-section-generator/tsconfig.json
Purpose: TypeScript compiler config

Compiler Options:
- lib: DOM, DOM.Iterable, ES2022
- strict: true (full strict checking)
- target: ES2022
- module: ESNext
- moduleResolution: Bundler
- jsx: react-jsx
- skipLibCheck: true
- isolatedModules: true
- allowSyntheticDefaultImports: true
- noEmit: true
- allowJs: true
- resolveJsonModule: true
- forceConsistentCasingInFileNames: true
- baseUrl: .
- rootDirs: . and ./.react-router/types

Include: *.ts, *.tsx, .react-router/types/**/*
Exclude: **/__tests__/**, **/*.test.*, node_modules
Types: @react-router/node, vite/client, @shopify/app-bridge-types, @shopify/polaris-types

### 1.3 vite.config.ts
Path: /Users/lmtnolimit/working/ai-section-generator/vite.config.ts
Purpose: Vite dev server & build configuration

Server Config:
- Port: $PORT env or 3000 default
- Allowed Hosts: Dynamic from SHOPIFY_APP_URL
- CORS: preflightContinue true
- HMR (Hot Module Reload):
  - Localhost: ws://localhost:64999
  - Remote: wss://{host}:8002 (clientPort 443)
- FS Allow: [app, node_modules] (security whitelist)

Build:
- assetsInlineLimit: 0 (no inline)

Plugins:
- reactRouter()
- tsconfigPaths()

OptimizeDeps:
- Include: @shopify/app-bridge-react

Environment:
- Migrates deprecated HOST to SHOPIFY_APP_URL

### 1.4 shopify.app.toml
Path: /Users/lmtnolimit/working/ai-section-generator/shopify.app.toml
Purpose: Shopify app metadata & configuration

App Details:
- Name: Blocksmith
- Handle: blocksmith-ai
- Client ID: 7ecb57c3cbe103bb659936a2841c60b4
- Application URL: https://blocksmith.m8lab.co
- Embedded: true (admin only)

Build:
- automatically_update_urls_on_dev: true

Webhooks (API Version 2026-01):
1. app_subscriptions/update -> /webhooks/app/subscriptions_update
2. app/uninstalled -> /webhooks/app/uninstalled
3. app/scopes_update -> /webhooks/app/scopes_update

Access Scopes:
- write_files (file access)
- write_products (product modification)
- write_themes (theme publishing)
- write_app_proxy (proxy functionality)

Auth:
- Redirect URLs: https://blocksmith.m8lab.co/api/auth

App Proxy:
- URL: /api/proxy/render
- Subpath: blocksmith-preview
- Prefix: apps
- Result: https://{shop}/apps/blocksmith-preview/

### 1.5 shopify.web.toml
Path: /Users/lmtnolimit/working/ai-section-generator/shopify.web.toml
Purpose: React Router web app configuration

Settings:
- Name: React Router
- Roles: [frontend, backend]
- Webhooks Path: /webhooks/app/uninstalled

Commands:
- predev: npx prisma generate
- dev: npm exec react-router dev

## 2. DATABASE (Prisma)

### 2.1 prisma/schema.prisma
Path: /Users/lmtnolimit/working/ai-section-generator/prisma/schema.prisma
Purpose: MongoDB ORM schema with 13 models

Database: MongoDB
Client: Prisma Client JS

Models (13):

A. AUTHENTICATION:
- Session: Shopify OAuth
  Fields: id (unique), shop, isOnline, scope, expires, accessToken, userId, firstName, lastName, email, accountOwner, collaborator, emailVerified

B. CONTENT:
- Section: Generated Liquid sections
  Fields: shop, name, prompt, code (Liquid), themeId, themeName, fileName, tone, style, status (draft/active/inactive/archive), createdAt
  
- SectionTemplate: Reusable templates
  Fields: shop, title, description, category (marketing/product/content/layout), icon, prompt, code (optional), createdAt, updatedAt

C. CONFIGURATION:
- ShopSettings: Merchant preferences
  Fields: shop (unique), onboarding flags, defaultTone, defaultStyle, autoSaveEnabled, storefrontPassword (encrypted), passwordVerifiedAt, timestamps
  
- News: Dashboard announcements
  Fields: title, description, url (optional), type (update/feature/announcement), isActive, publishedAt, expiresAt (optional)

D. BILLING:
- Subscription: Active subscriptions
  Fields: shop, shopifySubId (unique), planName, status (active/cancelled/expired/pending), currentPeriodEnd, trialEndsAt, pricing (basePrice, includedQuota, overagePrice, cappedAmount), usageThisCycle, usageLineItemId
  
- UsageRecord: Charges to Shopify
  Fields: shop, subscriptionId, sectionId, idempotencyKey, amount, description, billingCycle, shopifyChargeId, chargeStatus (pending/accepted/declined/error), errorMessage, timestamps
  
- PlanConfiguration: Pricing tiers
  Fields: planName (unique: starter/growth/professional), displayName, description, pricing, features[], badge, sortOrder, isActive, timestamps
  
- FailedUsageCharge: Charge recovery queue
  Fields: shop, sectionId, errorMessage, retryCount, timestamps

E. AI/CHAT:
- Conversation: Chat sessions
  Fields: sectionId (unique, 1:1), shop, systemPrompt, modelId (gemini-2.5-flash default), title, messageCount, totalTokens, isArchived, messages[] relation
  
- Message: Individual chat messages
  Fields: conversationId, role (user/assistant/system), content, codeSnapshot, tokenCount, modelId, isError, errorMessage, conversation relation (Cascade)

Indexing:
- shop (multi-tenant isolation)
- status, category (filtering)
- createdAt (time-based)
- currentPeriodEnd, chargeStatus (billing)
- conversationId (message lookup)

## 3. ENVIRONMENT VARIABLES

### 3.1 .env.example
Path: /Users/lmtnolimit/working/ai-section-generator/.env.example

Variables:
- GEMINI_API_KEY: String (required for AI)
- SHOPIFY_API_KEY: String (auto-configured by CLI)
- SHOPIFY_API_SECRET: String (auto-configured by CLI)
- SHOPIFY_APP_URL: URL (auto-configured by CLI)
- DATABASE_URL: URI (required for database)
- BILLING_TEST_MODE: Boolean (optional)
- ENCRYPTION_KEY: Hex string 32 bytes (AES-256-GCM for passwords)

Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Dev: SQLite (file:dev.sqlite)
Prod: PostgreSQL/MySQL/MongoDB

## 4. BUILD & DEPLOYMENT

### 4.1 Dockerfile
Path: /Users/lmtnolimit/working/ai-section-generator/Dockerfile
Purpose: Production container image

Base: node:20-alpine
Setup:
- Install openssl
- WORKDIR: /app
- ENV: NODE_ENV=production

Build Steps:
1. Copy package.json, package-lock.json
2. npm ci --omit=dev && npm cache clean
3. Copy source code
4. npm run build
5. CMD: npm run docker-start

Port: 3000 (exposed)

Startup: npm run docker-start -> setup && start

### 4.2 .github/workflows/test.yml
Path: /Users/lmtnolimit/working/ai-section-generator/.github/workflows/test.yml
Purpose: GitHub Actions CI/CD pipeline

Triggers:
- Push to main, develop
- Pull requests on main, develop

Matrix:
- Node: 20.x, 22.x
- OS: ubuntu-latest

Steps:
1. Checkout (v4)
2. Setup Node with npm cache
3. npm ci
4. npm run typecheck
5. npm run lint
6. jest --coverage --maxWorkers=2
7. Upload to Codecov (Node 20.x only)
8. Upload artifacts (coverage/, 7-day retention)

## 5. TESTING & QUALITY

### 5.1 jest.config.cjs
Path: /Users/lmtnolimit/working/ai-section-generator/jest.config.cjs
Purpose: Jest test configuration

Setup:
- Preset: ts-jest
- Environment: jsdom (DOM simulation)
- Root: <rootDir>/app
- Test Pattern: **/__tests__/**/*.test.ts?(x)
- Setup File: jest.setup.cjs

Module Mapping:
- ~/* -> <rootDir>/app/*

Coverage Collection:
- Includes: app/**/*.{ts,tsx}
- Excludes: .d.ts, __tests__, entry files, root.tsx
- Excluded Services (integration tested):
  - config.server.ts
  - theme.server.ts (Shopify API)
  - ai.server.ts (Gemini API)
  - billing.server.ts
  - history.server.ts, settings.server.ts, template.server.ts
  - usage-tracking.server.ts
  - shopify-data.server.ts
  - adapters/*, flags/*

Coverage Thresholds:
- Global: 0% (early stage, TODO: increase)
- No per-file thresholds

Transform:
- TypeScript: ts-jest with jsx react-jsx

## 6. CLAUDE DEVELOPMENT FRAMEWORK

### 6.1 .claude/ Directory Structure
Purpose: AI agent orchestration system

Workflows (.claude/workflows/):
- primary-workflow.md: Implementation flow
- development-rules.md: Standards & guidelines
- orchestration-protocol.md: Multi-agent coordination
- documentation-management.md: Docs procedures

Agents (.claude/agents/ - 15+ agents):
- scout: codebase exploration
- planner: task breakdown
- fullstack-developer: implementation
- tester: test execution
- code-reviewer: quality checks
- docs-manager: documentation
- debugger: issue diagnosis
- project-manager: status tracking
- brainstormer, copywriter, etc.

Commands (.claude/commands/):
- code: implementation runner
- bootstrap: project setup
- test: test execution
- lint: code quality

Skills (.claude/skills/):
- aesthetic: design guidelines
- ai-multimodal: Gemini models, generation
- document-skills: DOCX/PPTX
- frontend-design-pro: UI/UX
- sequential-thinking: problem solving
- chrome-devtools: browser debug
- mcp-management: tool integration

Hooks (.claude/hooks/):
- scout-block: safety checks
- dev-rules-reminder: enforcement
- privacy-block: sensitive file protection
- discord_notify, telegram_notify: alerts

Scripts (.claude/scripts/):
- commands_data.json: command registry
- skills_data.json: skills registry

Configuration:
- .env: local settings
- settings.local.json: IDE config
- .ck.json: command kit
- .ckignore: exclusions

### 6.2 Development Rules Summary

Principles:
1. YAGNI (no unnecessary features)
2. KISS (keep it simple)
3. DRY (don't repeat)

File Guidelines:
- Kebab-case naming
- Max 200 lines per file
- Descriptive names for LLM readability
- Composition over inheritance

Quality Standards:
- Follow /docs code standards
- Strict TypeScript checking
- Comprehensive error handling
- No sensitive data in commits
- Conventional commit messages

Workflow:
1. Planner creates implementation plan
2. Developers code following standards
3. Tests must pass (not faked)
4. Code review before merge
5. Update docs if needed

## 7. SUMMARY TABLE

Component | Version | Key Details
-----------|---------|-------------
Node Runtime | >= 20.19 or >= 22.12 | Specified in package.json
TypeScript | 5.9.3 | Strict mode, ES2022 target
React | 18.3.1 | UI framework with JSX
React Router | 7.9.3 | Full-stack routing
Shopify Polaris | 13.9.5 | Design system + components
Google Gemini | 2.5 Flash | AI text generation
Prisma | 6.16.3 | MongoDB ORM, 13 models
Vite | 6.3.6 | Fast dev server + build
Jest | 30.2.0 | Testing with jsdom
ESLint | 8.57.1 | TypeScript + React plugins
Docker | Alpine Node 20 | Production container
CI/CD | GitHub Actions | Node 20/22 matrix, coverage

## 8. KEY FILES IDENTIFIED

Root Configs:
- /package.json - Dependencies, scripts, node engines
- /tsconfig.json - TypeScript strict mode
- /vite.config.ts - Dev server, HMR, plugins
- /shopify.app.toml - App metadata, scopes, webhooks
- /shopify.web.toml - React Router commands

Database:
- /prisma/schema.prisma - 13 MongoDB models

Build & Deployment:
- /Dockerfile - Alpine Node 20, production build
- /.github/workflows/test.yml - CI/CD matrix testing

Testing:
- /jest.config.cjs - ts-jest, jsdom, app coverage

Development:
- /.claude/workflows/ - Primary workflow, rules
- /.claude/agents/ - 15+ specialized agents
- /.claude/commands/ - Task runners
- /.claude/hooks/ - Safety & enforcement

## 9. UNRESOLVED QUESTIONS

1. ENCRYPTION_KEY rotation strategy in production?
2. MongoDB backup/disaster recovery plan?
3. Gemini API rate limiting & fallback strategy?
4. Billing edge cases tested in CI/CD?
5. Scaling limits: max concurrent users, WebSocket support?
6. Email notifications for billing events?
7. Analytics/monitoring for Gemini API usage?
8. Rollback strategy for failed deployments?
9. Database migration strategy for schema changes?
10. Error handling for webhook delivery failures?

