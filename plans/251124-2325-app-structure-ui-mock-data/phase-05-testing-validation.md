# Phase 05: Testing & Validation

**Phase ID**: phase-05-testing-validation
**Parent Plan**: [plan.md](plan.md)
**Priority**: High
**Status**: Pending

## Context Links

- **Parent Plan**: [251124-2325 App Structure & UI Mock Data](plan.md)
- **Previous Phase**: [Phase 04: UI Component Extraction](phase-04-ui-components.md)
- **Standards**: [Code Standards](../../docs/code-standards.md)
- **Dependencies**: All previous phases complete

## Overview

**Date**: 2025-11-24
**Description**: Comprehensive testing of mock system, adapters, feature flags, and UI components to ensure production readiness.

**Implementation Status**: Not Started (0%)
**Review Status**: Not Reviewed

## Key Insights from Research

From researcher-01-ui-mock-patterns.md:
- Testing with mock data bridges dev/production gap
- Mock/real data shape parity critical
- Error boundaries handle API failures during transition

From researcher-02-architecture-patterns.md:
- Unit tests for business logic in services
- Integration tests for route loaders/actions
- E2E tests for complete user flows

## Requirements

### Functional Requirements
1. Unit tests for all service layer code
2. Integration tests for adapters
3. Component tests for UI elements
4. E2E test for complete generation flow
5. Validation of type coverage
6. Performance benchmarks

### Non-Functional Requirements
- 80%+ code coverage target
- Tests run in <30 seconds
- No flaky tests
- Clear test documentation
- CI/CD ready

## Architecture Changes

### New Files
```
app/
├── services/
│   ├── mocks/__tests__/
│   │   ├── mock-theme.test.ts
│   │   ├── mock-ai.test.ts
│   │   └── mock-store.test.ts
│   ├── adapters/__tests__/
│   │   ├── theme-adapter.test.ts
│   │   └── ai-adapter.test.ts
│   └── flags/__tests__/
│       └── flag-utils.test.ts
├── components/
│   ├── shared/__tests__/
│   │   ├── Button.test.tsx
│   │   └── Banner.test.tsx
│   └── generate/__tests__/
│       ├── PromptInput.test.tsx
│       ├── ThemeSelector.test.tsx
│       └── CodePreview.test.tsx
├── routes/__tests__/
│   └── app.generate.test.tsx
└── e2e/
    └── generate-flow.spec.ts
```

### Test Configuration Files
```
├── jest.config.js
├── jest.setup.js
├── vitest.config.ts (if using Vitest)
└── playwright.config.ts (for E2E)
```

## Related Code Files

### All Implementation Files Need Tests
- All service files (ai, theme, mocks)
- All adapter files
- All flag files
- All component files
- Route loaders/actions

## Implementation Steps

### Step 1: Setup Test Infrastructure (30 min)

**Install dependencies**:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest ts-jest @types/jest
```

**Create**: `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/app'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/app/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/__tests__/**',
    '!app/entry.*.tsx',
    '!app/root.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

**Create**: `jest.setup.js`
```javascript
import '@testing-library/jest-dom';

// Mock environment variables
process.env.SERVICE_MODE = 'mock';
process.env.FLAG_VERBOSE_LOGGING = 'false';
```

### Step 2: Mock Service Tests (60 min)

**File**: `app/services/mocks/__tests__/mock-theme.test.ts`

