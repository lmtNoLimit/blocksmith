# Code Review: Phase 2 Image Picker Pattern Changes

**Reviewer:** code-reviewer-a90b257
**Date:** 2026-01-05 22:10
**Scope:** app/services/ai.server.ts Phase 2 changes
**Changes:** +18 lines (20 insertions, 2 deletions)

---

## Overall Assessment

Phase 2 changes successfully address image_picker safety by introducing mandatory conditional rendering pattern. Implementation is secure, token-efficient, and architecturally sound. **CRITICAL MISMATCH** found in existing templates.

**Status:** ⚠️ APPROVED WITH CRITICAL FOLLOW-UP REQUIRED

---

## Critical Issues

### 🚨 ARCHITECTURAL MISMATCH: Existing Templates Violate New Pattern

**Location:** `app/data/default-templates.ts`

**Issue:** Two pre-built templates with `image_picker` settings violate the new IMAGE PLACEHOLDER PATTERN:

1. **Hero with Background Image** (line 166):
   ```liquid
   style="background-image: url('{{ section.settings.background_image | image_url: width: 1920 }}');"
   ```
   - NO conditional check for `background_image` existence
   - Direct usage without `{% if %}` guard
   - Will fail with new validation rules

2. **Split Hero** (line 328-336):
   ```liquid
   {% if section.settings.image %}
     <img src="{{ section.settings.image | image_url: width: 1200 }}" ...>
   {% else %}
     {{ 'lifestyle-1' | placeholder_svg_tag: 'split-hero__image' }}
   {% endif %}
   ```
   - ✅ CORRECT pattern (has conditional)
   - Uses `placeholder_svg_tag` properly
   - Follows new guidelines

**Impact:**
- 50% of existing templates fail new pattern (1 of 2 with image_picker)
- Users selecting "Hero with Background Image" will see broken output
- Contradicts SYSTEM_PROMPT requirement #11

**Required Action:**
```liquid
// Fix line 164-167 in default-templates.ts
<section
  class="hero-bg-section"
  {% if section.settings.background_image %}
    style="background-image: url('{{ section.settings.background_image | image_url: width: 1920 }}');"
  {% endif %}
>
```

OR use placeholder approach:
```liquid
{% if section.settings.background_image %}
  <section class="hero-bg-section" style="background-image: url('{{ section.settings.background_image | image_url: width: 1920 }}');">
{% else %}
  <section class="hero-bg-section" style="background: #e5e5e5;">
    <!-- Placeholder state -->
{% endif %}
```

---

## Security Analysis

### ✅ No Injection Risks

**Prompt Text Additions:**
- All added text is static documentation
- No user input interpolation
- No dynamic code generation in prompts
- Liquid examples properly escaped in string context

**Risk Level:** NONE

---

## Performance Analysis

### ✅ Token Efficiency: Excellent

**Additions Breakdown:**
- Line 50: +11 tokens (`MUST use conditional rendering...`)
- Lines 71-83: ~80 tokens (IMAGE PLACEHOLDER PATTERN block)
- Line 126: +13 tokens (CSS guidance)
- Line 178: +10 tokens (COMMON ERRORS #11)

**Total:** ~114 tokens added to SYSTEM_PROMPT

**Impact:**
- 114 tokens = 0.3% of typical 32K context budget
- High value-to-cost ratio (prevents runtime errors)
- Educational benefit reduces back-and-forth corrections

**Optimization Opportunities:**
- None recommended - additions are concise
- Could merge lines 80-83 into single bullet but loses readability

---

## Architecture Review

### ✅ Pattern Alignment: Strong

**Consistency Check:**
- ✅ Follows existing `=== SECTION ===` pattern structure
- ✅ Uses same documentation style as VALIDATION RULES
- ✅ Aligns with CSS RULES format (line 120-126)
- ✅ Matches COMMON ERRORS numbering convention

**Integration:**
- Placement after DISPLAY-ONLY section (line 71) is logical
- Appears before VALIDATION RULES where referenced
- CSS guidance (line 126) is contextually placed in CSS RULES
- Error #11 follows sequential numbering

**Best Practice Propagation:**
- Pattern matches "Split Hero" template (good example exists)
- Reusable across all image_picker scenarios
- Accessible via `placeholder_svg_tag` (Shopify built-in)

---

## YAGNI/KISS/DRY Assessment

### ✅ YAGNI (You Ain't Gonna Need It)

**Necessity Check:**
- ✅ Addresses real production issue (missing images → broken layouts)
- ✅ Prevents common error pattern (unconditional image usage)
- ✅ Mandatory for Shopify theme compliance
- ❌ NO speculative features added

### ✅ KISS (Keep It Simple, Stupid)

**Simplicity Check:**
- ✅ Single, clear pattern: `{% if %} ... {% else %} placeholder {% endif %}`
- ✅ Uses Shopify built-in `placeholder_svg_tag` (no custom code)
- ✅ 4-line example code (minimal cognitive load)
- ✅ No complex logic or edge cases

### ✅ DRY (Don't Repeat Yourself)

**Repetition Check:**
- ✅ Pattern documented ONCE in IMAGE PLACEHOLDER PATTERN section
- ✅ Referenced in COMMON ERRORS #11 (links to pattern, no duplication)
- ✅ CSS guidance mentions class name once
- ❌ NO redundant documentation

**Reusability:**
- Pattern applies to ALL image_picker settings
- CSS class `.ai-placeholder-image` is reusable convention
- `placeholder_svg_tag` filter is Shopify standard

---

## Positive Observations

1. **Educational Value:** Liquid example is copy-paste ready
2. **Safety First:** Pattern prevents layout collapse on empty images
3. **Network Efficiency:** `placeholder_svg_tag` = inline SVG (no HTTP request)
4. **Accessibility:** Encourages aspect-ratio for CLS prevention
5. **Comprehensive:** Covers schema, markup, AND styling layers

---

## Recommended Actions

### Priority 1: CRITICAL - Fix Template Mismatch
1. Update `app/data/default-templates.ts` line 164-167
2. Add conditional check to "Hero with Background Image" template
3. Test template rendering with/without image set
4. Verify placeholder displays correctly

### Priority 2: MEDIUM - Validation
1. Create test case for image_picker validation
2. Verify parseSchema.test.ts covers new pattern
3. Test AI output against new COMMON ERROR #11

### Priority 3: LOW - Documentation
1. Consider adding visual example to docs (screenshot of placeholder)
2. Update code-standards.md if pattern should apply beyond AI generation

---

## Metrics

- **Type Coverage:** N/A (documentation change)
- **Security Issues:** 0
- **Performance Impact:** +114 tokens (~0.3% context)
- **Template Compliance:** 50% (1/2 templates comply, 1 needs fix)
- **Pattern Violations:** 1 critical (Hero with Background Image)

---

## Unresolved Questions

1. Should existing templates be batch-audited for image_picker compliance?
2. Is there validation logic to enforce this pattern in AI output?
3. Should placeholder_svg_tag class name be configurable or always `ai-placeholder-image`?
4. Do we need runtime validation in preview to catch missing conditionals?

---

## Conclusion

Phase 2 changes are **architecturally sound, secure, and performant**. Pattern is well-documented and follows YAGNI/KISS/DRY principles.

**BLOCKING ISSUE:** Template mismatch MUST be resolved before Phase 2 is complete. "Hero with Background Image" template violates the new mandatory pattern and will produce invalid output.

**Recommendation:** Fix template, add test coverage, then merge Phase 2.
