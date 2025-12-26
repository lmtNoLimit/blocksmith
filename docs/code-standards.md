# Code Standards & Guidelines

## Overview

This document defines code standards, patterns, and best practices for the AI Section Generator Shopify app. All contributors must follow these guidelines to maintain code quality, consistency, and maintainability.

## Technology Stack Standards

### Core Technologies
- **Runtime**: Node.js >= 20.19 or >= 22.12
- **Language**: TypeScript 5.9+
- **Framework**: React Router 7.9+
- **UI Library**: React 18.3+, Shopify Polaris Web Components
- **Database**: Prisma 6.16+ with SQLite (dev) or PostgreSQL/MySQL (production)
- **AI Integration**: Google Generative AI SDK 0.24+
- **Shopify Integration**: @shopify/shopify-app-react-router 1.0+

### Build & Development Tools
- **Build Tool**: Vite 6.3+
- **Package Manager**: npm (preferred) or yarn/pnpm
- **Linting**: ESLint 8.57+ with TypeScript, React, JSX a11y plugins
- **Code Formatting**: Prettier 3.6+
- **Type Checking**: TypeScript strict mode enabled

## File & Directory Structure

### Directory Organization

```
app/
├── routes/              # React Router file-based routes
│   ├── app.*.tsx        # Protected app routes (require auth)
│   ├── auth.*.tsx       # Authentication routes
│   ├── webhooks.*.tsx   # Webhook handlers
│   └── _index/          # Public landing page
├── services/            # Business logic services
│   └── *.server.ts      # Server-only service modules
├── components/          # Shared React components (future)
├── utils/               # Utility functions (future)
├── types/               # TypeScript type definitions (future)
├── shopify.server.ts    # Shopify app config
├── db.server.ts         # Prisma client
├── entry.server.tsx     # Server entry point
├── root.tsx             # HTML root
└── routes.ts            # Route configuration
```

### Naming Conventions

#### Files
- **Routes**: kebab-case with React Router conventions
  - `app.generate.tsx` (nested route under /app)
  - `webhooks.app.uninstalled.tsx` (webhook route)
- **Services**: camelCase with `.server.ts` suffix
  - `ai.server.ts`, `theme.server.ts`
- **Components**: PascalCase
  - `GenerateSection.tsx`, `ThemeSelector.tsx`
- **Utilities**: camelCase
  - `formatDate.ts`, `validatePrompt.ts`
- **Types**: PascalCase with `.types.ts` suffix
  - `Section.types.ts`, `Theme.types.ts`

#### Variables & Functions
- **Constants**: SCREAMING_SNAKE_CASE
  ```typescript
  const SYSTEM_PROMPT = "...";
  const MAX_PROMPT_LENGTH = 1000;
  ```
- **Variables**: camelCase
  ```typescript
  const generatedCode = await aiService.generateSection(prompt);
  const selectedTheme = themes[0];
  ```
- **Functions**: camelCase, verb-first
  ```typescript
  async function generateSection(prompt: string) { }
  function validateFileName(name: string) { }
  ```
- **React Components**: PascalCase
  ```typescript
  function GeneratePage() { }
  export default function App() { }
  ```
- **Classes**: PascalCase
  ```typescript
  class AIService { }
  class ThemeService { }
  ```

## TypeScript Standards

### Strict Mode Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Type Definitions

#### Use Explicit Types for Function Parameters
```typescript
// ✅ Good
async function generateSection(prompt: string): Promise<string> {
  // ...
}

// ❌ Bad
async function generateSection(prompt) {
  // ...
}
```

#### Use Type Imports
```typescript
// ✅ Good
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

// ❌ Bad (mixes runtime and type imports)
import { ActionFunctionArgs } from "react-router";
```

#### Define Interfaces for Objects
```typescript
// ✅ Good
interface Theme {
  id: string;
  name: string;
  role: "MAIN" | "UNPUBLISHED" | "DEVELOPMENT";
}

// ❌ Bad
const theme: any = { id: "123", name: "Dawn" };
```