```typescript
import { mockThemeService } from '../mock-theme.server';
import { mockStore } from '../mock-store';
import { mockThemes } from '../mock-data';

describe('MockThemeService', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  describe('getThemes', () => {
    it('returns all mock themes', async () => {
      const themes = await mockThemeService.getThemes({} as Request);

      expect(themes).toHaveLength(3);
      expect(themes[0].name).toBe('Dawn');
      expect(themes[0].role).toBe('MAIN');
    });

    it('returns independent copies', async () => {
      const themes1 = await mockThemeService.getThemes({} as Request);
      const themes2 = await mockThemeService.getThemes({} as Request);

      expect(themes1).not.toBe(themes2);
      expect(themes1).toEqual(themes2);
    });
  });

  describe('createSection', () => {
    const themeId = 'gid://shopify/Theme/123456789';

    it('saves section successfully', async () => {
      const result = await mockThemeService.createSection(
        {} as Request,
        themeId,
        'test-section',
        'test content'
      );

      expect(result.filename).toBe('sections/test-section.liquid');
      expect(result.size).toBeGreaterThan(0);
      expect(result.contentType).toBe('text/liquid');
    });

    it('normalizes filename with sections prefix', async () => {
      const result = await mockThemeService.createSection(
        {} as Request,
        themeId,
        'my-section',
        'content'
      );

      expect(result.filename).toBe('sections/my-section.liquid');
    });

    it('adds liquid extension if missing', async () => {
      const result = await mockThemeService.createSection(
        {} as Request,
        themeId,
        'sections/my-section',
        'content'
      );

      expect(result.filename).toBe('sections/my-section.liquid');
    });

    it('throws error for invalid theme', async () => {
      await expect(
        mockThemeService.createSection({} as Request, 'invalid-id', 'test', 'content')
      ).rejects.toThrow('Theme not found');
    });

    it('generates unique checksums', async () => {
      const result1 = await mockThemeService.createSection(
        {} as Request,
        themeId,
        'section1',
        'content1'
      );

      const result2 = await mockThemeService.createSection(
        {} as Request,
        themeId,
        'section2',
        'content2'
      );

      expect(result1.checksum).not.toBe(result2.checksum);
    });
  });
});
```

**File**: `app/services/mocks/__tests__/mock-ai.test.ts`

```typescript
import { mockAIService } from '../mock-ai.server';
import { mockStore } from '../mock-store';
import { mockSections } from '../mock-data';

describe('MockAIService', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  describe('generateSection', () => {
    it('generates section from prompt', async () => {
      const code = await mockAIService.generateSection('custom section');

      expect(code).toBeTruthy();
      expect(code).toContain('{% schema %}');
      expect(code).toContain('{% endschema %}');
      expect(code).toContain('<style>');
      expect(code).toContain('</style>');
    });

    it('returns predefined hero section', async () => {
      const code = await mockAIService.generateSection('hero banner');

      expect(code).toBe(mockSections['hero-section']);
    });

    it('returns predefined product grid', async () => {
      const code = await mockAIService.generateSection('product grid layout');

      expect(code).toBe(mockSections['product-grid']);
    });

    it('increments generation count', async () => {
      const countBefore = mockStore.getGenerationCount();

      await mockAIService.generateSection('test');
      await mockAIService.generateSection('test2');

      const countAfter = mockStore.getGenerationCount();
      expect(countAfter).toBe(countBefore + 2);
    });

    it('generates unique sections for different prompts', async () => {
      const code1 = await mockAIService.generateSection('hero section');
      const code2 = await mockAIService.generateSection('product list');

      expect(code1).not.toBe(code2);
    });
  });

  describe('getMockSection', () => {
    it('returns valid Liquid structure', () => {
      const code = mockAIService.getMockSection('test prompt');

      expect(code).toContain('{% schema %}');
      expect(code).toContain('#shopify-section-{{ section.id }}');
    });
  });
});
```

**File**: `app/services/mocks/__tests__/mock-store.test.ts`

