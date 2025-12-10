/**
 * Shopify-specific Liquid Tags for Preview
 * Implements tags not available in standard LiquidJS
 *
 * NOTE: LiquidJS uses generators, not async/await!
 * Use `* render(ctx, emitter)` with `yield` instead of `async render()` with `await`
 * @see https://liquidjs.com/tutorials/render-tag-content.html
 */
import type { Liquid, TopLevelToken, Context, Emitter } from 'liquidjs';
import { ForloopDrop } from '../drops';

// Template type for parsed templates
type Template = unknown;

/**
 * Register all Shopify-specific tags on a LiquidJS engine instance
 */
export function registerShopifyTags(engine: Liquid): void {
  registerFormTags(engine);
  registerPaginateTags(engine);
  registerSectionTags(engine);
  registerCommentTags(engine);
  registerStyleTags(engine);
  registerJavascriptTags(engine);
  registerLiquidTag(engine);
  registerIncludeTag(engine);
  registerTablerowTags(engine);
  registerLayoutStubs(engine);
}

// Form tags: {% form 'type' %} ... {% endform %}
function registerFormTags(engine: Liquid): void {
  engine.registerTag('form', {
    parse: function (tagToken: { args: string; getText: () => string }, remainTokens: TopLevelToken[]) {
      this.args = tagToken.args;
      this.tpl = [];
      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endform', () => stream.stop())
        .on('template', (tpl: Template) => {
          if (tpl) this.tpl.push(tpl);
        })
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });
      stream.start();
    },
    * render(ctx: Context, emitter: Emitter) {
      let formType = 'generic';
      if (this.args) {
        const match = this.args.match(/['"]([^'"]+)['"]/);
        formType = match ? match[1] : 'generic';
      }
      const formContext = {
        errors: [],
        posted_successfully: false,
        id: `form-${formType}-preview`,
        toString: () => '',
        valueOf: () => ''
      };
      ctx.push({ form: formContext });
      emitter.write(`<form method="post" class="shopify-form shopify-form-${formType}" data-preview="true">\n`);
      yield this.liquid.renderer.renderTemplates(this.tpl, ctx, emitter);
      emitter.write('\n</form>');
      ctx.pop();
    },
  });

  engine.registerTag('endform', {
    parse: function () {},
    render: function () {},
  });
}

// Paginate tags: {% paginate collection.products by 5 %} ... {% endpaginate %}
function registerPaginateTags(engine: Liquid): void {
  engine.registerTag('paginate', {
    parse: function (tagToken: { args: string; getText: () => string }, remainTokens: TopLevelToken[]) {
      this.args = tagToken.args;
      this.tpl = [];
      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endpaginate', () => stream.stop())
        .on('template', (tpl: Template) => {
          if (tpl) this.tpl.push(tpl);
        })
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });
      stream.start();
    },
    * render(ctx: Context, emitter: Emitter) {
      emitter.write('<!-- Paginated section (preview shows first page) -->\n');
      yield this.liquid.renderer.renderTemplates(this.tpl, ctx, emitter);
      emitter.write('\n<!-- End pagination -->');
    },
  });

  engine.registerTag('endpaginate', {
    parse: function () {},
    render: function () {},
  });
}

// Section and render tags
function registerSectionTags(engine: Liquid): void {
  engine.registerTag('section', {
    parse: function (tagToken: { args: string }) { this.args = tagToken.args; },
    * render(_ctx: Context, emitter: Emitter) {
      let sectionName = 'unknown';
      if (this.args) {
        const match = this.args.match(/['"]([^'"]+)['"]/);
        sectionName = match ? match[1] : 'unknown';
      }
      emitter.write(`<!-- Section: ${sectionName} (not rendered in preview) -->`);
    },
  });

  engine.registerTag('render', {
    parse: function (tagToken: { args: string }) { this.args = tagToken.args; },
    * render(_ctx: Context, emitter: Emitter) {
      let snippetName = 'unknown';
      if (this.args) {
        const match = this.args.match(/['"]([^'"]+)['"]/);
        snippetName = match ? match[1] : 'unknown';
      }
      emitter.write(`<!-- Render snippet: ${snippetName} (not loaded in preview) -->`);
    },
  });
}

