---
phase: 02
title: "Refactor System Prompt for Raw Liquid Output"
status: done
effort: 2h
---

# Phase 02: Refactor System Prompt for Raw Liquid Output

## Context Links

- [Plan Overview](./plan.md)
- [Prompt Engineering Research](./research/researcher-02-prompt-engineering.md)

## Overview

**Priority:** P1 - Core change enabling direct output
**Current Status:** Pending
**Depends On:** Phase 01 complete

Refactor the 400+ line SYSTEM_PROMPT to ~100 focused lines with explicit raw output instructions, markers, and few-shot examples. **Validated:** Keep core schema/CSS/form rules per user feedback.

## Key Insights

From research:
- Long prompts (400+ lines) dilute core instructions - 40% performance variance
- Few-shot examples train model on exact output format better than explanation
- Markers (`===START LIQUID===`) prevent markdown fence confusion
- Temperature 0.2-0.3 for deterministic output
- Explicit negation ("NO markdown, NO backticks") more effective than positive-only

## Requirements

### Functional
- AI outputs raw Liquid code without markdown fences
- Output wrapped with `===START LIQUID===` / `===END LIQUID===` markers
- No explanatory text before/after code
- 2-3 few-shot examples demonstrating format
- Temperature reduced to 0.3

### Non-Functional
- Prompt under 100 lines total
- Maintain essential Liquid syntax rules (schema, settings)
- CRO reasoning instructions preserved (separate append)

## Related Code Files

### File to MODIFY

| File | Location |
|------|----------|
| `app/services/ai.server.ts` | Lines 18-397 (SYSTEM_PROMPT) |
| `app/services/ai.server.ts` | Lines 14-16 (GENERATION_CONFIG) |

### Functions to REMOVE

| Function | Lines | Reason |
|----------|-------|--------|
| `stripMarkdownFences` | 560-567 | No longer needed - AI won't output fences |
| `sanitizeLiquidForms` | 573-592 | Move to input-sanitizer.ts if needed |

### Constants to UPDATE

| Constant | Current | New |
|----------|---------|-----|
| `GENERATION_CONFIG.temperature` | 0.7 | 0.3 |

## Architecture

### New SYSTEM_PROMPT Structure (~100 lines)

**Validated decision:** Keep prompt at ~100 lines to preserve essential schema/CSS/form rules.

```
1. Role statement (2 lines)
2. Output format requirement (5 lines)
   - Raw Liquid only
   - NO markdown fences
   - Wrap with markers
3. Few-shot examples (25 lines)
   - 2 examples of correct output
4. Schema rules (25 lines)
   - Required structure
   - Settings type rules
   - Critical validation rules
5. CSS rules (15 lines)
   - Scoping requirements
   - Mobile-first responsive
6. Form rules (15 lines)
   - Input sanitization patterns
   - Security considerations
7. Negative constraints (10 lines)
   - Explicit "DO NOT" statements
```

### Marker Format

```liquid
===START LIQUID===
{% schema %}
...
{% endschema %}

{% style %}
...
{% endstyle %}

<div class="ai-section">
...
</div>
===END LIQUID===
```

## Implementation Steps

1. **Create new SYSTEM_PROMPT constant**

   Replace lines 18-397 with condensed version:

   ```typescript
   export const SYSTEM_PROMPT = `You are a Shopify Liquid code generator. Generate production-ready sections.

