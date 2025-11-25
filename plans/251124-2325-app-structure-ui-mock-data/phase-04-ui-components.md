# Phase 04: UI Component Extraction & Organization

**Phase ID**: phase-04-ui-components
**Parent Plan**: [plan.md](plan.md)
**Priority**: Medium
**Status**: Pending

## Context Links

- **Parent Plan**: [251124-2325 App Structure & UI Mock Data](plan.md)
- **Previous Phase**: [Phase 03: Feature Flag System](phase-03-feature-flag-system.md)
- **Next Phase**: [Phase 05: Testing & Validation](phase-05-testing-validation.md)
- **Research**: [UI Mock Patterns](research/researcher-01-ui-mock-patterns.md), [Architecture Patterns](research/researcher-02-architecture-patterns.md)
- **Standards**: [Code Standards](../../docs/code-standards.md)

## Overview

**Date**: 2025-11-24
**Description**: Extract reusable UI components from routes into shared component library following Polaris design patterns.

**Implementation Status**: Not Started (0%)
**Review Status**: Not Reviewed

## Key Insights from Research

From researcher-01-ui-mock-patterns.md:
- Polaris web components provide headless UI flexibility
- Components should be framework-agnostic where possible
- Keep components simple and composable

From researcher-02-architecture-patterns.md:
- Extract components into shared/components for reuse
- Feature-specific components go in features/<feature>/components
- Current app has UI logic embedded in route files
- Component files should stay under 200 lines

## Requirements

### Functional Requirements
1. Extract UI components from app.generate.tsx
2. Create reusable Polaris wrappers
3. Organize components by feature/shared distinction
4. Add proper TypeScript types to all components
5. Maintain existing functionality

### Non-Functional Requirements
- Components under 200 lines each
- Props clearly documented
- No side effects in components (pure)
- Accessible (ARIA labels where needed)
- Responsive design maintained

## Architecture Changes

### New Files
```
app/
├── components/
│   ├── shared/                    # Reusable across features
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Banner.tsx
│   │   └── LoadingSpinner.tsx
│   ├── generate/                  # Generate feature specific
│   │   ├── PromptInput.tsx
│   │   ├── ThemeSelector.tsx
│   │   ├── CodePreview.tsx
│   │   ├── SectionNameInput.tsx
│   │   └── GenerateActions.tsx
│   └── index.ts                   # Component exports
```

### Modified Files
- `app/routes/app.generate.tsx` - Use extracted components
- `app/routes/app._index.tsx` - Use shared components (future)

## Related Code Files

### Files to Modify
1. `/app/routes/app.generate.tsx` (182 lines) - Extract components
2. `/app/types/polaris.d.ts` - From Phase 01

### New Component Files
- 10+ new component files
- Component test files

## Implementation Steps

### Step 1: Create Shared Button Component (20 min)
**File**: `app/components/shared/Button.tsx`

```typescript
import type { ReactNode } from 'react';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'plain' | 'destructive';
  size?: 'slim' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  submit?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'secondary',
  size = 'medium',
  loading = false,
  disabled = false,
  onClick,
  submit = false,
  fullWidth = false
}: ButtonProps) {
  return (
    <s-button
      variant={variant}
      size={size}
      loading={loading ? 'true' : undefined}
      disabled={disabled}
      onClick={onClick}
      submit={submit}
      style={fullWidth ? { width: '100%' } : undefined}
    >
      {children}
    </s-button>
  );
}
```

### Step 2: Create Shared Card Component (20 min)
**File**: `app/components/shared/Card.tsx`

```typescript
import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  children: ReactNode;
  sectioned?: boolean;
}

export function Card({ title, children, sectioned = false }: CardProps) {
  return (
    <s-card title={title} sectioned={sectioned}>
      {children}
    </s-card>
  );
}
```

### Step 3: Create Shared Banner Component (30 min)
**File**: `app/components/shared/Banner.tsx`

```typescript
import type { ReactNode } from 'react';

export interface BannerProps {
  tone?: 'info' | 'success' | 'warning' | 'critical';
  heading?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: ReactNode;
}

export function Banner({
  tone = 'info',
  heading,
  dismissible = false,
  onDismiss,
  children
}: BannerProps) {
  return (
    <s-banner
      tone={tone}
      heading={heading}
      dismissible={dismissible ? 'true' : undefined}
      onDismiss={onDismiss}
    >
      {children}
    </s-banner>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <Banner tone="success" heading="Success" dismissible>
      {message}
    </Banner>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <Banner tone="critical" heading="Error">
      {message}
    </Banner>
  );
}
```