```typescript
import { mockStore } from '../mock-store';

describe('MockStore', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  describe('saveSection', () => {
    it('saves section metadata', () => {
      const metadata = mockStore.saveSection('theme1', 'test.liquid', 'content');

      expect(metadata.filename).toBe('test.liquid');
      expect(metadata.size).toBe('content'.length);
      expect(metadata.contentType).toBe('text/liquid');
      expect(metadata.checksum).toBeTruthy();
    });

    it('generates consistent checksums', () => {
      const meta1 = mockStore.saveSection('theme1', 'test.liquid', 'same content');
      const meta2 = mockStore.saveSection('theme2', 'test.liquid', 'same content');

      expect(meta1.checksum).toBe(meta2.checksum);
    });
  });

  describe('getSections', () => {
    it('returns sections for specific theme', () => {
      mockStore.saveSection('theme1', 'section1.liquid', 'content1');
      mockStore.saveSection('theme1', 'section2.liquid', 'content2');
      mockStore.saveSection('theme2', 'section3.liquid', 'content3');

      const sections = mockStore.getSections('theme1');

      expect(sections).toHaveLength(2);
    });

    it('returns empty array for theme with no sections', () => {
      const sections = mockStore.getSections('nonexistent');

      expect(sections).toEqual([]);
    });
  });

  describe('generationCount', () => {
    it('increments generation count', () => {
      const count1 = mockStore.incrementGeneration();
      const count2 = mockStore.incrementGeneration();

      expect(count2).toBe(count1 + 1);
    });

    it('returns current count', () => {
      mockStore.incrementGeneration();
      mockStore.incrementGeneration();

      expect(mockStore.getGenerationCount()).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears all data', () => {
      mockStore.saveSection('theme1', 'test.liquid', 'content');
      mockStore.incrementGeneration();

      mockStore.reset();

      expect(mockStore.getSections('theme1')).toEqual([]);
      expect(mockStore.getGenerationCount()).toBe(0);
    });
  });
});
```

### Step 3: Adapter Tests (45 min)

**File**: `app/services/adapters/__tests__/theme-adapter.test.ts`

```typescript
import { themeAdapter } from '../theme-adapter';
import { mockThemeService } from '../../mocks/mock-theme.server';
import { serviceConfig } from '../../config.server';

// Mock the config
jest.mock('../../config.server', () => ({
  serviceConfig: {
    themeMode: 'mock',
    enableLogging: false
  },
  logServiceConfig: jest.fn()
}));

describe('ThemeAdapter', () => {
  describe('getThemes', () => {
    it('delegates to underlying service', async () => {
      const themes = await themeAdapter.getThemes({} as Request);

      expect(themes).toHaveLength(3);
    });
  });

  describe('createSection', () => {
    it('delegates to underlying service', async () => {
      const result = await themeAdapter.createSection(
        {} as Request,
        'gid://shopify/Theme/123456789',
        'test',
        'content'
      );

      expect(result.filename).toBe('sections/test.liquid');
    });
  });

  describe('getCurrentMode', () => {
    it('returns current mode', () => {
      expect(themeAdapter.getCurrentMode()).toBe('mock');
    });
  });
});
```

### Step 4: Component Tests (60 min)

**File**: `app/components/generate/__tests__/PromptInput.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptInput } from '../PromptInput';

describe('PromptInput', () => {
  it('renders with label', () => {
    render(<PromptInput value="" onChange={() => {}} />);
    expect(screen.getByText(/section prompt/i)).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<PromptInput value="test prompt" onChange={() => {}} />);
    const input = screen.getByDisplayValue('test prompt');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange on input', () => {
    const onChange = jest.fn();
    render(<PromptInput value="" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.input(input, { target: { value: 'new prompt' } });

    expect(onChange).toHaveBeenCalledWith('new prompt');
  });

  it('shows help text when no error', () => {
    render(<PromptInput value="" onChange={() => {}} />);
    expect(screen.getByText(/example:/i)).toBeInTheDocument();
  });

  it('shows error instead of help text', () => {
    render(<PromptInput value="" onChange={() => {}} error="Required" />);

    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText(/example:/i)).not.toBeInTheDocument();
  });

  it('disables input when disabled prop set', () => {
    render(<PromptInput value="" onChange={() => {}} disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });
});
```

