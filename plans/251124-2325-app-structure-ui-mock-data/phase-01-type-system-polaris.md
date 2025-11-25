# Phase 01: Type System & Polaris Components

**Phase ID**: phase-01-type-system-polaris
**Parent Plan**: [plan.md](plan.md)
**Priority**: High
**Status**: Pending

## Context Links

- **Parent Plan**: [251124-2325 App Structure & UI Mock Data](plan.md)
- **Research**: [UI Mock Patterns](research/researcher-01-ui-mock-patterns.md)
- **Standards**: [Code Standards](../../docs/code-standards.md)
- **Dependencies**: None (first phase)

## Overview

**Date**: 2025-11-24
**Description**: Add TypeScript type definitions for Polaris web components and establish shared type system for API responses to remove `@ts-nocheck` and enable type safety.

**Implementation Status**: Not Started (0%)
**Review Status**: Not Reviewed

## Key Insights from Research

From researcher-01-ui-mock-patterns.md:
- Polaris web components work as custom elements (framework-agnostic)
- Bind React state via standard DOM patterns, not special props
- TypeScript interfaces ensure mock/real data shape parity

From researcher-02-architecture-patterns.md:
- Current app uses `@ts-nocheck` in app.generate.tsx
- Polaris component types should be declared in globals.d.ts
- Type-safe wrapper pattern recommended for complex components

## Requirements

### Functional Requirements
1. Remove all `@ts-nocheck` directives from route files
2. Add complete type definitions for Polaris web components used
3. Create shared interfaces for API responses (themes, sections, files)
4. Establish type validation helpers
5. Enable TypeScript strict mode compliance

### Non-Functional Requirements
- Zero runtime changes (types only)
- No breaking changes to existing routes
- IntelliSense support for Polaris components
- Type errors surfaced during development

## Architecture Changes

### New Files
```
app/
├── types/
│   ├── polaris.d.ts          # Polaris web component types
│   ├── shopify-api.types.ts  # Shopify GraphQL response types
│   ├── service.types.ts      # Service layer interfaces
│   └── index.ts              # Type exports
```

### Modified Files
- `app/globals.d.ts` - Import Polaris types
- `app/routes/app.generate.tsx` - Remove @ts-nocheck
- `app/services/theme.server.ts` - Add type annotations
- `app/services/ai.server.ts` - Add type annotations
- `tsconfig.json` - Enable strict mode (if not already)

## Related Code Files

### Core Files to Analyze
1. `/app/routes/app.generate.tsx` (1,349 tokens) - Main target, uses Polaris components
2. `/app/globals.d.ts` - Current JSX declarations
3. `/app/services/theme.server.ts` - ThemeService needs types
4. `/app/services/ai.server.ts` - AIService needs types

### Reference Files
- `/docs/code-standards.md` - TypeScript standards section
- `/docs/codebase-summary.md` - Type safety observations

## Implementation Steps

### Step 1: Create Polaris Type Definitions (30 min)
**File**: `app/types/polaris.d.ts`

