# Phase 2: Improve Regex Edge Cases

## Objective
Enhance `rewriteSectionSettings()` to handle edge cases the current regex misses.

## Current Implementation
**File:** `app/utils/settings-transform.server.ts:136-142`

```typescript
export function rewriteSectionSettings(code: string): string {
  return code.replace(
    /section\.settings\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
    'settings_$1'
  );
}
```

## Edge Cases Not Handled

### 1. Filter Chains
**Input:** `{{ section.settings.title | upcase }}`
**Current:** Works correctly (regex only matches property name)
**Status:** OK

### 2. Assign Statements
**Input:** `{% assign my_title = section.settings.title %}`
**Current:** Works correctly
**Status:** OK

### 3. Array/Hash Access (FAILS)
**Input:** `{{ section.settings['title'] }}`
**Current:** NOT transformed (bracket notation not matched)
**Fix Required:** Add bracket notation pattern

### 4. Nested Property Access (FAILS)
**Input:** `{{ section.settings.text.size }}`
**Current:** Transforms to `{{ settings_text.size }}` (correct for primitive, but .size on string works in Liquid)
**Status:** OK (Liquid handles `.size` on strings)

### 5. Whitespace Variations (FAILS)
**Input:** `{{ section.settings .title }}` (space before dot)
**Current:** NOT transformed
**Note:** Invalid Liquid syntax, low priority

## Implementation Changes

### Enhanced Regex
```typescript
export function rewriteSectionSettings(code: string): string {
  // Handle dot notation: section.settings.property_name
  let result = code.replace(
    /section\.settings\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
    'settings_$1'
  );

  // Handle bracket notation: section.settings['property_name'] or section.settings["property_name"]
  result = result.replace(
    /section\.settings\[['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\]/g,
    'settings_$1'
  );

  return result;
}
```

## New Test Cases

**File:** `app/utils/__tests__/settings-transform.server.test.ts`

```typescript
it("should rewrite bracket notation with single quotes", () => {
  const code = "{{ section.settings['title'] }}";
  const result = rewriteSectionSettings(code);
  expect(result).toBe("{{ settings_title }}");
});

it("should rewrite bracket notation with double quotes", () => {
  const code = "{% if section.settings[\"show\"] %}";
  const result = rewriteSectionSettings(code);
  expect(result).toBe("{% if settings_show %}");
});

it("should preserve filter chains after rewrite", () => {
  const code = "{{ section.settings.title | upcase | truncate: 20 }}";
  const result = rewriteSectionSettings(code);
  expect(result).toBe("{{ settings_title | upcase | truncate: 20 }}");
});
```

## Effort
- Development: 30 minutes
- Testing: 30 minutes

## Risk
- Low-medium: Bracket notation is rarely used in AI-generated code
- Changes are additive, no regression to existing patterns