OUTPUT FORMAT (CRITICAL):
- Output ONLY raw Liquid code
- NO markdown fences (\`\`\`), NO backticks, NO explanations
- NO text before or after code
- Wrap output exactly: ===START LIQUID=== [code] ===END LIQUID===

STRUCTURE (required order):
1. {% schema %}...{% endschema %} - JSON config with name, settings, presets
2. {% style %}...{% endstyle %} - Scoped CSS with #shopify-section-{{ section.id }}
3. HTML/Liquid markup

EXAMPLE OUTPUT:
===START LIQUID===
{% schema %}
{
  "name": "Hero Banner",
  "settings": [
    {"type": "text", "id": "heading", "label": "Heading", "default": "Welcome"}
  ],
  "presets": [{"name": "Hero Banner"}]
}
{% endschema %}

{% style %}
#shopify-section-{{ section.id }} .ai-hero { padding: 40px; text-align: center; }
{% endstyle %}

<div class="ai-hero">
  <h1>{{ section.settings.heading }}</h1>
</div>
===END LIQUID===

SCHEMA RULES:
- name: Required, max 25 chars, Title Case
- presets: Required for dynamic sections, name must match schema name
- settings: Use correct types (text, number, color, image_picker, select, range)
- number default must be number type (5 not "5")
- range requires min, max, step
- select requires options array
- image_picker has NO default - always use conditional: {% if section.settings.image %}

CSS RULES:
- Prefix selectors with #shopify-section-{{ section.id }}
- Prefix custom classes with "ai-"
- Mobile-first responsive

DO NOT:
- Add markdown code fences
- Include explanatory text
- Output partial sections
- Use translation keys (t:sections...)`;
   ```

2. **Update GENERATION_CONFIG (line 14-16)**

   ```typescript
   const GENERATION_CONFIG = {
     maxOutputTokens: 65536,
     temperature: 0.3  // Changed from 0.7
   };
   ```

3. **Remove stripMarkdownFences method (lines 560-567)**
   - Delete the method entirely
   - Update `generateSection` to not call it (line 545)

4. **Move sanitizeLiquidForms if needed**
   - If form sanitization still needed, move to `input-sanitizer.ts`
   - Or remove if deemed unnecessary with new prompt

5. **Update CHAT_SYSTEM_EXTENSION in context-builder.ts**

   File: `app/utils/context-builder.ts`, lines 21-62

   Replace with simpler version:
   ```typescript
   const CHAT_SYSTEM_EXTENSION = `

=== CONVERSATION MODE ===

For refinements, output the COMPLETE updated section.
Wrap output: ===START LIQUID=== [full code] ===END LIQUID===

RULES:
- Always output complete section (schema + style + markup)
- NO markdown fences, NO explanations
- Base changes on provided current code
- For questions (not code changes), answer without code`;
   ```

6. **Update CRO_REASONING_INSTRUCTIONS position**

   Ensure CRO reasoning block comes AFTER the end marker:
   ```
   ===END LIQUID===

   <!-- CRO_REASONING_START -->
   ...
   <!-- CRO_REASONING_END -->
   ```

## Todo List

- [x] Backup current SYSTEM_PROMPT for reference (old prompt preserved in git history)
- [x] Write new condensed SYSTEM_PROMPT (~80 lines with core schema/CSS/form rules)
- [x] Update GENERATION_CONFIG temperature to 0.3
- [x] Replace stripMarkdownFences with extractCodeFromMarkers (handles both markers + fallback)
- [x] Keep sanitizeLiquidForms - still needed for form security validation
- [x] Update CHAT_SYSTEM_EXTENSION in context-builder.ts (simpler, marker-based)
- [x] Update CRO_REASONING_INSTRUCTIONS marker position (after ===END LIQUID===)
- [ ] Test with manual API call to verify output format
- [x] Document any essential rules that were removed (see notes below)

## Success Criteria

- [x] SYSTEM_PROMPT under 100 lines (~80 lines)
- [ ] AI outputs raw Liquid wrapped in markers (to be verified in Phase 03)
- [x] Marker extraction implemented with markdown fence fallback
- [x] Temperature set to 0.3
- [x] TypeScript compiles without errors (build passes)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lost essential rules causes bad output | High | Keep schema/CSS core rules; test thoroughly |
| AI still outputs markdown despite prompt | Medium | Add fallback marker strip in Phase 03 |
| Temperature too low causes repetitive output | Low | Can adjust to 0.4 if needed |

## Security Considerations

- Form sanitization logic preserved in input-sanitizer.ts
- XSS patterns still checked on final output
- No security rules removed from prompt

## Implementation Notes

### Rules Removed/Condensed
The following detailed rules were condensed or removed for brevity (still work due to model training):
- Detailed input type reference (text, textarea, richtext, etc.) - condensed to single list
- Block configuration details - AI generally handles well
- Preview settings documentation - edge case
- Detailed resource picker patterns - condensed to essential conditional check rule
- Pagination documentation - edge case
- Extensive common errors list - condensed to DO NOT section

### Key Rules Preserved
- Schema structure requirements (name, presets, settings types)
- Image conditional patterns (critical)
- CSS scoping rules
- Form argument requirements (security-critical)
- Label format (plain text only)
- Number type validation

### Changes Made
1. SYSTEM_PROMPT: 400→80 lines with markers + few-shot example
2. GENERATION_CONFIG: temperature 0.7→0.3
3. stripMarkdownFences→extractCodeFromMarkers (handles both formats)
4. sanitizeLiquidForms: kept for form security
5. CHAT_SYSTEM_EXTENSION: 45→12 lines, marker-based
6. CRO_REASONING_INSTRUCTIONS: condensed, positions after ===END LIQUID===

## Next Steps

After this phase:
- Phase 03: Update api.chat.stream.tsx to use markers for extraction
- Phase 04: Update useChat.ts to strip markers and store directly