**File**: `app/components/generate/__tests__/ThemeSelector.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSelector } from '../ThemeSelector';
import type { Theme } from '../../../types/shopify-api.types';

const mockThemes: Theme[] = [
  { id: 'theme1', name: 'Dawn', role: 'MAIN' },
  { id: 'theme2', name: 'Custom', role: 'UNPUBLISHED' }
];

describe('ThemeSelector', () => {
  it('renders all themes as options', () => {
    render(
      <ThemeSelector
        themes={mockThemes}
        selectedThemeId="theme1"
        onChange={() => {}}
      />
    );

    expect(screen.getByText('Dawn (Active)')).toBeInTheDocument();
    expect(screen.getByText(/Custom/)).toBeInTheDocument();
  });

  it('selects active theme by default', () => {
    render(
      <ThemeSelector
        themes={mockThemes}
        selectedThemeId="theme1"
        onChange={() => {}}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('theme1');
  });

  it('calls onChange when selection changes', () => {
    const onChange = jest.fn();
    render(
      <ThemeSelector
        themes={mockThemes}
        selectedThemeId="theme1"
        onChange={onChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'theme2' } });

    expect(onChange).toHaveBeenCalledWith('theme2');
  });

  it('shows active theme indicator', () => {
    render(
      <ThemeSelector
        themes={mockThemes}
        selectedThemeId="theme1"
        onChange={() => {}}
      />
    );

    expect(screen.getByText(/active theme/i)).toBeInTheDocument();
  });
});
```

### Step 5: Integration Tests (60 min)

**File**: `app/routes/__tests__/app.generate.test.tsx`

```typescript
import { createRemixStub } from '@remix-run/testing';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Generate, { loader, action } from '../app.generate';

// Mock services
jest.mock('../../services/adapters/theme-adapter');
jest.mock('../../services/adapters/ai-adapter');
jest.mock('../../shopify.server');

describe('Generate Route', () => {
  it('loads themes on mount', async () => {
    const RemixStub = createRemixStub([
      {
        path: '/',
        Component: Generate,
        loader,
      },
    ]);

    render(<RemixStub />);

    await waitFor(() => {
      expect(screen.getByText(/dawn/i)).toBeInTheDocument();
    });
  });

  it('generates code from prompt', async () => {
    const user = userEvent.setup();
    const RemixStub = createRemixStub([
      {
        path: '/',
        Component: Generate,
        loader,
        action,
      },
    ]);

    render(<RemixStub />);

    // Wait for load
    await waitFor(() => screen.getByRole('textbox', { name: /prompt/i }));

    // Enter prompt
    const promptInput = screen.getByRole('textbox', { name: /prompt/i });
    await user.type(promptInput, 'hero section');

    // Click generate
    const generateBtn = screen.getByRole('button', { name: /generate/i });
    await user.click(generateBtn);

    // Verify code preview appears
    await waitFor(() => {
      expect(screen.getByText(/generated liquid code/i)).toBeInTheDocument();
    });
  });
});
```

### Step 6: E2E Test (60 min)

**Install Playwright**:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**File**: `e2e/generate-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Section Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set mock mode
    await page.goto('http://localhost:3000/app/generate');
  });

  test('complete generation and save flow', async ({ page }) => {
    // Enter prompt
    await page.fill('[label="Section Prompt"]', 'hero section with CTA');

    // Select theme
    await page.selectOption('[label="Select Theme"]', { index: 0 });

    // Enter filename
    await page.fill('[label="Section Filename"]', 'my-hero');

    // Generate
    await page.click('button:has-text("Generate Code")');

    // Wait for code preview
    await expect(page.locator('text=Generated Liquid Code')).toBeVisible();

    // Verify code contains expected elements
    const code = await page.locator('pre code').textContent();
    expect(code).toContain('{% schema %}');
    expect(code).toContain('{% endschema %}');

    // Save to theme
    await page.click('button:has-text("Save to Theme")');

    // Verify success message
    await expect(page.locator('text=Successfully saved')).toBeVisible();
  });

  test('shows error for empty prompt', async ({ page }) => {
    // Try to generate without prompt
    await page.click('button:has-text("Generate Code")');

    // Should not generate (button might be disabled or show error)
    await expect(page.locator('text=Generated Liquid Code')).not.toBeVisible();
  });

  test('service mode indicator visible in dev', async ({ page }) => {
    // Check for mode indicator
    const indicator = page.locator('text=Service Mode');
    await expect(indicator).toBeVisible();
    await expect(page.locator('text=MOCK')).toBeVisible();
  });
});
```

### Step 7: Type Coverage Validation (30 min)

**Create script**: `scripts/check-types.sh`