#### Avoid `any` Type
```typescript
// ✅ Good
function handleEvent(e: React.ChangeEvent<HTMLInputElement>) {
  setPrompt(e.target.value);
}

// ❌ Bad (currently in codebase, needs fixing)
function handleEvent(e: any) {
  setPrompt(e.target.value);
}
```

### Type Exports
```typescript
// Export types from service modules
export type Section = {
  id: string;
  content: string;
  prompt: string;
};

export interface AIServiceInterface {
  generateSection(prompt: string): Promise<string>;
}
```

## React & React Router Standards

### Component Structure

#### Functional Components with Hooks
```typescript
import { useState } from "react";
import { useLoaderData, useActionData } from "react-router";

export default function GeneratePage() {
  const { themes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [prompt, setPrompt] = useState("");

  // Component logic

  return (
    <s-page title="Generate Section">
      {/* JSX */}
    </s-page>
  );
}
```

#### Export Loader and Action Functions
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  const themes = await themeService.getThemes(request);
  return { themes };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "generate") {
    // Handle generation
  }

  return { success: true };
}
```

### React Hooks Best Practices

#### Use Effect Dependencies Correctly
```typescript
// ✅ Good
useEffect(() => {
  if (fetcher.data?.product?.id) {
    shopify.toast.show("Product created");
  }
}, [fetcher.data?.product?.id, shopify]);

// ❌ Bad (missing dependencies)
useEffect(() => {
  shopify.toast.show("Product created");
}, []);
```

#### Extract Complex Logic to Custom Hooks
```typescript
// ✅ Good
function useThemeSelection(themes: Theme[]) {
  const activeTheme = themes.find(t => t.role === "MAIN");
  const [selectedTheme, setSelectedTheme] = useState(activeTheme?.id || themes[0]?.id || "");

  return [selectedTheme, setSelectedTheme] as const;
}
```

### Form Handling

#### Use FormData and useSubmit
```typescript
import { useSubmit } from "react-router";

const submit = useSubmit();

function handleGenerate() {
  const formData = new FormData();
  formData.append("action", "generate");
  formData.append("prompt", prompt);
  submit(formData, { method: "post" });
}
```

## Shopify Integration Standards

### Authentication

#### Always Authenticate Routes
```typescript
// ✅ Good
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  // Route logic
}

// ❌ Bad (no authentication)
export async function loader({ request }: LoaderFunctionArgs) {
  // Direct API call without auth
}
```

#### Use Admin Client for GraphQL
```typescript
export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query getThemes {
      themes(first: 10) {
        edges {
          node {
            id
            name
            role
          }
        }
      }
    }
  `);

  const data = await response.json();
  return data;
}
```

### GraphQL Standards

