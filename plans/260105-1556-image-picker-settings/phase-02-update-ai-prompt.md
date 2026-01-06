# Phase 2: Update AI Prompt for Conditional Image Rendering

## Context Links

- [Placeholder Patterns Research](./research/researcher-02-placeholder-patterns.md)
- [ai.server.ts](../../app/services/ai.server.ts)
- [default-templates.ts](../../app/data/default-templates.ts) - shows correct pattern

## Overview

**Priority:** P1
**Status:** Pending
**Effort:** 1h

Update `SYSTEM_PROMPT` in ai.server.ts to require conditional image rendering with placeholder fallback. AI-generated code must include `{% if image %}...{% else %}placeholder{% endif %}` pattern.

## Key Insights

- Current prompt documents `image_picker` but lacks rendering guidance
- Shopify's `placeholder_svg_tag` filter outputs inline SVG (zero network cost)
- Best practice: check `{% if section.settings.image %}` before rendering
- `default-templates.ts` already shows correct pattern (lines 328-337)

## Requirements

**Functional:**
- AI generates conditional checks for all image_picker settings
- Fallback uses `placeholder_svg_tag` or styled empty div
- Generated code never assumes image exists

**Non-Functional:**
- Prompt additions stay concise (token efficiency)
- Compatible with existing section regeneration

## Related Code Files

**Modify:**
- `app/services/ai.server.ts` - SYSTEM_PROMPT constant

**Reference:**
- `app/data/default-templates.ts` - correct pattern example

## Implementation Steps

1. Open `app/services/ai.server.ts`
2. Locate `SYSTEM_PROMPT` constant (line 6)
3. Find MEDIA section (around line 49-53)
4. Add new section after MEDIA types:

```typescript
=== IMAGE PLACEHOLDER PATTERN (REQUIRED) ===
All image_picker settings MUST use conditional rendering:

{% if section.settings.image %}
  {{ section.settings.image | image_url: width: 1200 | image_tag }}
{% else %}
  {{ 'image' | placeholder_svg_tag: 'ai-placeholder-image' }}
{% endif %}

- NEVER assume image exists - always check first
- Use placeholder_svg_tag for empty state (inline SVG, no network request)
- Add CSS class to placeholder for styling consistency
- Container should have aspect-ratio or min-height for placeholder
```

5. Update image_picker line in MEDIA section:
```typescript
// FROM:
- image_picker: Returns image object. NO default supported

// TO:
- image_picker: Returns image object. NO default supported. MUST use conditional rendering (see IMAGE PLACEHOLDER PATTERN)
```

6. Add CSS rule in CSS RULES section:
```typescript
- Style .ai-placeholder-image with aspect-ratio and background-color
```

7. Test by generating new section with image_picker

## Todo List

- [ ] Add IMAGE PLACEHOLDER PATTERN section to SYSTEM_PROMPT
- [ ] Update image_picker reference to point to pattern
- [ ] Add placeholder CSS guidance
- [ ] Generate test section, verify conditional output
- [ ] Verify existing prompts still work

## Success Criteria

- AI generates `{% if image %}` checks for all image_picker settings
- Fallback uses `placeholder_svg_tag` filter
- Generated CSS includes placeholder styling
- No regression in other setting types

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Prompt too long | Keep additions concise (<200 chars) |
| AI ignores new rules | Add to COMMON ERRORS section |
| Breaks existing sections | Only affects new generations |

## Security Considerations

None - prompt modification only.

## Next Steps

Proceed to Phase 3: Preview Placeholder Support for transform layer.