```bash
#!/bin/bash
echo "Checking TypeScript type coverage..."

# Run tsc with noEmit
npx tsc --noEmit

# Check for any files
echo "Checking for @ts-nocheck directives..."
grep -r "@ts-nocheck" app/ && echo "Found @ts-nocheck!" && exit 1 || echo "✓ No @ts-nocheck found"

# Check for any types
echo "Checking for 'any' types..."
grep -r ": any" app/ --exclude-dir=__tests__ --exclude="*.d.ts" && echo "Warning: Found 'any' types" || echo "✓ No explicit 'any' types"

echo "✓ Type check complete"
```

Make executable:
```bash
chmod +x scripts/check-types.sh
```

### Step 8: Performance Benchmarks (30 min)

**File**: `app/services/__tests__/performance.test.ts`

```typescript
import { mockAIService } from '../mocks/mock-ai.server';
import { mockThemeService } from '../mocks/mock-theme.server';

describe('Performance Benchmarks', () => {
  it('generates section in < 1 second', async () => {
    const start = Date.now();

    await mockAIService.generateSection('test prompt');

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  it('fetches themes in < 200ms', async () => {
    const start = Date.now();

    await mockThemeService.getThemes({} as Request);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('saves section in < 300ms', async () => {
    const start = Date.now();

    await mockThemeService.createSection(
      {} as Request,
      'gid://shopify/Theme/123456789',
      'test',
      'content'
    );

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(300);
  });
});
```

### Step 9: Test Documentation (20 min)

**File**: `app/__tests__/README.md`

```markdown
# Test Suite Documentation

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run in watch mode
npm test -- --watch

# Run E2E tests
npx playwright test
```

## Test Structure

```
app/
├── services/__tests__/      # Service layer tests
├── components/__tests__/    # Component tests
├── routes/__tests__/        # Integration tests
└── e2e/                     # End-to-end tests
```

## Coverage Goals

- Overall: 80%+
- Services: 90%+
- Components: 80%+
- Adapters: 100%

## Writing Tests

### Unit Tests
- Test single functions/methods
- Mock external dependencies
- Fast execution (<10ms per test)

### Component Tests
- Use @testing-library/react
- Test user interactions
- Verify accessibility

### Integration Tests
- Test route loaders/actions
- Mock Shopify authentication
- Verify data flow

### E2E Tests
- Test complete user flows
- Use real browser (Playwright)
- Slower but comprehensive
```

### Step 10: CI Configuration (30 min)

**File**: `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            coverage/
            playwright-report/
```

**Update**: `package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "type-check": "./scripts/check-types.sh"
  }
}
```

## Todo List

- [ ] Install test dependencies (Jest, Testing Library, Playwright)
- [ ] Create jest.config.js and jest.setup.js
- [ ] Write mock service tests
- [ ] Write adapter tests
- [ ] Write component tests
- [ ] Write integration tests for routes
- [ ] Write E2E test for complete flow
- [ ] Create performance benchmarks
- [ ] Write test documentation
- [ ] Setup CI workflow
- [ ] Run full test suite and fix failures
- [ ] Achieve 80%+ code coverage
- [ ] Verify all tests pass in CI
- [ ] Commit: "test: add comprehensive test suite for mock system and UI"

## Success Criteria

- [ ] All tests pass locally
- [ ] 80%+ code coverage achieved
- [ ] Zero TypeScript errors
- [ ] E2E test covers complete flow
- [ ] Performance benchmarks met
- [ ] Tests run in CI/CD
- [ ] Test documentation complete
- [ ] No flaky tests

## Risk Assessment

**Medium Risk**: Mock tests don't catch real API issues
**Mitigation**: Add integration tests with real APIs when available

**Low Risk**: Test maintenance overhead
**Mitigation**: Keep tests simple, focused, well-organized

## Security Considerations

- No secrets in test files
- Mock authentication in tests
- Sanitize test data before commits

## Next Steps

After completion:
- Plan ready for implementation
- All phases documented
- Success criteria defined
- Ready to begin Phase 01

## Notes

- Run tests frequently during development
- Maintain high coverage as codebase grows
- Review test failures carefully before fixing
- Consider snapshot testing for UI components (optional)
- Add mutation testing for critical paths (future enhancement)