#### Use Tagged Template Literals with #graphql
```typescript
// ✅ Good
const response = await admin.graphql(
  `#graphql
  query getThemes {
    themes(first: 10) {
      edges {
        node {
          id
          name
          role
        }
      }
    }
  }`
);

// ❌ Bad (no #graphql tag for syntax highlighting)
const response = await admin.graphql(`
  query getThemes {
    themes(first: 10) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`);
```

#### Handle GraphQL Errors
```typescript
const data = await response.json();

if (data.data?.themeFilesUpsert?.userErrors?.length > 0) {
  const errors = data.data.themeFilesUpsert.userErrors;
  throw new Error(`Failed: ${errors.map(e => e.message).join(', ')}`);
}

return data.data?.themeFilesUpsert?.upsertedThemeFiles?.[0];
```

### Webhook Handlers

#### Webhook Route Naming
- Pattern: `webhooks.<topic>.tsx`
- Example: `webhooks.app.uninstalled.tsx`

#### Webhook Action Structure
```typescript
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Handle webhook logic

  return new Response();
};
```

## Service Layer Standards

### Service Class Pattern

```typescript
export class AIService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateSection(prompt: string): Promise<string> {
    if (!this.genAI) {
      console.warn("API key not set. Using fallback.");
      return this.getFallback(prompt);
    }

    try {
      // Main logic
      return result;
    } catch (error) {
      console.error("Error:", error);
      return this.getFallback(prompt);
    }
  }

  private getFallback(prompt: string): string {
    // Fallback logic
  }
}

export const aiService = new AIService();
```

### Service Method Guidelines
- Use async/await for asynchronous operations
- Include try-catch for external API calls
- Provide fallback mechanisms
- Log warnings/errors with context
- Return typed responses
- Validate inputs before processing

## Database & Prisma Standards

### Schema Design

#### Use Descriptive Field Names
```prisma
model Session {
  id            String    @id
  shop          String
  accessToken   String
  expires       DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

#### Index Frequently Queried Fields
```prisma
model GeneratedSection {
  id        String   @id @default(uuid())
  shop      String
  createdAt DateTime @default(now())

  @@index([shop])
  @@index([createdAt])
}
```

### Prisma Client Usage

#### Use Singleton Pattern
```typescript
// db.server.ts
declare global {
  var prismaGlobal: PrismaClient;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();
export default prisma;
```

#### Use Type-Safe Queries
```typescript
// ✅ Good
const session = await prisma.session.findUnique({
  where: { id: sessionId },
  select: { shop: true, accessToken: true }
});

// ❌ Bad (raw SQL unless necessary)
const session = await prisma.$queryRaw`SELECT * FROM Session WHERE id = ${sessionId}`;
```

## Error Handling Standards

### Service Layer Error Handling

```typescript
async generateSection(prompt: string): Promise<string> {
  try {
    const result = await this.genAI.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini API error:", error);

    // Provide fallback
    return this.getMockSection(prompt);
  }
}
```

### Route Error Handling

```typescript
export async function action({ request }: ActionFunctionArgs) {
  try {
    const result = await themeService.createSection(request, themeId, fileName, content);
    return {
      success: true,
      message: `Saved to ${result?.filename}!`
    };
  } catch (error) {
    console.error("Failed to save:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save."
    };
  }
}
```

### User-Facing Error Messages
- ✅ "Failed to save section. Please try again."
- ✅ "Theme not found. Please select a valid theme."
- ❌ "Error: ECONNREFUSED 127.0.0.1:3000"
- ❌ "undefined is not a function"

## UI & Polaris Web Components Standards

### Component Usage

```typescript
// ✅ Good - Use Polaris web components
<s-page title="Generate Section">
  <s-section>
    <s-stack gap="400" vertical>
      <s-text variant="headingMd" as="h2">
        Section Generator
      </s-text>
      <s-text-field
        label="Prompt"
        value={prompt}
        onInput={(e) => setPrompt(e.target.value)}
        multiline="4"
        autoComplete="off"
      />
      <s-button
        variant="primary"
        onClick={handleGenerate}
      >
        Generate
      </s-button>
    </s-stack>
  </s-section>
</s-page>
```

### Loading States
```typescript
const isLoading = navigation.state === "submitting";
const isGenerating = isLoading && navigation.formData?.get("action") === "generate";

<s-button
  loading={isGenerating ? "true" : undefined}
  onClick={handleGenerate}
>
  Generate Code
</s-button>
```

### User Feedback
```typescript
{actionData?.success && (
  <s-banner tone="success" heading="Success" dismissible>
    {actionData.message}
  </s-banner>
)}
{actionData?.success === false && (
  <s-banner tone="critical" heading="Error">
    {actionData.message}
  </s-banner>
)}
```

## Environment Variables Standards

### Required Variables
```bash
# Shopify (auto-set by CLI)
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-app.com
SCOPES=write_products,write_themes,read_themes

# Database
DATABASE_URL=file:dev.sqlite  # dev
DATABASE_URL=postgresql://...  # production

# AI
GEMINI_API_KEY=your_gemini_key  # optional, falls back to mock
```

### Accessing Environment Variables
```typescript
// ✅ Good
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY not set. Using fallback.");
}

// ❌ Bad (no fallback)
const apiKey = process.env.GEMINI_API_KEY!;  // Assumes always exists
```

## Testing Standards (Future)

### Unit Tests
- Test business logic in services
- Mock external dependencies (Shopify API, Gemini API)
- Use Jest or Vitest
- Target 80%+ code coverage

### Integration Tests
- Test route loaders and actions
- Test database operations
- Use test database instance

### E2E Tests
- Test complete user flows
- Use Playwright or Cypress
- Test in embedded Shopify admin context

## Security Standards

### Input Validation
```typescript
// ✅ Good
function validatePrompt(prompt: string): string {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }
  if (prompt.length > 2000) {
    throw new Error("Prompt too long (max 2000 characters)");
  }
  return prompt.trim();
}
```

### Sanitization
```typescript
// ✅ Good - Sanitize filename
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-z0-9-_]/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}
```

### API Key Protection
- ✅ Store in environment variables
- ✅ Never commit to repository
- ✅ Use .env files (gitignored)
- ✅ Rotate keys regularly in production

## Performance Standards

### Optimize Database Queries
```typescript
// ✅ Good - Select only needed fields
const sessions = await prisma.session.findMany({
  where: { shop },
  select: { id: true, accessToken: true }
});

