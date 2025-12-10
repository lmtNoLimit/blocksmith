# Phase 3: Advanced Tags

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Dependencies**: Phase 1 (filters), Phase 2 (objects)
- **Related Docs**: [research/researcher-02-liquid-filters-tags.md](./research/researcher-02-liquid-filters-tags.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-10 |
| Description | Implement missing Shopify-specific Liquid tags |
| Priority | P1/P2 |
| Status | ✅ COMPLETE (2025-12-10 19:45 UTC) |
| Estimated Effort | 4-6 hours |
| Actual Effort | ~5 hours |

## Key Insights

1. `{% style %}` tag currently uses regex workaround - needs proper tag implementation
2. `{% liquid %}` tag enables multi-statement blocks without repeated delimiters
3. `{% tablerow %}` needed for table-based layouts (product grids)
4. `{% include %}` differs from `{% render %}` in scope handling
5. forloop injection needed for proper for-loop metadata

## Requirements

### P1: Critical Tags

| Tag | Syntax | Current | Action |
|-----|--------|---------|--------|
| style | `{% style %} CSS {% endstyle %}` | Regex workaround | Proper tag |
| liquid | `{% liquid assign x = 1 \n if x %} ... {% endliquid %}` | Missing | Implement |
| include | `{% include 'snippet', var: value %}` | Missing | Implement with shared scope |

### P1: Loop Enhancement

| Tag | Feature | Current | Action |
|-----|---------|---------|--------|
| for | forloop variable | Missing | Inject ForloopDrop |
| for | limit/offset | Built-in | Verify |
| for | reversed | Built-in | Verify |

### P2: Table/Layout Tags

| Tag | Syntax | Current | Action |
|-----|--------|---------|--------|
| tablerow | `{% tablerow item in array cols: 3 %}` | Missing | Implement |
| endtablerow | closing tag | Missing | Implement |

### P3: Advanced Tags (Lower Priority)

| Tag | Syntax | Current | Action |
|-----|--------|---------|--------|
| layout | `{% layout 'name' %}` or `{% layout none %}` | Missing | Stub |
| content_for | `{% content_for 'header' %} ... {% endcontent_for %}` | Missing | Stub |
| sections | `{% sections 'group' %}` | Missing | Stub |

## Related Code Files

- `app/components/preview/hooks/useLiquidRenderer.ts` - Tag registration
- `app/components/preview/drops/ForloopDrop.ts` - Loop metadata (from Phase 2)

## Implementation Steps

### Step 1: Implement style Tag

Update `useLiquidRenderer.ts`:

```typescript
// Register style tag (Shopify-specific, outputs scoped CSS)
engine.registerTag('style', {
  parse: function (tagToken: { getText: () => string }, remainTokens: TopLevelToken[]) {
    this.tpl = [];
    const stream = this.liquid.parser.parseStream(remainTokens);
    stream
      .on('tag:endstyle', () => stream.stop())
      .on('template', (tpl: Template | undefined) => {
        if (tpl) this.tpl.push(tpl);
      })
      .on('end', () => {
        throw new Error(`tag ${tagToken.getText()} not closed`);
      });
    stream.start();
  },
  render: async function (ctx: Context) {
    const cssContent = await this.liquid.renderer.renderTemplates(this.tpl, ctx);
    // Return style tag - will be extracted during post-processing
    return `<style data-shopify-style>${cssContent}</style>`;
  },
});

engine.registerTag('endstyle', {
  parse: function () {},
  render: function () {
    return Promise.resolve('');
  },
});
```

### Step 2: Implement liquid Tag

```typescript
// Register liquid tag (multi-statement block)
engine.registerTag('liquid', {
  parse: function (tagToken: { args: string }) {
    // The liquid tag contains multiple statements as its args
    this.statements = tagToken.args;
  },
  render: async function (ctx: Context) {
    if (!this.statements) return '';

    // Parse each line as a separate Liquid statement
    const lines = this.statements.split('\n').map((l: string) => l.trim()).filter(Boolean);
    let output = '';

    for (const line of lines) {
      // Wrap each line in proper Liquid delimiters and parse
      const wrappedLine = line.startsWith('echo ')
        ? `{{ ${line.replace(/^echo\s+/, '')} }}`
        : `{% ${line} %}`;

      try {
        output += await this.liquid.parseAndRender(wrappedLine, ctx.getAll());
      } catch (e) {
        // Log but continue on parse errors for resilience
        console.warn(`Liquid tag parse error: ${line}`, e);
      }
    }

    return output;
  },
});
```

### Step 3: Implement include Tag

```typescript
// Register include tag (shared scope, unlike render)
engine.registerTag('include', {
  parse: function (tagToken: { args: string }) {
    this.args = tagToken.args;
  },
  render: async function (ctx: Context) {
    // Extract snippet name from args
    let snippetName = 'unknown';
    if (this.args) {
      const match = this.args.match(/['"]([^'"]+)['"]/);
      snippetName = match ? match[1] : 'unknown';
    }

    // In a full implementation, this would:
    // 1. Load the snippet from file system
    // 2. Parse additional variables from args
    // 3. Render with SHARED scope (parent context accessible)

    // For preview, return placeholder
    return `<!-- Include snippet: ${snippetName} (not loaded in preview, shared scope) -->`;
  },
});
```

### Step 4: Implement tablerow Tag

```typescript
import { ForloopDrop } from '../drops';

// Register tablerow tag
engine.registerTag('tablerow', {
  parse: function (tagToken: { args: string; getText: () => string }, remainTokens: TopLevelToken[]) {
    this.args = tagToken.args;
    this.tpl = [];

    const stream = this.liquid.parser.parseStream(remainTokens);
    stream
      .on('tag:endtablerow', () => stream.stop())
      .on('template', (tpl: Template | undefined) => {
        if (tpl) this.tpl.push(tpl);
      })
      .on('end', () => {
        throw new Error(`tag ${tagToken.getText()} not closed`);
      });
    stream.start();
  },
  render: async function (ctx: Context) {
    // Parse: tablerow item in array cols:3 limit:6 offset:0
    const argsMatch = this.args.match(/(\w+)\s+in\s+(\S+)(?:\s+(.*))?/);
    if (!argsMatch) return '';

    const [, varName, collectionExpr, optionsStr] = argsMatch;

    // Parse options
    const options: { cols?: number; limit?: number; offset?: number } = {};
    if (optionsStr) {
      const colsMatch = optionsStr.match(/cols:\s*(\d+)/);
      const limitMatch = optionsStr.match(/limit:\s*(\d+)/);
      const offsetMatch = optionsStr.match(/offset:\s*(\d+)/);

      if (colsMatch) options.cols = parseInt(colsMatch[1], 10);
      if (limitMatch) options.limit = parseInt(limitMatch[1], 10);
      if (offsetMatch) options.offset = parseInt(offsetMatch[1], 10);
    }

    // Get collection from context
    const collection = await this.liquid.evalValue(collectionExpr, ctx);
    if (!Array.isArray(collection)) return '';

    // Apply offset and limit
    let items = collection;
    if (options.offset) items = items.slice(options.offset);
    if (options.limit) items = items.slice(0, options.limit);

    const cols = options.cols || items.length;
    let html = '';
    let row = 0;
    let col = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Start new row
      if (col === 0) {
        row++;
        html += `<tr class="row${row}">`;
      }

      col++;

      // Create tablerowloop object
      const tablerowloop = {
        index: i + 1,
        index0: i,
        rindex: items.length - i,
        rindex0: items.length - i - 1,
        first: i === 0,
        last: i === items.length - 1,
        length: items.length,
        col: col,
        col0: col - 1,
        col_first: col === 1,
        col_last: col === cols || i === items.length - 1,
        row: row
      };

      // Push context with item and tablerowloop
      ctx.push({ [varName]: item, tablerowloop, forloop: new ForloopDrop(i, items.length, varName) });

      // Render cell content
      const cellContent = await this.liquid.renderer.renderTemplates(this.tpl, ctx);
      html += `<td class="col${col}">${cellContent}</td>`;

      ctx.pop();

      // End row if needed
      if (col >= cols) {
        html += '</tr>';
        col = 0;
      }
    }

    // Close last row if incomplete
    if (col > 0) {
      html += '</tr>';
    }

    return html;
  },
});

engine.registerTag('endtablerow', {
  parse: function () {},
  render: function () {
    return Promise.resolve('');
  },
});
```

### Step 5: Enhance for Tag with forloop

LiquidJS has built-in for loop support, but we need to ensure forloop is properly available. Create a custom for tag extension:

```typescript
// This may require extending the built-in for tag behavior
// Check if LiquidJS provides forloop by default - it should
// If not, we need to override the for tag

// Test first: {{ forloop.index }} in a for loop
// LiquidJS should provide this, but verify it matches Shopify's implementation
```

### Step 6: Stub Tags for Compatibility

```typescript
// Layout tag - used in theme templates, not sections (stub for compatibility)
engine.registerTag('layout', {
  parse: function (tagToken: { args: string }) {
    this.args = tagToken.args;
  },
  render: async function () {
    // Extract layout name
    let layoutName = 'theme';
    if (this.args) {
      const match = this.args.match(/['"]([^'"]+)['"]/);
      if (match) layoutName = match[1];
      if (this.args.includes('none')) layoutName = 'none';
    }
    return `<!-- Layout: ${layoutName} (not applied in section preview) -->`;
  },
});

// content_for tag - used in themes for content blocks
engine.registerTag('content_for', {
  parse: function (tagToken: { args: string; getText: () => string }, remainTokens: TopLevelToken[]) {
    this.args = tagToken.args;
    this.tpl = [];

    const stream = this.liquid.parser.parseStream(remainTokens);
    stream
      .on('tag:endcontent_for', () => stream.stop())
      .on('template', (tpl: Template | undefined) => {
        if (tpl) this.tpl.push(tpl);
      })
      .on('end', () => {
        throw new Error(`tag ${tagToken.getText()} not closed`);
      });
    stream.start();
  },
  render: async function (ctx: Context) {
    // Render content for preview (won't be placed in layout)
    const content = await this.liquid.renderer.renderTemplates(this.tpl, ctx);
    return `<!-- content_for block -->${content}<!-- end content_for -->`;
  },
});

engine.registerTag('endcontent_for', {
  parse: function () {},
  render: function () {
    return Promise.resolve('');
  },
});

// sections tag - renders section groups
engine.registerTag('sections', {
  parse: function (tagToken: { args: string }) {
    this.args = tagToken.args;
  },
  render: async function () {
    let groupName = 'main';
    if (this.args) {
      const match = this.args.match(/['"]([^'"]+)['"]/);
      groupName = match ? match[1] : 'main';
    }
    return `<!-- Sections group: ${groupName} (not rendered in single section preview) -->`;
  },
});
```

### Step 7: Update Template Processing

Update the render function to handle style tag output:

```typescript
// In the render callback, update CSS extraction:
const render = useCallback(async (...) => {
  // ... existing code ...

  // Extract CSS from both {% style %} tag output and regular <style> tags
  const styleTagMatch = htmlTemplate.match(/<style[^>]*data-shopify-style[^>]*>([\s\S]*?)<\/style>/gi);
  const shopifyStyles = styleTagMatch?.map(s =>
    s.replace(/<style[^>]*>/gi, '').replace(/<\/style>/gi, '')
  ).join('\n') || '';

  // Combine with existing CSS extraction
  const css = [processedShopifyStyles, shopifyStyles, htmlStyles].filter(Boolean).join('\n');

  // Remove style tags from HTML output
  const cleanHtml = htmlTemplate.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // ... rest of processing ...
});
```

## Todo List

- [x] Implement `{% style %}` tag properly ✅ (2025-12-10)
- [x] Implement `{% liquid %}` multi-statement tag ✅ (2025-12-10)
- [x] Implement `{% include %}` tag with shared scope note ✅ (2025-12-10)
- [x] Implement `{% tablerow %}` tag with cols, limit, offset ✅ (2025-12-10)
- [x] Verify forloop availability in for loops ✅ (2025-12-10)
- [x] Add `{% layout %}` stub ✅ (2025-12-10)
- [x] Add `{% content_for %}` stub ✅ (2025-12-10)
- [x] Add `{% sections %}` stub ✅ (2025-12-10)
- [x] Update template processing for style tag output ✅ (2025-12-10)
- [x] Write unit tests for new tags ✅ (24 tests, 100% pass - 2025-12-10)
- [ ] Test with Dawn theme sections using these tags (manual testing pending)

## Success Criteria

1. `{% style %}` outputs proper CSS in preview
2. `{% liquid %}` multi-statement blocks work
3. `{% tablerow %}` generates proper table markup
4. tablerowloop object available with all properties
5. Stub tags don't break preview rendering
6. All new tags have unit tests

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| liquid tag parsing complexity | Medium | Medium | Simplified line-by-line parsing |
| tablerow edge cases | Medium | Low | Fallback to empty output |
| Performance with large tablerows | Low | Low | Limit iterations |

---

## Completion Summary

**Completion Date**: 2025-12-10 19:45 UTC
**Actual Duration**: ~5 hours
**Code Quality Grade**: A- (92/100)
**Review Report**: [reports/code-reviewer-251210-phase3-advanced-tags.md](./reports/code-reviewer-251210-phase3-advanced-tags.md)

### Implementation Deliverables
- ✅ `liquidTags.ts` - 454 lines, 8 tag implementations
- ✅ `useLiquidRenderer.ts` - Integration via registerShopifyTags()
- ✅ `liquidTags.test.ts` - 24 unit tests, 100% pass rate

### Success Criteria Status
1. ✅ `{% style %}` outputs proper CSS with data-shopify-style attribute
2. ✅ `{% liquid %}` multi-statement blocks work with assign/echo/conditionals
3. ✅ `{% tablerow %}` generates proper table markup with cols/limit/offset
4. ✅ tablerowloop object available with all properties (11 properties)
5. ✅ Stub tags don't break preview rendering
6. ✅ All new tags have unit tests (24 tests covering all implementations)

### Code Review Highlights
- Zero critical issues
- Correct LiquidJS generator implementation (`* render()` with `yield`)
- Strong test coverage (100% pass rate)
- Clean modular architecture
- Security: No dangerous eval/innerHTML patterns
- Performance: Generator-based, non-blocking
- Minor improvements recommended (max iterations, error comment output)

**Next Phase**: [phase-04-enhancements.md](./phase-04-enhancements.md)
