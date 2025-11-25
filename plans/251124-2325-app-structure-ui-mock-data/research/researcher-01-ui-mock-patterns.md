# Research Report: Mock Data & UI Component Patterns for Shopify Embedded Apps

**Research Date:** 2025-11-24
**Focus:** React Router 7, Polaris web components, mock data strategies

## Executive Summary

For Shopify embedded apps awaiting write_themes permission, implement parallel development using comprehensive mock data layers. React Router 7 handles state elegantly via route loaders/actions while Polaris web components provide headless UI flexibility. Use adapter pattern to switch between mock/real APIs without code refactoring. Test data generation via Shopify's partner tools bridges dev/production gap.

## Key Findings

### 1. Mock Data Architecture

**Strategy: Layered Adapter Pattern**
- Create data access layer separating UI from API sources
- Implement feature flags/environment checks to route between mock/real endpoints
- Mock data lives in `services/mocks/` directory alongside real services
- Use TypeScript interfaces to ensure mock/real data shape parity

**Mock Data Structure:**
```typescript
// services/data/themes.ts
export const mockThemes = [
  { id: '123', name: 'Dawn', role: 'main' },
  { id: '456', name: 'Custom Section Theme', role: 'unpublished' }
];

export const mockSections = [
  {
    id: 'hero-1',
    name: 'Hero Section',
    theme_id: '123',
    body: '{% section "hero" %} ... {% endsection %}'
  }
];

// services/api-client.ts
const API_ENABLED = process.env.REACT_APP_API_MODE === 'real';

export async function fetchThemes() {
  return API_ENABLED
    ? await adminGraphql(THEMES_QUERY)
    : Promise.resolve(mockThemes);
}
```

### 2. React Router 7 State Management

**Preferred Pattern: Route Loaders + useFetcher**
- Loaders fetch data before rendering (avoid waterfalls)
- Actions handle mutations via Form submissions
- useFetcher for non-navigational updates
- URL params store filter/sort state (naturally persists)

```typescript
// routes/app.sections.tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const themeId = params.themeId;
  const sections = await fetchSections(themeId);
  return { sections, themeId };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === 'POST') {
    const formData = await request.formData();
    const sectionData = Object.fromEntries(formData);
    return await saveSection(sectionData);
  }
}

export default function SectionsPage() {
  const { sections, themeId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Mutate without navigation
  const handleSave = (data) => {
    fetcher.submit(data, { method: 'POST' });
  };
}
```

### 3. Polaris Web Components Integration

**Architecture: Component Layer**
- Polaris web components (custom elements) work with any framework
- Bind React state via standard DOM patterns, not special props
- Keep components framework-agnostic

```typescript
// components/ThemeSelector.tsx
export function ThemeSelector({ themes, selected, onChange }: Props) {
  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.currentTarget.value)}
      style={{ padding: '12px', borderRadius: '4px' }}
    >
      {themes.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}

// Alternatively use Polaris web components directly
<shopify-select
  value={selected}
  onChange={handleChange}>
  {themes.map(t => (
    <shopify-option key={t.id} value={t.id}>{t.name}</shopify-option>
  ))}
</shopify-select>
```

### 4. Transition Strategy: Mock → Real

**Phase 1 (Current): Mock Only**
- All API calls return mock data
- UI development unblocked
- Feature flags disabled

**Phase 2 (API Approval): Conditional Routing**
```typescript
// services/config.ts
const USE_REAL_API = process.env.REACT_APP_USE_REAL_API === 'true';

export const apiClient = {
  themes: USE_REAL_API ? realThemesAPI : mockThemesAPI,
  sections: USE_REAL_API ? realSectionsAPI : mockSectionsAPI,
};
```

**Phase 3 (Production): Real API Only**
- Remove mock layer, use real endpoints exclusively
- No code changes needed at call sites (same interface)

### 5. Directory Structure

```
src/
├── components/          # Polaris + custom UI
│   ├── ThemeSelector.tsx
│   ├── SectionPreview.tsx
│   └── CodeEditor.tsx
├── routes/             # React Router pages
│   ├── app.tsx
│   ├── app.sections.tsx
│   └── app.generate.tsx
├── services/
│   ├── api-client.ts   # Single entry point
│   ├── real/           # Real API implementations
│   │   ├── themes.ts
│   │   └── sections.ts
│   └── mocks/          # Mock data
│       ├── themes.ts
│       └── sections.ts
├── types/              # Shared TypeScript types
│   └── shopify.ts
└── hooks/              # Custom React hooks
    ├── useThemes.ts
    └── useSectionGeneration.ts
```

### 6. Testing with Mock Data

```typescript
// __tests__/sections.test.ts
import { render, screen } from '@testing-library/react';
import { mockSections } from '@services/mocks/sections';

describe('SectionsPage', () => {
  it('renders mock sections', () => {
    render(<SectionsPage initialData={mockSections} />);
    expect(screen.getByText('Hero Section')).toBeInTheDocument();
  });
});
```

## Best Practices

| Practice | Why |
|----------|-----|
| Parity in shape | Mock data types match real API responses exactly |
| Feature flags | Toggle APIs at single config point; no scattered if-statements |
| Loader-based fetching | Avoid waterfalls; data ready before render |
| URL state | Filters/pagination persist naturally |
| Error boundaries | Handle API failures gracefully during transition |
| API contract validation | Use TypeScript types across mock/real layers |

## Unresolved Questions

1. Should fallback mock data reside server-side (loader) or client-side? (Recommend: server-side for security, no leaked real shop data in JS)
2. How to test real API integration before write_themes approval? (Recommend: integration tests with mock Shopify server if available)
3. Should Polaris React or web components be primary? (Recommend: Web components for framework flexibility, but React wrappers available)