// ❌ Bad - Select all fields
const sessions = await prisma.session.findMany({
  where: { shop }
});
```

### Lazy Load Components
```typescript
// Future enhancement
import { lazy } from "react";
const GenerateSection = lazy(() => import("./components/GenerateSection"));
```

### Minimize API Calls
- Cache theme list when possible
- Batch GraphQL queries
- Use React Query for client-side caching (future)

## Documentation Standards

### Code Comments

#### When to Comment
- Complex business logic
- Non-obvious implementation decisions
- API integration specifics
- Workarounds or hacks

```typescript
// ✅ Good
// Gemini requires system instruction to enforce Liquid structure
const model = this.genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: SYSTEM_PROMPT
});
```

#### JSDoc for Public APIs
```typescript
/**
 * Generates a Shopify Liquid section from a natural language prompt.
 *
 * @param prompt - User's description of desired section
 * @returns Generated Liquid code including schema, styles, and markup
 * @throws Error if prompt is empty or invalid
 *
 * @example
 * const code = await aiService.generateSection("A hero section with CTA");
 */
async generateSection(prompt: string): Promise<string> {
  // ...
}
```

### README Updates
- Update README when adding features
- Document new environment variables
- Update setup instructions
- Add troubleshooting tips

## Git & Version Control Standards

### Commit Messages
- Use conventional commits format
- Examples:
  - `feat: add section history viewer`
  - `fix: handle theme save errors gracefully`
  - `docs: update environment variable guide`
  - `refactor: extract theme service class`
  - `test: add unit tests for AI service`

### Branch Naming
- `feature/section-editing`
- `fix/theme-save-error`
- `docs/api-documentation`
- `refactor/service-layer`

### Pull Request Guidelines
- Descriptive title and description
- Link to related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Request code review

## Deprecation & Migration

### Marking Deprecated Code
```typescript
/**
 * @deprecated Use generateSectionV2 instead
 * This method will be removed in v2.0
 */
async generateSection(prompt: string): Promise<string> {
  // ...
}
```

### Migration Path
- Document migration steps in CHANGELOG.md
- Provide deprecation warnings in console
- Maintain backward compatibility for 1 major version
- Remove deprecated code with major version bump

---

**Document Version**: 1.2
**Last Updated**: 2025-12-26
**Compliance**: All code must follow these standards (strictly enforced)
**Current Status**: Phase 4 Complete - All 275 files pass TypeScript strict mode
**Key Enforcements**:
- TypeScript strict mode throughout codebase
- 30+ Jest test suites covering critical paths
- 95+ React components following feature-based organization
- 25+ server services with clear separation of concerns
- Multi-tenant isolation via shop domain verification
- Comprehensive error handling and input validation