### Step 4: Create PromptInput Component (40 min)
**File**: `app/components/generate/PromptInput.tsx`

```typescript
import { useState } from 'react';

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  error?: string;
  disabled?: boolean;
}

export function PromptInput({
  value,
  onChange,
  placeholder = 'Describe the section you want to generate...',
  helpText = 'Example: A hero section with background image and call-to-action button',
  error,
  disabled = false
}: PromptInputProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  return (
    <s-text-field
      label="Section Prompt"
      value={value}
      onInput={handleInput}
      multiline="4"
      autoComplete="off"
      placeholder={placeholder}
      helpText={!error ? helpText : undefined}
      error={error}
      disabled={disabled}
    />
  );
}
```

### Step 5: Create ThemeSelector Component (45 min)
**File**: `app/components/generate/ThemeSelector.tsx`

```typescript
import type { Theme } from '../../types/shopify-api.types';

export interface ThemeSelectorProps {
  themes: Theme[];
  selectedThemeId: string;
  onChange: (themeId: string) => void;
  disabled?: boolean;
}

export function ThemeSelector({
  themes,
  selectedThemeId,
  onChange,
  disabled = false
}: ThemeSelectorProps) {
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    onChange(target.value);
  };

  // Get active (MAIN) theme
  const activeTheme = themes.find(t => t.role === 'MAIN');

  return (
    <div>
      <s-select
        label="Select Theme"
        value={selectedThemeId}
        onChange={handleChange}
        disabled={disabled}
      >
        {themes.map(theme => (
          <s-option key={theme.id} value={theme.id}>
            {theme.name} {theme.role === 'MAIN' ? '(Active)' : ''}
          </s-option>
        ))}
      </s-select>

      {activeTheme && selectedThemeId === activeTheme.id && (
        <s-text variant="bodySm" as="p" style={{ marginTop: '8px', color: '#666' }}>
          This is your active theme
        </s-text>
      )}
    </div>
  );
}
```

### Step 6: Create CodePreview Component (50 min)
**File**: `app/components/generate/CodePreview.tsx`

```typescript
export interface CodePreviewProps {
  code: string;
  language?: string;
  title?: string;
  maxHeight?: string;
}

export function CodePreview({
  code,
  language = 'liquid',
  title = 'Generated Code',
  maxHeight = '400px'
}: CodePreviewProps) {
  if (!code) {
    return null;
  }

  return (
    <s-card title={title}>
      <s-box padding="400">
        <pre
          style={{
            background: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight,
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: 'Monaco, Courier, monospace'
          }}
        >
          <code>{code}</code>
        </pre>
      </s-box>
    </s-card>
  );
}

export function CodePreviewWithCopy({ code, title }: { code: string; title?: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      // Could add toast notification here
      console.log('Code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <s-card title={title || 'Generated Code'}>
      <s-stack vertical gap="300">
        <s-box padding="400">
          <pre
            style={{
              background: '#f5f5f5',
              padding: '16px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '14px',
              lineHeight: '1.5',
              fontFamily: 'Monaco, Courier, monospace'
            }}
          >
            <code>{code}</code>
          </pre>
        </s-box>

        <s-button variant="plain" onClick={handleCopy}>
          Copy to Clipboard
        </s-button>
      </s-stack>
    </s-card>
  );
}
```

### Step 7: Create SectionNameInput Component (30 min)
**File**: `app/components/generate/SectionNameInput.tsx`

```typescript
export interface SectionNameInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function SectionNameInput({
  value,
  onChange,
  error,
  disabled = false
}: SectionNameInputProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  // Preview the actual filename
  const fileName = value.trim() || 'section-name';
  const preview = `sections/${fileName}.liquid`;

  return (
    <div>
      <s-text-field
        label="Section Filename"
        value={value}
        onInput={handleInput}
        autoComplete="off"
        placeholder="my-custom-section"
        helpText={!error ? `Will be saved as: ${preview}` : undefined}
        error={error}
        disabled={disabled}
      />
    </div>
  );
}
```

