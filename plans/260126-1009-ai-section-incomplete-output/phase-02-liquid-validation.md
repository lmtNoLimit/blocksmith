# Phase 02: Create Liquid Completeness Validator

## Context Links

- [Research: Liquid Validation Patterns](./research/researcher-02-liquid-code-validation.md)
- [Phase 01: Token Limits](./phase-01-token-limits.md)
- [Main Plan](./plan.md)

## Overview

Create `validateLiquidCompleteness()` function to detect truncated/incomplete Liquid code using stack-based tag matching and JSON schema validation.

## Key Insights

- Stack-based algorithm: O(n) time, O(n) space for tag matching
- Liquid blocks require explicit closures: `{% if %}...{% endif %}`
- Schema block must contain valid JSON
- Current `isCompleteLiquidSection()` only checks presence, not closure
- Minimal solution (YAGNI): don't add npm dependencies

## Requirements

1. Validate HTML tag closure (stack-based)
2. Validate Liquid tag closure (`if`, `for`, `case`, `form`, etc.)
3. Validate `{% schema %}...{% endschema %}` exists and closed
4. Validate schema JSON is parseable
5. Return detailed validation result with error locations
6. Add feature flag `FLAG_VALIDATE_LIQUID`

## Architecture

```
code-extractor.ts
├── extractCodeFromResponse() (existing)
├── isCompleteLiquidSection() (existing, basic)
└── validateLiquidCompleteness() (NEW)
    ├── validateLiquidTags()
    ├── validateHTMLTags()
    └── validateSchemaJSON()
```

Return type:
```typescript
interface LiquidValidationResult {
  isComplete: boolean;
  errors: Array<{
    type: 'unclosed_liquid_tag' | 'unclosed_html_tag' | 'invalid_schema_json' | 'missing_schema';
    tag?: string;
    message: string;
  }>;
  warnings: string[];
}
```

## Related Code Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/utils/code-extractor.ts` | 93-98 | Existing `isCompleteLiquidSection()` |

## Implementation Steps

### Step 1: Define types (5 min)

Add to `code-extractor.ts`:
```typescript
export interface LiquidValidationResult {
  isComplete: boolean;
  errors: LiquidValidationError[];
  warnings: string[];
  truncationPoint?: number; // Character index where truncation detected
}

interface LiquidValidationError {
  type: 'unclosed_liquid_tag' | 'unclosed_html_tag' | 'invalid_schema_json' | 'missing_schema';
  tag?: string;
  message: string;
}
```

### Step 2: Implement validateLiquidTags() (30 min)

Stack-based Liquid tag validator:
```typescript
const LIQUID_BLOCK_TAGS = ['if', 'unless', 'for', 'case', 'form', 'capture', 'paginate', 'tablerow'];

function validateLiquidTags(code: string): LiquidValidationError[] {
  const errors: LiquidValidationError[] = [];
  const stack: string[] = [];

  // Match opening tags: {% if %}, {% for %}, etc.
  const openingPattern = /\{%[-\s]*(\w+)/g;
  // Match closing tags: {% endif %}, {% endfor %}, etc.
  const closingPattern = /\{%[-\s]*end(\w+)[-\s]*%\}/g;

  let match;
  const openings: Array<{tag: string, index: number}> = [];
  const closings: Array<{tag: string, index: number}> = [];

  // Collect all opening tags
  while ((match = openingPattern.exec(code)) !== null) {
    const tag = match[1].toLowerCase();
    if (LIQUID_BLOCK_TAGS.includes(tag)) {
      openings.push({ tag, index: match.index });
    }
  }

  // Collect all closing tags
  while ((match = closingPattern.exec(code)) !== null) {
    closings.push({ tag: match[1].toLowerCase(), index: match.index });
  }

  // Stack-based matching (simplified)
  for (const opening of openings) {
    stack.push(opening.tag);
  }
  for (const closing of closings) {
    const last = stack.pop();
    if (last !== closing.tag) {
      errors.push({
        type: 'unclosed_liquid_tag',
        tag: last || closing.tag,
        message: last
          ? `Mismatched tag: expected end${last}, got end${closing.tag}`
          : `Unexpected closing tag: end${closing.tag}`
      });
    }
  }

  // Remaining unclosed tags
  for (const tag of stack) {
    errors.push({
      type: 'unclosed_liquid_tag',
      tag,
      message: `Unclosed Liquid tag: {% ${tag} %} missing {% end${tag} %}`
    });
  }

  return errors;
}
```

### Step 3: Implement validateHTMLTags() (30 min)

