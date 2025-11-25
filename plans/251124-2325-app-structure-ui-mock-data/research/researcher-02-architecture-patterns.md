# Research Report: React Router 7 App Structure & Architecture Patterns

## Executive Summary

React Router 7 enables file-based routing with SSR capabilities, making it ideal for Shopify embedded apps. Recommended patterns combine **feature-based folder organization** with **layered service architecture** for scalability. For the AI Section Generator app, adopt hierarchical services (AIService, ThemeService) with dependency injection, organize by feature modules (auth/, generate/, admin/), and maintain strict separation between presentation (routes), business logic (services), and data (db/models). This approach scales from 1-100+ developers and handles complex interdependencies.

## Research Scope

**Coverage**: React Router 7 architecture, file organization patterns, service layer design, feature-based vs. layer-based structures, dependency injection, and scalability patterns for Shopify apps.

**Sources**: React Router official docs, GitHub repos, industry best practices from 2024-2025, current codebase analysis (AI Section Generator).

**Date Range**: 2024-2025 materials prioritized.

---

## Key Findings

### 1. React Router 7 Architecture Fundamentals

**Route Module Pattern**: Each route file exports `loader`, `action`, and a React component. Routes can nest, share layouts, and include error boundaries.

```
app/
├── routes/
│   ├── app.tsx                    // Layout wrapper, error boundary
│   ├── app.generate.tsx           // Route with loader + action
│   ├── app.additional.tsx
│   ├── app._index.tsx
│   ├── auth.login/
│   │   └── route.tsx
│   └── webhooks.*.tsx
```

**Key Advantages**:
- Server-side rendering (SSR) with data loaders
- Form handling via action functions
- Automatic code splitting
- Nested routing with shared layouts
- Type-safe with TypeScript

**Current App Alignment**: AI Section Generator correctly uses route modules. `app.generate.tsx` properly implements loader (fetch themes) and action (generate, save) pattern.

---

### 2. Recommended Directory Structures

#### **Option A: Feature-Based Organization** (RECOMMENDED FOR AI SECTION GENERATOR)

```
app/
├── features/                        # Organized by feature
│   ├── auth/
│   │   ├── routes/
│   │   │   ├── login.tsx
│   │   │   └── callback.tsx
│   │   ├── services/
│   │   │   └── auth.server.ts
│   │   └── types/
│   │       └── auth.types.ts
│   │
│   ├── generate/                    # Core AI feature
│   │   ├── routes/
│   │   │   └── generate.tsx
│   │   ├── services/
│   │   │   ├── ai.server.ts
│   │   │   └── theme.server.ts
│   │   ├── components/
│   │   │   ├── PromptInput.tsx
│   │   │   ├── ThemeSelector.tsx
│   │   │   └── CodePreview.tsx
│   │   ├── types/
│   │   │   └── generate.types.ts
│   │   └── hooks/
│   │       └── useGeneration.ts
│   │
│   ├── admin/                       # Future: Admin features
│   │   ├── routes/
│   │   ├── services/
│   │   └── components/
│   │
│   └── shared/
│       ├── components/              # Reusable UI components
│       │   ├── Button.tsx
│       │   └── Card.tsx
│       ├── hooks/
│       │   ├── useAsync.ts
│       │   └── useShop.ts
│       ├── utils/
│       │   ├── validation.ts
│       │   └── formatting.ts
│       └── types/
│           └── common.types.ts
│
├── db/                              # Data layer
│   ├── schema.prisma
│   └── db.server.ts
│
├── services/                        # Shared services (cross-feature)
│   ├── shopify.server.ts
│   └── logger.server.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   └── error.middleware.ts
│
└── types/
    └── global.types.ts
```

**Pros**: Scales well, easy to isolate features, clear ownership, reduces interdependencies.

**Cons**: Risk of folder proliferation if not disciplined.

---

#### **Option B: Layer-Based Organization** (CURRENT APPROACH, WORKS AT CURRENT SCALE)

```
app/
├── routes/                          # All routes
├── services/                        # All business logic
├── db/
├── hooks/
├── components/
└── types/
```

**Current State**: AI Section Generator uses this pattern successfully. Works well for <10 routes. Becomes unwieldy at 50+ routes.

