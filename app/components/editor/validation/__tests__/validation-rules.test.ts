/**
 * Tests for Liquid section schema validation rules
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { VALIDATION_RULES, type ParsedSchema } from '../validation-rules';

describe('validation-rules', () => {
  describe('schema-exists rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'schema-exists')!;

    it('should pass when schema block exists', () => {
      const code = '{% schema %} { "name": "Test" } {% endschema %}';
      const result = rule.check(code, null);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Schema block found');
    });

    it('should fail when schema block is missing', () => {
      const code = '<div>No schema here</div>';
      const result = rule.check(code, null);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Missing {% schema %} block');
      expect(result.suggestion).toBeDefined();
    });

    it('should handle whitespace variations', () => {
      const code = '{%  schema  %} {} {%  endschema  %}';
      const result = rule.check(code, null);

      expect(result.valid).toBe(true);
    });
  });

  describe('schema-valid-json rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'schema-valid-json')!;

    it('should pass with valid JSON', () => {
      const code = '{% schema %} { "name": "Test", "settings": [] } {% endschema %}';
      const result = rule.check(code, null);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Valid JSON');
    });

    it('should fail with invalid JSON', () => {
      const code = '{% schema %} { "name": "Test", invalid } {% endschema %}';
      const result = rule.check(code, null);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid JSON');
      expect(result.suggestion).toBeDefined();
    });

    it('should fail with trailing comma', () => {
      const code = '{% schema %} { "name": "Test", } {% endschema %}';
      const result = rule.check(code, null);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid JSON');
    });

    it('should fail when no schema block exists', () => {
      const code = '<div>No schema</div>';
      const result = rule.check(code, null);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('No schema block to validate');
    });
  });

  describe('schema-has-name rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'schema-has-name')!;

    it('should pass when schema has name', () => {
      const schema: ParsedSchema = { name: 'Hero Section' };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('Hero Section');
    });

    it('should fail when name is missing', () => {
      const schema: ParsedSchema = {};
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Missing "name" property');
      expect(result.suggestion).toBeDefined();
    });

    it('should fail when name is not a string', () => {
      const schema: ParsedSchema = { name: 123 as any };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
    });

    it('should fail when schema is null', () => {
      const result = rule.check('', null);

      expect(result.valid).toBe(false);
    });
  });

  describe('schema-has-presets rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'schema-has-presets')!;

    it('should pass when presets exist', () => {
      const schema: ParsedSchema = {
        presets: [{ name: 'Default' }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Presets defined');
    });

    it('should fail when presets are missing', () => {
      const schema: ParsedSchema = {};
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('No presets found');
      expect(result.suggestion).toBeDefined();
    });

    it('should fail when presets array is empty', () => {
      const schema: ParsedSchema = { presets: [] };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
    });

    it('should fail when presets is not an array', () => {
      const schema: ParsedSchema = { presets: 'not an array' as any };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
    });
  });

  describe('preset-matches-name rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'preset-matches-name')!;

    it('should pass when preset name matches schema name', () => {
      const schema: ParsedSchema = {
        name: 'Hero Section',
        presets: [{ name: 'Hero Section' }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Preset name matches');
    });

    it('should fail when preset name does not match', () => {
      const schema: ParsedSchema = {
        name: 'Hero Section',
        presets: [{ name: 'Different Name' }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("doesn't match");
      expect(result.suggestion).toBeDefined();
    });

    it('should skip when no name or preset exists', () => {
      const schema: ParsedSchema = {};
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Skipped (no name or preset)');
    });
  });

  describe('number-defaults-are-numbers rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'number-defaults-are-numbers')!;

    it('should pass when number defaults are numbers', () => {
      const schema: ParsedSchema = {
        settings: [
          { type: 'number', id: 'size', default: 16 },
          { type: 'range', id: 'padding', default: 8 },
        ],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('All number defaults are numbers');
    });

    it('should fail when number default is a string', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'number', id: 'size', default: '16' as any }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('string defaults');
      expect(result.suggestion).toBeDefined();
    });

    it('should pass when no default is set', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'number', id: 'size' }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
    });

    it('should pass with no settings', () => {
      const schema: ParsedSchema = {};
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('No settings to check');
    });
  });

  describe('range-has-required-props rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'range-has-required-props')!;

    it('should pass when range has min/max/step', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'range', id: 'width', min: 10, max: 100, step: 5 }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('All range settings have required props');
    });

    it('should fail when range missing min', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'range', id: 'width', max: 100, step: 5 }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
      expect(result.suggestion).toBeDefined();
    });

    it('should fail when range missing max', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'range', id: 'width', min: 10, step: 5 }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
    });

    it('should fail when range missing step', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'range', id: 'width', min: 10, max: 100 }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
    });

    it('should pass with non-range settings', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'text', id: 'title' }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
    });
  });

  describe('select-has-options rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'select-has-options')!;

    it('should pass when select has options', () => {
      const schema: ParsedSchema = {
        settings: [
          {
            type: 'select',
            id: 'align',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ],
          },
        ],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('All select settings have options');
    });

    it('should fail when select missing options', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'select', id: 'align' }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
      expect(result.suggestion).toBeDefined();
    });

    it('should fail when select options empty', () => {
      const schema: ParsedSchema = {
        settings: [{ type: 'select', id: 'align', options: [] }],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(false);
    });

    it('should work with radio settings too', () => {
      const schema: ParsedSchema = {
        settings: [
          {
            type: 'radio',
            id: 'style',
            options: [{ value: 'light', label: 'Light' }],
          },
        ],
      };
      const result = rule.check('', schema);

      expect(result.valid).toBe(true);
    });
  });

  describe('css-uses-section-id rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'css-uses-section-id')!;

    it('should pass when CSS uses section ID', () => {
      const code = `
        {% style %}
          #shopify-section-{{ section.id }} {
            color: red;
          }
        {% endstyle %}
      `;
      const result = rule.check(code, null);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('CSS properly scoped');
    });

    it('should fail when CSS does not use section ID', () => {
      const code = `
        {% style %}
          .my-section { color: red; }
        {% endstyle %}
      `;
      const result = rule.check(code, null);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('not scoped');
      expect(result.suggestion).toBeDefined();
    });

    it('should pass when no style block exists', () => {
      const code = '<div>No styles</div>';
      const result = rule.check(code, null);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('No style block');
    });
  });

  describe('liquid-tags-balanced rule', () => {
    const rule = VALIDATION_RULES.find((r) => r.id === 'liquid-tags-balanced')!;

    it('should pass when tags are balanced', () => {
      const code = `
        {% if condition %}
          <div>{% for item in items %}{{ item }}{% endfor %}</div>
        {% endif %}
      `;
      const result = rule.check(code, null);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('All tags balanced');
    });

    it('should fail when if tags unbalanced', () => {
      const code = '{% if true %} <div>content</div>';
      const result = rule.check(code, null);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Unbalanced tags');
      expect(result.message).toContain('if:');
    });

    it('should fail when for tags unbalanced', () => {
      const code = '{% for item in items %} <div>{{ item }}</div>';
      const result = rule.check(code, null);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('for:');
    });

    it('should detect multiple unbalanced tags', () => {
      const code = '{% if true %} {% for item in items %} content';
      const result = rule.check(code, null);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Unbalanced tags');
    });

    it('should validate case/endcase tags', () => {
      const code = `
        {% case value %}
          {% when "a" %} A
          {% when "b" %} B
        {% endcase %}
      `;
      const result = rule.check(code, null);

      expect(result.valid).toBe(true);
    });

    it('should validate capture/endcapture tags', () => {
      const code = '{% capture var %} content {% endcapture %}';
      const result = rule.check(code, null);

      expect(result.valid).toBe(true);
    });
  });

  describe('rule metadata', () => {
    it('should have unique rule IDs', () => {
      const ids = VALIDATION_RULES.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid severity values', () => {
      VALIDATION_RULES.forEach((rule) => {
        expect(['error', 'warning']).toContain(rule.severity);
      });
    });

    it('should have descriptive names and descriptions', () => {
      VALIDATION_RULES.forEach((rule) => {
        expect(rule.name.length).toBeGreaterThan(0);
        expect(rule.description.length).toBeGreaterThan(0);
      });
    });
  });
});