Stack-based HTML tag validator:
```typescript
const SELF_CLOSING_TAGS = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

function validateHTMLTags(code: string): LiquidValidationError[] {
  const errors: LiquidValidationError[] = [];
  const stack: string[] = [];

  // Match HTML tags (skip Liquid and self-closing)
  const tagPattern = /<\/?([a-z][a-z0-9-]*)[^>]*\/?>/gi;

  let match;
  while ((match = tagPattern.exec(code)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();

    // Skip self-closing
    if (SELF_CLOSING_TAGS.includes(tagName) || fullTag.endsWith('/>')) {
      continue;
    }

    if (fullTag.startsWith('</')) {
      // Closing tag
      const last = stack.pop();
      if (last !== tagName) {
        // Don't error on every mismatch - just note truncation
        if (!last) {
          errors.push({
            type: 'unclosed_html_tag',
            tag: tagName,
            message: `Unexpected closing tag: </${tagName}>`
          });
        }
      }
    } else {
      // Opening tag
      stack.push(tagName);
    }
  }

  // Only report if many unclosed (likely truncation)
  if (stack.length > 2) {
    errors.push({
      type: 'unclosed_html_tag',
      tag: stack[stack.length - 1],
      message: `Multiple unclosed HTML tags: ${stack.slice(-3).join(', ')}...`
    });
  }

  return errors;
}
```

### Step 4: Implement validateSchemaJSON() (20 min)

```typescript
function validateSchemaJSON(code: string): LiquidValidationError[] {
  const errors: LiquidValidationError[] = [];

  // Check schema block exists
  const schemaMatch = code.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);

  if (!schemaMatch) {
    // Check if schema started but not ended
    if (/\{%\s*schema\s*%\}/.test(code)) {
      errors.push({
        type: 'unclosed_liquid_tag',
        tag: 'schema',
        message: 'Schema block started but {% endschema %} missing'
      });
    } else {
      errors.push({
        type: 'missing_schema',
        message: 'No {% schema %}...{% endschema %} block found'
      });
    }
    return errors;
  }

  // Validate JSON
  const jsonContent = schemaMatch[1].trim();
  try {
    JSON.parse(jsonContent);
  } catch (e) {
    errors.push({
      type: 'invalid_schema_json',
      message: `Invalid JSON in schema: ${e instanceof Error ? e.message : 'Parse error'}`
    });
  }

  return errors;
}
```

### Step 5: Compose main function (15 min)

```typescript
export function validateLiquidCompleteness(code: string): LiquidValidationResult {
  const errors: LiquidValidationError[] = [];
  const warnings: string[] = [];

  // Run all validators
  errors.push(...validateSchemaJSON(code));
  errors.push(...validateLiquidTags(code));
  errors.push(...validateHTMLTags(code));

  // Heuristic warnings
  if (code.length < 200 && !code.includes('{% endschema %}')) {
    warnings.push('Code is very short and may be truncated');
  }

  if (code.endsWith(',') || code.endsWith('[') || code.endsWith('{')) {
    warnings.push('Code ends with incomplete JSON/array syntax');
  }

  return {
    isComplete: errors.length === 0,
    errors,
    warnings,
  };
}
```

### Step 6: Add feature flag (5 min)

Wrap validation in flag check:
```typescript
export function validateLiquidCompleteness(code: string): LiquidValidationResult {
  if (process.env.FLAG_VALIDATE_LIQUID !== 'true') {
    return { isComplete: true, errors: [], warnings: [] };
  }
  // ... validation logic
}
```

### Step 7: Add tests (30 min)

Create `code-extractor.test.ts` test cases:
- Complete valid section returns `isComplete: true`
- Missing `{% endschema %}` returns unclosed_liquid_tag error
- Invalid JSON in schema returns invalid_schema_json error
- Missing `{% endif %}` returns unclosed_liquid_tag error
- Very short code with heuristic warnings

## Todo List

- [ ] Add `LiquidValidationResult` and `LiquidValidationError` types
- [ ] Implement `validateLiquidTags()` with stack algorithm
- [ ] Implement `validateHTMLTags()` with stack algorithm
- [ ] Implement `validateSchemaJSON()` for schema validation
- [ ] Compose `validateLiquidCompleteness()` main function
- [ ] Add `FLAG_VALIDATE_LIQUID` feature flag
- [ ] Create comprehensive unit tests
- [ ] Test with real truncated outputs from production logs

## Success Criteria

- Detects missing `{% endschema %}`
- Detects unclosed `{% if %}`, `{% for %}` tags
- Validates schema JSON is parseable
- Returns actionable error messages
- Feature flag can disable validation
- Performance: < 10ms for typical section

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False positives | Medium | Medium | Heuristic tuning, warnings vs errors |
| Regex edge cases | Low | Low | Comprehensive test suite |
| Performance on large code | Low | Low | O(n) algorithm |

## Security Considerations

- No user input processed (code already sanitized)
- No external calls
- Regex DoS unlikely with bounded input (MAX_CODE_LENGTH: 100K)

## Next Steps

After completing Phase 02:
1. Deploy and monitor validation results in logs
2. Tune false positive rate based on production data
3. Proceed to Phase 03 (auto-continuation)