**When to Migrate**: Migrate to feature-based when:
- 3+ features with distinct domains (auth, generate, history, admin)
- Services used by only one feature (ai.server.ts → generate/services/)
- Component reuse across features increases

---

### 3. Service Layer Patterns & Dependency Injection

#### **Recommended Pattern: Class-Based Services with Singleton**

```typescript
// services/ai.server.ts
class AIService {
  private client: GoogleGenerativeAI | null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateSection(prompt: string): Promise<string> {
    if (!this.client) {
      console.warn("GEMINI_API_KEY not set, using mock");
      return this.getMockSection(prompt);
    }
    // Generate logic
  }

  private getMockSection(prompt: string): string {
    // Mock implementation
  }
}

// Export singleton instance
export const aiService = new AIService(process.env.GEMINI_API_KEY);
```

**Current Implementation**: AI Section Generator already uses this pattern well. Singleton pattern prevents multiple API client instantiations.

#### **Dependency Injection for Testing**

```typescript
// services/ai.test.ts
class AIServiceTestable {
  constructor(private client: GoogleGenerativeAI | MockClient) {}

  async generateSection(prompt: string): Promise<string> {
    // Same logic, but client is injectable
  }
}

// Test setup
const mockClient = {
  getGenerativeModel: jest.fn().mockReturnValue({
    generateContent: jest.fn().mockResolvedValue(/* mock response */)
  })
};

const aiService = new AIServiceTestable(mockClient);
```

**Benefit**: Enables unit testing without API calls.

---

#### **Service Composition Pattern**

```typescript
// services/section.server.ts (Composed service)
export class SectionService {
  constructor(
    private ai: AIService,
    private theme: ThemeService,
    private db: DatabaseService
  ) {}

  async generateAndSave(
    request: Request,
    prompt: string,
    themeId: string
  ): Promise<{ success: boolean; id?: string }> {
    const code = await this.ai.generateSection(prompt);
    const result = await this.theme.createSection(request, themeId, code);

    // Save to history
    await this.db.generatedSection.create({
      shop: request.shop,
      prompt,
      content: code
    });

    return result;
  }
}
```

**Benefit**: Combines services logically, reduces route complexity.

---

### 4. Feature Module Organization Example

**For Generate Feature**:

```
features/generate/
├── routes/
│   └── generate.tsx                 # Main page route
│
├── services/
│   ├── ai.server.ts                 # Isolated to feature
│   └── theme.server.ts              # Only used here
│
├── components/
│   ├── PromptInput.tsx              # Feature-specific UI
│   ├── ThemeSelector.tsx
│   ├── CodePreview.tsx
│   └── GenerateButton.tsx
│
├── hooks/
│   └── useGeneration.ts             # Feature-specific logic
│
├── types/
│   └── generate.types.ts
│
└── __tests__/
    ├── generate.test.tsx
    ├── services/ai.test.ts
    └── components/CodePreview.test.tsx
```

**Route Integration**:

```typescript
// app/routes/app.generate.tsx
import { PromptInput } from "../features/generate/components";
import { AIService } from "../features/generate/services/ai.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Loader logic
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Action logic
};

export default function Generate() {
  return <PromptInput />;
}
```

---

### 5. Scalability Considerations

#### **Growth Path** (Current → 100+ developers)

| Phase | Routes | Services | Pattern | Complexity |
|-------|--------|----------|---------|-----------|
| 0-5 | <10 | 2-3 | Layer-based | Low |
| 5-20 | 10-30 | 5-10 | Hybrid (layer + feature) | Medium |
| 20+ | 30-100 | 10-30 | Feature-based | High |

**Current App**: Phase 0-1. Layer-based works fine. Recommend migrating to feature-based when adding:
- Section history viewer
- Section templates library
- Admin dashboard
- Settings/preferences

#### **Database Optimization for Growth**

```prisma
// Add indexes for common queries
model GeneratedSection {
  id        String   @id @default(uuid())
  shop      String   @index                    // Query by shop
  prompt    String
  content   String
  createdAt DateTime @default(now()) @index  // Range queries

  @@index([shop, createdAt])                  // Composite for efficient pagination
}

// Add pagination helper
export async function getPaginatedSections(
  shop: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  return db.generatedSection.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
  });
}
```

#### **Service Isolation for Scaling**