// Comment tags: {% comment %} ... {% endcomment %}
function registerCommentTags(engine: Liquid): void {
  engine.registerTag('comment', {
    parse: function (tagToken: { getText: () => string }, remainTokens: TopLevelToken[]) {
      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endcomment', () => stream.stop())
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });
      stream.start();
    },
    render: function () {},
  });

  engine.registerTag('endcomment', {
    parse: function () {},
    render: function () {},
  });
}

// Style tags: {% style %} CSS {% endstyle %} and {% stylesheet %}
function registerStyleTags(engine: Liquid): void {
  // {% style %} - Shopify-specific scoped CSS tag
  engine.registerTag('style', {
    parse: function (tagToken: { getText: () => string }, remainTokens: TopLevelToken[]) {
      this.tpl = [];
      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endstyle', () => stream.stop())
        .on('template', (tpl: Template) => {
          if (tpl) this.tpl.push(tpl);
        })
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });
      stream.start();
    },
    * render(ctx: Context, emitter: Emitter) {
      emitter.write('<style data-shopify-style>');
      yield this.liquid.renderer.renderTemplates(this.tpl, ctx, emitter);
      emitter.write('</style>');
    },
  });

  engine.registerTag('endstyle', {
    parse: function () {},
    render: function () {},
  });

  // {% stylesheet %} - Legacy Shopify CSS tag
  engine.registerTag('stylesheet', {
    parse: function (tagToken: { getText: () => string }, remainTokens: TopLevelToken[]) {
      this.tpl = [];
      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endstylesheet', () => stream.stop())
        .on('template', (tpl: Template) => {
          if (tpl) this.tpl.push(tpl);
        })
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });
      stream.start();
    },
    * render(ctx: Context, emitter: Emitter) {
      emitter.write('<style>');
      yield this.liquid.renderer.renderTemplates(this.tpl, ctx, emitter);
      emitter.write('</style>');
    },
  });

  engine.registerTag('endstylesheet', {
    parse: function () {},
    render: function () {},
  });
}

// Javascript tags: {% javascript %} ... {% endjavascript %}
function registerJavascriptTags(engine: Liquid): void {
  engine.registerTag('javascript', {
    parse: function (tagToken: { getText: () => string }, remainTokens: TopLevelToken[]) {
      this.tpl = [];
      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endjavascript', () => stream.stop())
        .on('template', (tpl: Template) => {
          if (tpl) this.tpl.push(tpl);
        })
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });
      stream.start();
    },
    * render(ctx: Context, emitter: Emitter) {
      emitter.write('<script>');
      yield this.liquid.renderer.renderTemplates(this.tpl, ctx, emitter);
      emitter.write('</script>');
    },
  });

  engine.registerTag('endjavascript', {
    parse: function () {},
    render: function () {},
  });
}

// {% liquid %} - Multi-statement block tag
function registerLiquidTag(engine: Liquid): void {
  engine.registerTag('liquid', {
    parse: function (tagToken: { args: string }) {
      this.statements = tagToken.args;
    },
    * render(ctx: Context, emitter: Emitter) {
      if (!this.statements) return;

      const lines = this.statements.split('\n').map((l: string) => l.trim()).filter(Boolean);

      for (const line of lines) {
        // Handle echo statements: echo variable -> {{ variable }}
        // Handle other statements: statement -> {% statement %}
        const wrappedLine = line.startsWith('echo ')
          ? `{{ ${line.replace(/^echo\s+/, '')} }}`
          : `{% ${line} %}`;

        try {
          const templates = this.liquid.parse(wrappedLine);
          yield this.liquid.renderer.renderTemplates(templates, ctx, emitter);
        } catch (e) {
          console.warn(`Liquid tag parse error: ${line}`, e);
        }
      }
    },
  });
}

// {% include 'snippet', var: value %} - Shared scope include
function registerIncludeTag(engine: Liquid): void {
  engine.registerTag('include', {
    parse: function (tagToken: { args: string }) {
      this.args = tagToken.args;
    },
    * render(_ctx: Context, emitter: Emitter) {
      let snippetName = 'unknown';
      if (this.args) {
        const match = this.args.match(/['"]([^'"]+)['"]/);
        snippetName = match ? match[1] : 'unknown';
      }
      // In full implementation: load snippet, parse vars, render with SHARED scope
      emitter.write(`<!-- Include snippet: ${snippetName} (not loaded in preview, shared scope) -->`);
    },
  });
}

