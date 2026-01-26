import { validateLiquidCompleteness } from '../code-extractor';

// Mock process.env for feature flag testing
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, FLAG_VALIDATE_LIQUID: 'true' };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('validateLiquidCompleteness', () => {
  describe('feature flag', () => {
    it('should skip validation when FLAG_VALIDATE_LIQUID is not true', () => {
      process.env.FLAG_VALIDATE_LIQUID = 'false';
      const code = '{% if %}'; // Invalid code
      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate when FLAG_VALIDATE_LIQUID is true', () => {
      process.env.FLAG_VALIDATE_LIQUID = 'true';
      const code = '{% if %}'; // Missing endif
      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
    });
  });

  describe('complete valid sections', () => {
    it('should return isComplete=true for valid Liquid section', () => {
      const code = `
<div class="section">
  {% if section.settings.show_title %}
    <h2>{{ section.settings.title }}</h2>
  {% endif %}
</div>

{% schema %}
{
  "name": "Test Section",
  "settings": []
}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle nested Liquid tags', () => {
      const code = `
{% if section.settings.enabled %}
  {% for item in section.blocks %}
    {% if item.type == 'text' %}
      <p>{{ item.settings.text }}</p>
    {% endif %}
  {% endfor %}
{% endif %}

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle all block tag types', () => {
      const code = `
{% unless condition %}content{% endunless %}
{% for item in items %}{{ item }}{% endfor %}
{% case value %}{% when 1 %}one{% endcase %}
{% capture var %}content{% endcapture %}
{% comment %}hidden{% endcomment %}

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('schema validation', () => {
    it('should detect missing schema block', () => {
      const code = '<div>No schema here</div>';
      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'missing_schema',
          message: expect.stringContaining('No {% schema %}')
        })
      );
    });

    it('should detect unclosed schema tag', () => {
      const code = `
<div>Content</div>
{% schema %}
{
  "name": "Test"
}
      `.trim(); // Missing {% endschema %}

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'unclosed_liquid_tag',
          tag: 'schema',
          message: expect.stringContaining('{% endschema %} missing')
        })
      );
    });

    it('should detect invalid JSON in schema', () => {
      const code = `
{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "text", "id": "title"
}
{% endschema %}
      `.trim(); // Invalid JSON

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'invalid_schema_json'
        })
      );
    });

    it('should detect empty schema block', () => {
      const code = `
{% schema %}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'invalid_schema_json',
          message: 'Schema block is empty'
        })
      );
    });
  });

  describe('Liquid tag validation', () => {
    it('should detect unclosed if tag', () => {
      const code = `
{% if section.settings.show %}
  <div>Content</div>

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim(); // Missing {% endif %}

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'unclosed_liquid_tag',
          tag: 'if',
          message: expect.stringContaining('{% endif %}')
        })
      );
    });

    it('should detect unclosed for tag', () => {
      const code = `
{% for item in items %}
  <div>{{ item.title }}</div>

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'unclosed_liquid_tag',
          tag: 'for',
          message: expect.stringContaining('{% endfor %}')
        })
      );
    });

    it('should detect mismatched tags', () => {
      const code = `
{% if condition %}
  content
{% endfor %}

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'unclosed_liquid_tag',
          message: expect.stringContaining('Mismatched')
        })
      );
    });

    it('should detect multiple unclosed tags', () => {
      const code = `
{% if condition %}
  {% for item in items %}
    {% unless disabled %}

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      // Should have 3 unclosed tags
      const unclosedErrors = result.errors.filter(e => e.type === 'unclosed_liquid_tag');
      expect(unclosedErrors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('HTML tag validation', () => {
    it('should not error on properly closed HTML', () => {
      const code = `
<div class="wrapper">
  <section>
    <h1>Title</h1>
    <p>Paragraph</p>
  </section>
</div>

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(true);
    });

    it('should handle self-closing tags', () => {
      const code = `
<div>
  <img src="test.jpg" alt="test">
  <input type="text">
  <br>
  <hr>
</div>

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(true);
    });

    it('should detect multiple unclosed HTML tags (truncation indicator)', () => {
      const code = `
<div class="outer">
  <section class="inner">
    <article>
      <div>
        <p>Content without closing tags...

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      // Should detect multiple unclosed tags
      const htmlErrors = result.errors.filter(e => e.type === 'unclosed_html_tag');
      expect(htmlErrors.length).toBeGreaterThan(0);
      expect(htmlErrors[0].message).toContain('Multiple unclosed HTML tags');
    });
  });

  describe('heuristic warnings', () => {
    it('should warn about very short code without schema closure', () => {
      const code = '<div>Short</div>';
      const result = validateLiquidCompleteness(code);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('short')
      );
    });

    it('should warn about incomplete JSON syntax at end', () => {
      // Code that ends with incomplete JSON (likely truncated mid-generation)
      const code = `
<div>Content</div>
{% schema %}
{
  "name": "Test",
  "settings": [`.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('incomplete JSON/array syntax')
      );
    });

    it('should warn about truncated Liquid tag', () => {
      // Code that ends with incomplete Liquid tag (truncated mid-generation)
      const code = `
<div>Content</div>
{% if section.settings.`.trim();

      const result = validateLiquidCompleteness(code);

      // Should warn about incomplete tag
      expect(result.warnings).toContainEqual(
        expect.stringContaining('incomplete Liquid tag')
      );
    });
  });

  describe('edge cases', () => {
    it('should handle Liquid whitespace control syntax', () => {
      const code = `
{%- if condition -%}
  Content
{%- endif -%}

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(true);
    });

    it('should handle else/elsif without matching them as blocks', () => {
      const code = `
{% if condition %}
  one
{% elsif other %}
  two
{% else %}
  three
{% endif %}

{% schema %}
{"name": "Test"}
{% endschema %}
      `.trim();

      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(true);
    });

    it('should handle empty code', () => {
      const code = '';
      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ type: 'missing_schema' })
      );
    });

    it('should handle code with only whitespace', () => {
      const code = '   \n\n   ';
      const result = validateLiquidCompleteness(code);

      expect(result.isComplete).toBe(false);
    });
  });
});
