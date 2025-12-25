# Phase 3: Block Iteration Support (Optional/Future)

## Objective
Support `{% for block in section.blocks %}` pattern commonly used in Shopify sections.

## Current State
**File:** `app/utils/settings-transform.server.ts:144-156`

The `rewriteBlocksIteration()` function is a **no-op placeholder**:
```typescript
export function rewriteBlocksIteration(code: string): string {
  return code;  // Intentionally does nothing
}
```

## The Challenge

Shopify sections commonly use:
```liquid
{% for block in section.blocks %}
  <div>{{ block.settings.title }}</div>
{% endfor %}
```

This is difficult to transform because:
1. `block` variable is dynamically scoped inside the for loop
2. We inject `block_0_title`, `block_1_title` etc. as flat variables
3. No way to map `block.settings.title` to `block_{{ forloop.index0 }}_title` with regex
4. Liquid doesn't support string interpolation for variable names

## Possible Solutions

### Option A: Unroll Loop (Complex)
Transform the loop into repeated blocks:

**Input:**
```liquid
{% for block in section.blocks %}
  <div>{{ block.settings.title }}</div>
{% endfor %}
```

**Output:**
```liquid
{% if blocks_count > 0 %}
  <div>{{ block_0_title }}</div>
{% endif %}
{% if blocks_count > 1 %}
  <div>{{ block_1_title }}</div>
{% endif %}
<!-- ... up to max blocks -->
```

**Drawbacks:**
- Requires complex AST parsing
- Output size explodes with max blocks
- Hard to handle nested loops

### Option B: Use JavaScript Templating (Recommended)
Pre-render block loop on server before sending to App Proxy:

1. Parse Liquid AST
2. Identify `for block in section.blocks` loops
3. Render loop content N times with indexed block variables
4. Send unrolled content to App Proxy

**Effort:** High (2-4 hours)

### Option C: Document Limitation (Simplest)
Keep current behavior and document that:
- Templates should use `block_N_X` pattern directly for App Proxy preview
- OR AI prompt should generate preview-compatible syntax

**Example Template:**
```liquid
{% for i in (0..blocks_count) %}
  {% if i == 0 %}
    <div>{{ block_0_title }}</div>
  {% elsif i == 1 %}
    <div>{{ block_1_title }}</div>
  {% endif %}
{% endfor %}
```

## Recommendation
**Defer to future phase.** Current workaround:
1. AI-generated sections work for section.settings (after Phase 1)
2. Block iteration is less common in initial section generation
3. Document limitation in user guide

## Effort (if implemented)
- Option A: 4-6 hours
- Option B: 2-4 hours
- Option C: 30 minutes (documentation only)

## Decision
Mark as **P2/Future** - implement Option B when user demand justifies effort.