// {% tablerow item in array cols:3 %} ... {% endtablerow %}
function registerTablerowTags(engine: Liquid): void {
  engine.registerTag('tablerow', {
    parse: function (tagToken: { args: string; getText: () => string }, remainTokens: TopLevelToken[]) {
      this.args = tagToken.args;
      this.tpl = [];

      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endtablerow', () => stream.stop())
        .on('template', (tpl: Template) => {
          if (tpl) this.tpl.push(tpl);
        })
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });
      stream.start();
    },
    * render(ctx: Context, emitter: Emitter) {
      // Parse: tablerow item in array cols:3 limit:6 offset:0
      const argsMatch = this.args.match(/(\w+)\s+in\s+(\S+)(?:\s+(.*))?/);
      if (!argsMatch) return;

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
      const collection = (yield this.liquid.evalValue(collectionExpr, ctx)) as unknown[];
      if (!Array.isArray(collection)) return;

      // Apply offset and limit
      let items = collection;
      if (options.offset) items = items.slice(options.offset);
      if (options.limit) items = items.slice(0, options.limit);

      const cols = options.cols || items.length;
      let row = 0;
      let col = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Start new row
        if (col === 0) {
          row++;
          emitter.write(`<tr class="row${row}">`);
        }

        col++;

        // Create tablerowloop object (Shopify-specific)
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

        // Push context with item, tablerowloop, and forloop
        ctx.push({
          [varName]: item,
          tablerowloop,
          forloop: new ForloopDrop(i, items.length, varName)
        });

        // Render cell content
        emitter.write(`<td class="col${col}">`);
        yield this.liquid.renderer.renderTemplates(this.tpl, ctx, emitter);
        emitter.write('</td>');

        ctx.pop();

        // End row if needed
        if (col >= cols) {
          emitter.write('</tr>');
          col = 0;
        }
      }

      // Close last row if incomplete
      if (col > 0) {
        emitter.write('</tr>');
      }
    },
  });

  engine.registerTag('endtablerow', {
    parse: function () {},
    render: function () {},
  });
}

// Layout stubs: {% layout %}, {% content_for %}, {% sections %}
function registerLayoutStubs(engine: Liquid): void {
  // {% layout 'name' %} or {% layout none %}
  engine.registerTag('layout', {
    parse: function (tagToken: { args: string }) { this.args = tagToken.args; },
    * render(_ctx: Context, emitter: Emitter) {
      let layoutName = 'theme';
      if (this.args) {
        const match = this.args.match(/['"]([^'"]+)['"]/);
        if (match) layoutName = match[1];
        if (this.args.includes('none')) layoutName = 'none';
      }
      emitter.write(`<!-- Layout: ${layoutName} (not applied in section preview) -->`);
    },
  });

  // {% content_for 'header' %} ... {% endcontent_for %}
  engine.registerTag('content_for', {
    parse: function (tagToken: { args: string; getText: () => string }, remainTokens: TopLevelToken[]) {
      this.args = tagToken.args;
      this.tpl = [];

      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endcontent_for', () => stream.stop())
        .on('template', (tpl: Template) => {
          if (tpl) this.tpl.push(tpl);
        })
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });
      stream.start();
    },
    * render(ctx: Context, emitter: Emitter) {
      emitter.write('<!-- content_for block -->');
      yield this.liquid.renderer.renderTemplates(this.tpl, ctx, emitter);
      emitter.write('<!-- end content_for -->');
    },
  });

  engine.registerTag('endcontent_for', {
    parse: function () {},
    render: function () {},
  });

  // {% sections 'group' %}
  engine.registerTag('sections', {
    parse: function (tagToken: { args: string }) { this.args = tagToken.args; },
    * render(_ctx: Context, emitter: Emitter) {
      let groupName = 'main';
      if (this.args) {
        const match = this.args.match(/['"]([^'"]+)['"]/);
        groupName = match ? match[1] : 'main';
      }
      emitter.write(`<!-- Sections group: ${groupName} (not rendered in single section preview) -->`);
    },
  });
}