### Step 8: Create GenerateActions Component (40 min)
**File**: `app/components/generate/GenerateActions.tsx`

```typescript
import { Button } from '../shared/Button';

export interface GenerateActionsProps {
  onGenerate: () => void;
  onSave: () => void;
  isGenerating: boolean;
  isSaving: boolean;
  canSave: boolean;
  generateButtonText?: string;
  saveButtonText?: string;
}

export function GenerateActions({
  onGenerate,
  onSave,
  isGenerating,
  isSaving,
  canSave,
  generateButtonText = 'Generate Code',
  saveButtonText = 'Save to Theme'
}: GenerateActionsProps) {
  return (
    <s-stack gap="300">
      <Button
        variant="primary"
        loading={isGenerating}
        disabled={isGenerating || isSaving}
        onClick={onGenerate}
      >
        {generateButtonText}
      </Button>

      {canSave && (
        <Button
          variant="secondary"
          loading={isSaving}
          disabled={isSaving || isGenerating}
          onClick={onSave}
        >
          {saveButtonText}
        </Button>
      )}
    </s-stack>
  );
}
```

### Step 9: Create Component Index (15 min)
**File**: `app/components/index.ts`

```typescript
// Shared components
export { Button } from './shared/Button';
export { Card } from './shared/Card';
export { Banner, SuccessBanner, ErrorBanner } from './shared/Banner';

// Generate feature components
export { PromptInput } from './generate/PromptInput';
export { ThemeSelector } from './generate/ThemeSelector';
export { CodePreview, CodePreviewWithCopy } from './generate/CodePreview';
export { SectionNameInput } from './generate/SectionNameInput';
export { GenerateActions } from './generate/GenerateActions';

// Types
export type { ButtonProps } from './shared/Button';
export type { CardProps } from './shared/Card';
export type { BannerProps } from './shared/Banner';
export type { PromptInputProps } from './generate/PromptInput';
export type { ThemeSelectorProps } from './generate/ThemeSelector';
export type { CodePreviewProps } from './generate/CodePreview';
export type { SectionNameInputProps } from './generate/SectionNameInput';
export type { GenerateActionsProps } from './generate/GenerateActions';
```

### Step 10: Refactor app.generate.tsx (60 min)
**File**: `app/routes/app.generate.tsx`

```typescript
import { useState, useEffect } from "react";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { themeAdapter } from "../services/adapters/theme-adapter";
import { aiAdapter } from "../services/adapters/ai-adapter";
import {
  PromptInput,
  ThemeSelector,
  CodePreview,
  SectionNameInput,
  GenerateActions,
  SuccessBanner,
  ErrorBanner
} from "../components";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  const themes = await themeAdapter.getThemes(request);
  return { themes };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "generate") {
    const prompt = formData.get("prompt") as string;
    try {
      const code = await aiAdapter.generateSection(prompt);
      return { code, prompt };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to generate code"
      };
    }
  }

  if (action === "save") {
    const themeId = formData.get("themeId") as string;
    const fileName = formData.get("fileName") as string;
    const content = formData.get("content") as string;

    try {
      const result = await themeAdapter.createSection(request, themeId, fileName, content);
      return {
        success: true,
        message: `Successfully saved ${result.filename} to theme!`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to save section"
      };
    }
  }

  return null;
}

export default function Generate() {
  const { themes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  // State
  const [prompt, setPrompt] = useState("");
  const [fileName, setFileName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const activeTheme = themes.find(t => t.role === "MAIN");
  const [selectedThemeId, setSelectedThemeId] = useState(activeTheme?.id || themes[0]?.id || "");

  // Derived state
  const isGenerating = navigation.state === "submitting" &&
    navigation.formData?.get("action") === "generate";
  const isSaving = navigation.state === "submitting" &&
    navigation.formData?.get("action") === "save";
  const canSave = Boolean(generatedCode && fileName && selectedThemeId);

  // Update generated code when action completes
  useEffect(() => {
    if (actionData && 'code' in actionData && actionData.code) {
      setGeneratedCode(actionData.code);
    }
  }, [actionData]);

  // Handlers
  const handleGenerate = () => {
    if (!prompt.trim()) {
      return;
    }

    const formData = new FormData();
    formData.append("action", "generate");
    formData.append("prompt", prompt);
    submit(formData, { method: "post" });
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const formData = new FormData();
    formData.append("action", "save");
    formData.append("themeId", selectedThemeId);
    formData.append("fileName", fileName);
    formData.append("content", generatedCode);
    submit(formData, { method: "post" });
  };

  return (
    <s-page title="Generate Section">
      <s-layout>
        <s-layout-section>
          <s-stack gap="400" vertical>
            {/* Feedback banners */}
            {actionData?.success && (
              <SuccessBanner message={actionData.message} />
            )}
            {actionData?.success === false && (
              <ErrorBanner message={actionData.message} />
            )}
            {actionData?.error && (
              <ErrorBanner message={actionData.error} />
            )}

            {/* Input form */}
            <s-card title="Section Details">
              <s-stack gap="400" vertical>
                <PromptInput
                  value={prompt}
                  onChange={setPrompt}
                  disabled={isGenerating || isSaving}
                />

                <ThemeSelector
                  themes={themes}
                  selectedThemeId={selectedThemeId}
                  onChange={setSelectedThemeId}
                  disabled={isGenerating || isSaving}
                />

                <SectionNameInput
                  value={fileName}
                  onChange={setFileName}
                  disabled={isGenerating || isSaving}
                />

                <GenerateActions
                  onGenerate={handleGenerate}
                  onSave={handleSave}
                  isGenerating={isGenerating}
                  isSaving={isSaving}
                  canSave={canSave}
                />
              </s-stack>
            </s-card>

            {/* Code preview */}
            {generatedCode && (
              <CodePreview code={generatedCode} title="Generated Liquid Code" />
            )}
          </s-stack>
        </s-layout-section>
      </s-layout>
    </s-page>
  );
}
```