```typescript
// Polaris Web Component Types
declare namespace JSX {
  interface IntrinsicElements {
    's-page': {
      title?: string;
      primaryAction?: any;
      children?: React.ReactNode;
    };
    's-layout': {
      children?: React.ReactNode;
    };
    's-layout-section': {
      children?: React.ReactNode;
    };
    's-card': {
      title?: string;
      sectioned?: boolean;
      children?: React.ReactNode;
    };
    's-stack': {
      gap?: string;
      vertical?: boolean;
      children?: React.ReactNode;
    };
    's-text': {
      variant?: 'headingSm' | 'headingMd' | 'headingLg' | 'bodyMd' | 'bodySm';
      as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
      children?: React.ReactNode;
    };
    's-text-field': {
      label?: string;
      value?: string;
      onInput?: (e: InputEvent) => void;
      onChange?: (e: Event) => void;
      multiline?: string | boolean;
      autoComplete?: string;
      placeholder?: string;
      helpText?: string;
      error?: string;
    };
    's-button': {
      variant?: 'primary' | 'secondary' | 'plain' | 'destructive';
      size?: 'slim' | 'medium' | 'large';
      loading?: string | boolean;
      disabled?: boolean;
      onClick?: () => void;
      submit?: boolean;
      children?: React.ReactNode;
    };
    's-select': {
      label?: string;
      value?: string;
      onChange?: (e: Event) => void;
      options?: Array<{ label: string; value: string }>;
      children?: React.ReactNode;
    };
    's-option': {
      value: string;
      children?: React.ReactNode;
    };
    's-banner': {
      tone?: 'info' | 'success' | 'warning' | 'critical';
      heading?: string;
      dismissible?: boolean;
      onDismiss?: () => void;
      children?: React.ReactNode;
    };
    's-box': {
      padding?: string;
      background?: string;
      children?: React.ReactNode;
    };
    'ui-nav-menu': {
      children?: React.ReactNode;
    };
  }
}
```

### Step 2: Create Shopify API Types (45 min)
**File**: `app/types/shopify-api.types.ts`

```typescript
// Shopify Theme Types
export interface Theme {
  id: string;
  name: string;
  role: 'MAIN' | 'UNPUBLISHED' | 'DEVELOPMENT';
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeEdge {
  node: Theme;
}

export interface ThemesQueryResponse {
  data?: {
    themes?: {
      edges: ThemeEdge[];
    };
  };
  errors?: Array<{ message: string }>;
}

// Theme File Types
export interface ThemeFile {
  filename: string;
  body?: {
    type: 'TEXT';
    value: string;
  };
}

export interface ThemeFileMetadata {
  filename: string;
  size?: number;
  contentType?: string;
  checksum?: string;
}

export interface ThemeFilesUpsertResponse {
  data?: {
    themeFilesUpsert?: {
      upsertedThemeFiles?: ThemeFileMetadata[];
      userErrors?: Array<{
        message: string;
        field?: string[];
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

// Service Response Types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Step 3: Create Service Layer Types (30 min)
**File**: `app/types/service.types.ts`

```typescript
import type { Theme, ThemeFileMetadata } from './shopify-api.types';

// AI Service Types
export interface AIGenerationOptions {
  prompt: string;
  model?: string;
  temperature?: number;
}

export interface AIGenerationResult {
  code: string;
  prompt: string;
  modelUsed: string;
  timestamp: Date;
}

export interface AIServiceInterface {
  generateSection(prompt: string): Promise<string>;
  getMockSection(prompt: string): string;
}

// Theme Service Types
export interface ThemeServiceInterface {
  getThemes(request: Request): Promise<Theme[]>;
  createSection(
    request: Request,
    themeId: string,
    fileName: string,
    content: string
  ): Promise<ThemeFileMetadata>;
}

// Database Types
export interface GeneratedSectionRecord {
  id: string;
  shop: string;
  prompt: string;
  content: string;
  createdAt: Date;
}
```

### Step 4: Update globals.d.ts (10 min)
**File**: `app/globals.d.ts`

```typescript
/// <reference types="./types/polaris.d.ts" />

import type { PolarisEventDetail } from './types/polaris.d.ts';

// Extend Window interface if needed
interface Window {
  shopify?: {
    config?: {
      apiKey: string;
      host: string;
    };
  };
}
```

### Step 5: Add Type Annotations to Services (60 min)

**File**: `app/services/theme.server.ts`
```typescript
import type {
  Theme,
  ThemesQueryResponse,
  ThemeFilesUpsertResponse,
  ThemeFileMetadata,
  ThemeServiceInterface
} from '../types/service.types';