```typescript
// Separate services to separate servers
// Server A: Auth + Route handlers
// Server B: AI Service (long-running)
// Server C: Theme Service (Shopify API)

// Current monolith OK for <1000 monthly active shops
// Split when approaching 5000+ shops
```

---

### 6. Type Safety & Validation

**Recommended Pattern**:

```typescript
// types/generate.types.ts
export interface GenerateSectionRequest {
  prompt: string;
  themeId: string;
  filename: string;
}

export interface GenerateSectionResponse {
  code: string;
  prompt: string;
  error?: string;
}

// Validation
export const validateGenerateRequest = (data: unknown): GenerateSectionRequest => {
  if (!isObject(data)) throw new Error("Invalid request");
  if (typeof data.prompt !== 'string' || data.prompt.length === 0) {
    throw new Error("Prompt required");
  }
  if (typeof data.themeId !== 'string') {
    throw new Error("Theme ID required");
  }
  return data as GenerateSectionRequest;
};
```

**Current Gap**: app.generate.tsx uses `@ts-nocheck`. Add types for Polaris components:

```typescript
// globals.d.ts (ENHANCE)
declare namespace JSX {
  interface IntrinsicElements {
    's-page': any;
    's-button': any;
    's-text-field': any;
    // ... other Polaris components
  }
}

// OR use type-safe wrapper
interface PolarisCoreProps {
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}
```

---

## Recommended Action Plan for AI Section Generator

### **Phase 1: Immediate (Week 1)**
1. Add types for Polaris web components (remove `@ts-nocheck`)
2. Extract Polaris components into reusable UI components:
   - `shared/components/PromptInput.tsx`
   - `shared/components/CodePreview.tsx`
   - `shared/components/ThemeSelector.tsx`

### **Phase 2: Near-term (Week 2-3)**
1. Implement feature-based structure for generate feature
2. Create `features/generate/hooks/useGeneration.ts` to encapsulate logic
3. Add service composition: `SectionService` combining `AIService` + `ThemeService`
4. Add database indexes to schema.prisma

### **Phase 3: Medium-term (Month 2)**
1. When adding history feature, organize as `features/history/`
2. Implement pagination helpers with proper types
3. Add structured logging (winston/pino) across services

### **Phase 4: Long-term (Month 3+)**
1. Evaluate service separation (AI service as microservice)
2. Implement caching layer (Redis) for theme list
3. Add API rate limiting
4. Setup monitoring/observability

---

## Common Pitfalls & Solutions

| Pitfall | Solution |
|---------|----------|
| Services coupled to routes | Keep services pure, no React deps |
| No type coverage on API responses | Always validate GraphQL response shapes |
| Shared state in services | Use singleton pattern, store in DB/client |
| Over-engineering early | Start layer-based, migrate to feature-based at 20+ routes |
| Missing error boundaries | Add error.tsx to each route, use AppBridge for embedded context |
| No input validation | Add Zod/Yup schemas before service calls |

---

## Resources & References

**Official Documentation**:
- [React Router v7 Docs](https://reactrouter.com/)
- [Shopify App React Router Template](https://github.com/Shopify/shopify-app-template-react-router)
- [React Architecture Best Practices 2025](https://www.geeksforgeeks.org/reactjs/react-architecture-pattern-and-best-practices/)

**Recommended Tutorials**:
- [React Router v7 Crash Course](https://dev.to/pedrotech/react-router-v7-a-crash-course-2m86)
- [The Right Way to Structure React Router](https://dev.to/kachiic/the-right-way-structure-your-react-router-1i3l)
- [React Folder Structure 2025](https://www.robinwieruch.de/react-folder-structure/)

**Community Patterns**:
- Feature-based organization for monorepos
- Service layer abstraction for testability
- Dependency injection for decoupling

---

## Unresolved Questions

1. Should Polaris web components be wrapped in custom React components or used directly?
2. How to handle mock data when Gemini API quota exceeded (currently fallback, but no local mock DB)?
3. Should services be async-injected for better testing, or stick with singleton pattern?
4. Timeline for migrating GeneratedSection model from unused to active (for history feature)?

---

**Report Date**: 2025-11-24
**Document Version**: 1.0
**Recommended Implementation Priority**: Feature-based organization migration at next major version.