### Step 11: Component Testing (60 min)

**Create test file**: `app/components/generate/__tests__/PromptInput.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptInput } from '../PromptInput';

describe('PromptInput', () => {
  it('renders with label', () => {
    render(<PromptInput value="" onChange={() => {}} />);
    expect(screen.getByLabelText(/section prompt/i)).toBeInTheDocument();
  });

  it('calls onChange when input changes', () => {
    const onChange = jest.fn();
    render(<PromptInput value="" onChange={onChange} />);

    const input = screen.getByLabelText(/section prompt/i);
    fireEvent.input(input, { target: { value: 'hero section' } });

    expect(onChange).toHaveBeenCalledWith('hero section');
  });

  it('shows error message', () => {
    render(<PromptInput value="" onChange={() => {}} error="Required field" />);
    expect(screen.getByText(/required field/i)).toBeInTheDocument();
  });
});
```

## Todo List

- [ ] Create app/components/shared/Button.tsx
- [ ] Create app/components/shared/Card.tsx
- [ ] Create app/components/shared/Banner.tsx
- [ ] Create app/components/generate/PromptInput.tsx
- [ ] Create app/components/generate/ThemeSelector.tsx
- [ ] Create app/components/generate/CodePreview.tsx
- [ ] Create app/components/generate/SectionNameInput.tsx
- [ ] Create app/components/generate/GenerateActions.tsx
- [ ] Create app/components/index.ts
- [ ] Refactor app/routes/app.generate.tsx to use components
- [ ] Create component tests
- [ ] Manual test UI functionality
- [ ] Verify no regressions in behavior
- [ ] Check responsive design
- [ ] Test accessibility (keyboard navigation)
- [ ] Commit: "refactor: extract UI components from routes"

## Success Criteria

- [ ] All components under 200 lines
- [ ] Zero behavioral changes to UI
- [ ] Components reusable across routes
- [ ] Props properly typed
- [ ] Tests cover component behavior
- [ ] Accessibility maintained
- [ ] Code reduced in app.generate.tsx by ~50%

## Risk Assessment

**Low Risk**: Breaking existing functionality
**Mitigation**: Manual testing, no logic changes

**Low Risk**: Component coupling
**Mitigation**: Keep components pure, props-based

## Security Considerations

- Components handle no sensitive data directly
- Validation remains in route actions
- No XSS risks (React escapes by default)

## Next Steps

After completion, proceed to:
- [Phase 05: Testing & Validation](phase-05-testing-validation.md)

## Notes

- Components focus on presentation only
- Business logic stays in route actions
- Consider Storybook for component catalog (future)
- Keep components simple and composable (KISS)