export class ThemeService implements ThemeServiceInterface {
  async getThemes(request: Request): Promise<Theme[]> {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(`
      #graphql
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

    const data: ThemesQueryResponse = await response.json();

    return data.data?.themes?.edges.map(edge => edge.node) || [];
  }

  async createSection(
    request: Request,
    themeId: string,
    fileName: string,
    content: string
  ): Promise<ThemeFileMetadata> {
    // Implementation with typed responses
    const response = await admin.graphql(/* ... */);
    const data: ThemeFilesUpsertResponse = await response.json();

    if (data.data?.themeFilesUpsert?.userErrors?.length) {
      const errors = data.data.themeFilesUpsert.userErrors;
      throw new Error(`Failed: ${errors.map(e => e.message).join(', ')}`);
    }

    const file = data.data?.themeFilesUpsert?.upsertedThemeFiles?.[0];
    if (!file) {
      throw new Error('No file returned from upsert');
    }

    return file;
  }
}
```

**File**: `app/services/ai.server.ts`
```typescript
import type { AIServiceInterface } from '../types/service.types';

export class AIService implements AIServiceInterface {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn('GEMINI_API_KEY not set. Mock mode enabled.');
    }
  }

  async generateSection(prompt: string): Promise<string> {
    if (!this.genAI) {
      return this.getMockSection(prompt);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: SYSTEM_PROMPT
      });

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error("Gemini API error:", error);
      return this.getMockSection(prompt);
    }
  }

  getMockSection(prompt: string): string {
    // Existing implementation
  }
}
```

### Step 6: Remove @ts-nocheck from Routes (20 min)
**File**: `app/routes/app.generate.tsx`

Remove line 1: `// @ts-nocheck`

Update handler types:
```typescript
// Before
function handlePromptChange(e: any) {
  setPrompt(e.target.value);
}

// After
function handlePromptChange(e: Event) {
  const target = e.target as HTMLInputElement;
  setPrompt(target.value);
}
```

### Step 7: Enable TypeScript Strict Mode (15 min)
**File**: `tsconfig.json`

Verify strict mode enabled:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Step 8: Validation & Testing (30 min)

Run TypeScript compiler:
```bash
npx tsc --noEmit
```

Expected: Zero type errors

Check IntelliSense:
- Open app.generate.tsx in editor
- Verify autocomplete for Polaris components
- Verify type hints on hover

## Todo List

- [ ] Create app/types/polaris.d.ts with Polaris component types
- [ ] Create app/types/shopify-api.types.ts with API response types
- [ ] Create app/types/service.types.ts with service interfaces
- [ ] Create app/types/index.ts with type exports
- [ ] Update app/globals.d.ts to reference Polaris types
- [ ] Add type annotations to theme.server.ts
- [ ] Add type annotations to ai.server.ts
- [ ] Remove @ts-nocheck from app.generate.tsx
- [ ] Update event handlers with proper types
- [ ] Verify tsconfig.json strict mode enabled
- [ ] Run tsc --noEmit and fix any errors
- [ ] Test IntelliSense in editor
- [ ] Commit changes with message: "feat: add TypeScript types for Polaris components and services"

## Success Criteria

- [ ] Zero TypeScript errors in strict mode
- [ ] No @ts-nocheck directives in codebase
- [ ] IntelliSense works for Polaris components
- [ ] Service methods have explicit return types
- [ ] API response types match actual Shopify responses
- [ ] All route handlers properly typed
- [ ] Editor provides autocomplete for component props

## Risk Assessment

**Low Risk**: Type definitions may need refinement based on actual Polaris API
**Mitigation**: Start with common props, iterate based on usage

**Low Risk**: Breaking changes to existing code
**Mitigation**: Type-only changes, no runtime impact

## Security Considerations

- No runtime security changes
- Type system prevents accidental data leaks
- Enforces proper null checks on API responses

## Next Steps

After completion, proceed to:
- [Phase 02: Mock Service Layer & Adapters](phase-02-mock-service-layer.md)

## Notes

- Keep type definitions aligned with actual component API
- Reference Polaris documentation for complete prop list
- Use `unknown` instead of `any` for safer type narrowing
- Consider adding JSDoc comments to type interfaces
