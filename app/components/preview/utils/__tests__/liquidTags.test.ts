import { Liquid } from 'liquidjs';
import { registerShopifyTags } from '../liquidTags';

// Helper to create a configured engine
function createEngine(): Liquid {
  const engine = new Liquid({ strictFilters: false, strictVariables: false });
  registerShopifyTags(engine);
  return engine;
}

describe('Shopify Liquid Tags', () => {
  let engine: Liquid;

  beforeEach(() => {
    engine = createEngine();
  });

  // =========================================================================
  // Style Tag Tests
  // =========================================================================
  describe('{% style %} tag', () => {
    it('outputs CSS wrapped in style tag with data attribute', async () => {
      const template = '{% style %}.test { color: red; }{% endstyle %}';
      const result = await engine.parseAndRender(template);
      expect(result).toBe('<style data-shopify-style>.test { color: red; }</style>');
    });

    it('processes Liquid variables in CSS', async () => {
      const template = '{% style %}.test { color: {{ color }}; }{% endstyle %}';
      const result = await engine.parseAndRender(template, { color: 'blue' });
      expect(result).toBe('<style data-shopify-style>.test { color: blue; }</style>');
    });

    it('handles empty style block', async () => {
      const template = '{% style %}{% endstyle %}';
      const result = await engine.parseAndRender(template);
      expect(result).toBe('<style data-shopify-style></style>');
    });
  });

  // =========================================================================
  // Liquid Tag Tests
  // =========================================================================
  describe('{% liquid %} tag', () => {
    it('processes multiple statements', async () => {
      const template = `{% liquid
assign x = "hello"
echo x
%}`;
      const result = await engine.parseAndRender(template);
      expect(result.trim()).toBe('hello');
    });

    it('handles assign and conditionals', async () => {
      const template = `{% liquid
assign show = true
if show
  echo "visible"
endif
%}`;
      const result = await engine.parseAndRender(template);
      expect(result).toContain('visible');
    });

    it('handles empty liquid block', async () => {
      const template = '{% liquid %}';
      const result = await engine.parseAndRender(template);
      expect(result).toBe('');
    });
  });

  // =========================================================================
  // Include Tag Tests
  // =========================================================================
  describe('{% include %} tag', () => {
    it('outputs placeholder comment with snippet name', async () => {
      const template = "{% include 'product-card' %}";
      const result = await engine.parseAndRender(template);
      expect(result).toBe('<!-- Include snippet: product-card (not loaded in preview, shared scope) -->');
    });

    it('handles variables in args', async () => {
      const template = "{% include 'icon', icon: 'star' %}";
      const result = await engine.parseAndRender(template);
      expect(result).toContain('icon');
    });
  });

  // =========================================================================
  // Tablerow Tag Tests
  // =========================================================================
  describe('{% tablerow %} tag', () => {
    it('generates table rows and cells', async () => {
      const template = '{% tablerow item in items %}{{ item }}{% endtablerow %}';
      const result = await engine.parseAndRender(template, { items: ['a', 'b', 'c'] });
      expect(result).toContain('<tr class="row1">');
      expect(result).toContain('<td class="col1">a</td>');
      expect(result).toContain('<td class="col2">b</td>');
      expect(result).toContain('<td class="col3">c</td>');
      expect(result).toContain('</tr>');
    });

    it('respects cols option', async () => {
      const template = '{% tablerow item in items cols:2 %}{{ item }}{% endtablerow %}';
      const result = await engine.parseAndRender(template, { items: ['a', 'b', 'c', 'd'] });
      // Should have 2 rows with 2 cols each
      expect(result).toContain('<tr class="row1">');
      expect(result).toContain('<tr class="row2">');
    });

    it('provides tablerowloop variables', async () => {
      const template = '{% tablerow item in items %}{{ tablerowloop.index }}{% endtablerow %}';
      const result = await engine.parseAndRender(template, { items: ['a', 'b'] });
      expect(result).toContain('>1<');
      expect(result).toContain('>2<');
    });

    it('provides forloop inside tablerow', async () => {
      const template = '{% tablerow item in items %}{{ forloop.index }}{% endtablerow %}';
      const result = await engine.parseAndRender(template, { items: ['a', 'b'] });
      expect(result).toContain('>1<');
      expect(result).toContain('>2<');
    });

    it('handles limit option', async () => {
      const template = '{% tablerow item in items limit:2 %}{{ item }}{% endtablerow %}';
      const result = await engine.parseAndRender(template, { items: ['a', 'b', 'c', 'd'] });
      expect(result).toContain('a');
      expect(result).toContain('b');
      expect(result).not.toContain('>c<');
      expect(result).not.toContain('>d<');
    });

    it('handles offset option', async () => {
      const template = '{% tablerow item in items offset:2 %}{{ item }}{% endtablerow %}';
      const result = await engine.parseAndRender(template, { items: ['a', 'b', 'c', 'd'] });
      expect(result).not.toContain('>a<');
      expect(result).not.toContain('>b<');
      expect(result).toContain('c');
      expect(result).toContain('d');
    });

    it('handles empty collection', async () => {
      const template = '{% tablerow item in items %}{{ item }}{% endtablerow %}';
      const result = await engine.parseAndRender(template, { items: [] });
      expect(result).toBe('');
    });
  });

  // =========================================================================
  // Layout Stub Tests
  // =========================================================================
  describe('{% layout %} stub', () => {
    it('outputs comment with layout name', async () => {
      const template = "{% layout 'alternate' %}";
      const result = await engine.parseAndRender(template);
      expect(result).toBe('<!-- Layout: alternate (not applied in section preview) -->');
    });

    it('handles layout none', async () => {
      const template = '{% layout none %}';
      const result = await engine.parseAndRender(template);
      expect(result).toBe('<!-- Layout: none (not applied in section preview) -->');
    });
  });

  // =========================================================================
  // Content_for Stub Tests
  // =========================================================================
  describe('{% content_for %} stub', () => {
    it('wraps content in comments', async () => {
      const template = "{% content_for 'header' %}<h1>Title</h1>{% endcontent_for %}";
      const result = await engine.parseAndRender(template);
      expect(result).toContain('<!-- content_for block -->');
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<!-- end content_for -->');
    });

    it('renders Liquid inside content_for', async () => {
      const template = "{% content_for 'header' %}{{ title }}{% endcontent_for %}";
      const result = await engine.parseAndRender(template, { title: 'Hello' });
      expect(result).toContain('Hello');
    });
  });

  // =========================================================================
  // Sections Stub Tests
  // =========================================================================
  describe('{% sections %} stub', () => {
    it('outputs comment with group name', async () => {
      const template = "{% sections 'footer' %}";
      const result = await engine.parseAndRender(template);
      expect(result).toBe('<!-- Sections group: footer (not rendered in single section preview) -->');
    });
  });

  // =========================================================================
  // Form Tag Tests (existing)
  // =========================================================================
  describe('{% form %} tag', () => {
    it('wraps content in form element', async () => {
      const template = "{% form 'contact' %}<input type='text'>{% endform %}";
      const result = await engine.parseAndRender(template);
      expect(result).toContain('<form method="post"');
      expect(result).toContain('class="shopify-form shopify-form-contact"');
      expect(result).toContain("<input type='text'>");
      expect(result).toContain('</form>');
    });

    it('provides form context variable', async () => {
      const template = "{% form 'contact' %}{{ form.id }}{% endform %}";
      const result = await engine.parseAndRender(template);
      expect(result).toContain('form-contact-preview');
    });
  });

  // =========================================================================
  // Section and Render Tags (existing)
  // =========================================================================
  describe('{% section %} tag', () => {
    it('outputs comment placeholder', async () => {
      const template = "{% section 'header' %}";
      const result = await engine.parseAndRender(template);
      expect(result).toBe('<!-- Section: header (not rendered in preview) -->');
    });
  });

  describe('{% render %} tag', () => {
    it('outputs comment placeholder', async () => {
      const template = "{% render 'icon-star' %}";
      const result = await engine.parseAndRender(template);
      expect(result).toBe('<!-- Render snippet: icon-star (not loaded in preview) -->');
    });
  });
});
