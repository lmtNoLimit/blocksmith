# Liquid/HTML Code Completeness Validation Patterns

## 1. Stack-Based HTML Tag Validation Algorithm

**Core Principle**: Use LIFO (Last In, First Out) structure to validate proper nesting.

**Algorithm**:
```
for each tag in document:
  if opening_tag_requiring_close:
    push tag onto stack
    increment indentation
  else if closing_tag:
    pop stack
    compare closing tag with popped tag
    if mismatch: error (unclosed/mismatched tag)
    decrement indentation

if stack not empty after parsing:
  error (unclosed tags remaining)
```

**Detection Points**:
- Missing closing tags (orphaned on stack)
- Mismatched closing tags (doesn't match stack top)
- Improperly nested tags (wrong closure order)
- Self-closing tags (skip stack operations)

**Complexity**: O(n) time, O(n) space worst-case (deeply nested HTML).

---

## 2. Liquid Tag Closure Validation

Liquid blocks require explicit closing tags. Must detect unclosed:
- `{% if %}...{% endif %}`
- `{% for %}...{% endfor %}`
- `{% case %}...{% endcase %}`
- `{% block %}...{% endblock %}`
- `{% form %}...{% endform %}`

**Detection Strategy**:
1. Regex extract all opening tags: `/\{%[-\s]*(\w+)/g`
2. For each opening tag, verify matching closing tag exists
3. Validate closure order (stack-based, similar to HTML)
4. Flag orphaned closing tags without matching opener

**Critical for Blocksmith**: `{% form %}` tags MUST have correct arguments or be removed (already sanitized in `section.server.ts` line 16-17).

---

## 3. JSON Schema Block Validation (`{% schema %}`)

**Structure Rules**:
- Single `{% schema %}` per file (no multiple)
- Not nested inside other Liquid tags (must be root-level)
- Contains ONLY valid JSON (no Liquid processing inside)

**Validation Steps**:
1. Extract schema block: `/{% schema %}\s*([\s\S]*?)\s*{% endschema %}/`
2. Parse JSON - catch `SyntaxError` for malformed JSON
3. Validate required fields:
   - `name` (string, required)
   - `settings` (array, optional)
   - `blocks` (array, optional)
   - `presets` (array, required for dynamic sections)
4. Check schema constraints:
   - All setting IDs unique within scope
   - All block type IDs unique
   - Range/select options properly formatted
   - Defaults match expected types (e.g., number not string "5")

**Early Exit Detection**: If `{% schema %}` tag exists but closing `{% endschema %}` missing = incomplete.

---

## 4. Truncation Detection Patterns

**Three-Level Detection**:

**Level 1 - Structural**: Check for mandatory closing tags
```
Missing: {% endschema %}, {% endstyle %}, {% endfor %}, {% endif %}
Pattern: /\{%[-\s]*end\w+[-\s]*%\}/ should match all openers
```

**Level 2 - Boundary Markers**: Validate section structure order
```
Expected: {% schema %} → {% style %} → HTML/Liquid markup
If schema starts but style/markup incomplete = truncation
```

**Level 3 - Content Completeness**: Heuristics
- Schema JSON not closed (ends with `,` or `[` without `]`)
- Style block not closed (ends inside CSS rule)
- Open strings in markup (unmatched quotes)
- Incomplete HTML attributes

**Current Blocksmith Handling** (from `ai.server.ts`):
- Strips markdown fences (line 431-437)
- Sanitizes invalid form tags (line 444-448)
- BUT: No explicit truncation detection yet

---

## 5. NPM Packages for Validation

### Official Shopify Solution
**`@shopify/liquid-html-parser`** (v2.0+)
- Turns .liquid file into AST with Liquid + HTML nodes
- Installation: `npm install @shopify/liquid-html-parser`
- Powers shopify-cli linter, prettier, language server
- **Limitations**: Focuses on parsing (AST generation), not validation/completeness

### Alternative Packages
- **`liquidjs`** (shopify-liquid renamed) - JavaScript Liquid engine
- **`@shopify/liquid-prettier-plugin`** - Code formatter with syntax checks

### HTML Validation (not Liquid-specific)
- **`html-validator`** - Standard HTML5 validation
- **Custom stack-based validators** - Educational but reliable

---

## 6. Best Practices for Detecting Incomplete Output

### A. Output Length Baseline
Establish minimum expected code length:
- Blocksmith sections: typically 300-800 chars
- Threshold: If generated code < 200 chars AND doesn't end with `%}` = likely truncated

### B. Completion Validation Checklist
```
✓ {% schema %} ... {% endschema %} - complete & valid JSON
✓ {% style %} ... {% endstyle %} (if present) - complete
✓ All Liquid blocks closed (if/for/case/form)
✓ No unmatched HTML tags
✓ Ends with valid HTML close tag or %} (not mid-tag)
```

### C. Re-Prompt Strategy
If validation fails:
1. Detect failure type (which block incomplete)
2. Include in follow-up: "Continue from line X..." or retry with higher token limit
3. Implement continuation logic for streaming responses

### D. Token Limit Handling
For LLMs like Gemini Flash:
- Monitor response finish_reason (e.g., "length" = token limit hit)
- Batch generation: Request only schema+style first, then markup
- Set higher output tokens for complex sections

---

## 7. Implementation Recommendation for Blocksmith

**Minimal Solution** (YAGNI):
1. Add `isCodeComplete(code: string): boolean` function in `section.server.ts`
2. Check:
   - Schema block closed: `{% endschema %}` exists
   - Style block (if present) closed: `{% endstyle %}` exists
   - No unmatched `{% if %}`, `{% for %}`, `{% form %}` tags
3. Validate schema JSON parseable
4. Return validation error if incomplete

**Medium Solution**:
Use `@shopify/liquid-html-parser` for AST-based validation (more robust but adds dependency).

**Token Efficiency**:
Pre-request validation saves re-generation costs. Current ai.server.ts sanitization (lines 414-418) is good first step.

---

## Sources

- [Shopify Liquid GitHub](https://github.com/Shopify/liquid)
- [jeremywrowe/liquid-validator](https://github.com/jeremywrowe/liquid-validator)
- [@shopify/liquid-html-parser npm](https://www.npmjs.com/package/@shopify/liquid-html-parser)
- [Stack-based HTML validation algorithms](https://datadependence.com/2016/03/find-unclosed-tags-using-stacks/)
- [Shopify Block Schema Docs](https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/schema)
- [Detecting LLM output truncation](https://medium.com/@gopidurgaprasad762/overcoming-output-token-limits-a-smarter-way-to-generate-long-llm-responses-efe297857a76)
- [LLM Validation Patterns](https://community.n8n.io/t/handling-llm-output-and-truncation-in-workflows/106830)
