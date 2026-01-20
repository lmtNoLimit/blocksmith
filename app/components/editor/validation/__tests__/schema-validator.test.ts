/**
 * Tests for schema validator
 */

import { validateSchema } from '../schema-validator';

describe('schema-validator', () => {
  describe('validateSchema', () => {
    it('should pass valid section with all requirements', () => {
      const code = `
        <div>Section content</div>
        {% schema %}
        {
          "name": "Hero Section",
          "settings": [
            {
              "type": "text",
              "id": "title",
              "label": "Title"
            }
          ],
          "presets": [
            {
              "name": "Hero Section"
            }
          ]
        }
        {% endschema %}
        {% style %}
          #shopify-section-{{ section.id }} {
            color: blue;
          }
        {% endstyle %}
      `;

      const result = validateSchema(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.schema).not.toBeNull();
      expect(result.schema?.name).toBe('Hero Section');
    });

    it('should collect all errors', () => {
      const code = `<div>No schema</div>`;

      const result = validateSchema(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.ruleId === 'schema-exists')).toBe(true);
    });

    it('should separate errors and warnings', () => {
      const code = `
        {% schema %}
        {
          "name": "Section",
          "settings": []
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.errors.some((e) => e.ruleId === 'schema-has-name')).toBe(false);
      expect(result.warnings.some((w) => w.ruleId === 'schema-has-presets')).toBe(true);
    });

    it('should extract and parse schema', () => {
      const code = `
        {% schema %}
        {
          "name": "Banner",
          "settings": [
            {
              "type": "number",
              "id": "width",
              "default": 100
            }
          ]
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.schema).not.toBeNull();
      expect(result.schema?.name).toBe('Banner');
      expect(result.schema?.settings).toHaveLength(1);
      expect(result.schema?.settings?.[0].id).toBe('width');
    });

    it('should handle malformed JSON in schema', () => {
      const code = `
        {% schema %}
        {
          "name": "Test",
          invalid json
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.valid).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.errors.some((e) => e.ruleId === 'schema-valid-json')).toBe(true);
    });

    it('should validate number settings', () => {
      const code = `
        {% schema %}
        {
          "name": "Section",
          "settings": [
            {
              "type": "number",
              "id": "count",
              "default": "5"
            }
          ],
          "presets": [{"name": "Section"}]
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.errors.some((e) => e.ruleId === 'number-defaults-are-numbers')).toBe(true);
    });

    it('should validate range settings', () => {
      const code = `
        {% schema %}
        {
          "name": "Section",
          "settings": [
            {
              "type": "range",
              "id": "columns",
              "min": 1,
              "max": 4
            }
          ],
          "presets": [{"name": "Section"}]
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.errors.some((e) => e.ruleId === 'range-has-required-props')).toBe(true);
    });

    it('should validate select settings', () => {
      const code = `
        {% schema %}
        {
          "name": "Section",
          "settings": [
            {
              "type": "select",
              "id": "align"
            }
          ],
          "presets": [{"name": "Section"}]
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.errors.some((e) => e.ruleId === 'select-has-options')).toBe(true);
    });

    it('should validate CSS scoping', () => {
      const code = `
        {% schema %}
        {
          "name": "Section",
          "presets": [{"name": "Section"}]
        }
        {% endschema %}
        {% style %}
          .my-class { color: red; }
        {% endstyle %}
      `;

      const result = validateSchema(code);

      expect(result.warnings.some((w) => w.ruleId === 'css-uses-section-id')).toBe(true);
    });

    it('should validate Liquid tag balance', () => {
      const code = `
        {% schema %}
        {
          "name": "Section",
          "presets": [{"name": "Section"}]
        }
        {% endschema %}
        {% if condition %} content
      `;

      const result = validateSchema(code);

      expect(result.errors.some((e) => e.ruleId === 'liquid-tags-balanced')).toBe(true);
    });

    it('should include rule names in results', () => {
      const code = `<div>No schema</div>`;

      const result = validateSchema(code);

      result.errors.forEach((error) => {
        expect(error.ruleId).toBeDefined();
        expect(error.ruleName).toBeDefined();
        expect(typeof error.ruleName).toBe('string');
      });
    });

    it('should handle empty code', () => {
      const code = '';

      const result = validateSchema(code);

      expect(result.valid).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle complex schema with blocks', () => {
      const code = `
        {% schema %}
        {
          "name": "Product Section",
          "settings": [
            {
              "type": "text",
              "id": "title",
              "label": "Title"
            }
          ],
          "blocks": [
            {
              "type": "variant",
              "name": "Variant",
              "settings": [
                {
                  "type": "number",
                  "id": "price",
                  "default": 10
                }
              ]
            }
          ],
          "presets": [
            {
              "name": "Product Section",
              "blocks": [
                {
                  "type": "variant"
                }
              ]
            }
          ]
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.valid).toBe(true);
      expect(result.schema?.blocks).toBeDefined();
      expect(result.schema?.blocks?.length).toBeGreaterThan(0);
    });

    it('should validate multiple settings errors', () => {
      const code = `
        {% schema %}
        {
          "name": "Section",
          "settings": [
            {
              "type": "number",
              "id": "size",
              "default": "not-a-number"
            },
            {
              "type": "range",
              "id": "width"
            },
            {
              "type": "select",
              "id": "color"
            }
          ],
          "presets": [{"name": "Section"}]
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.errors.filter((e) => e.ruleId === 'number-defaults-are-numbers')).toHaveLength(
        1
      );
      expect(result.errors.filter((e) => e.ruleId === 'range-has-required-props')).toHaveLength(1);
      expect(result.errors.filter((e) => e.ruleId === 'select-has-options')).toHaveLength(1);
    });

    it('should provide suggestions in error messages', () => {
      const code = `<div>No schema</div>`;

      const result = validateSchema(code);

      const schemaError = result.errors.find((e) => e.ruleId === 'schema-exists');
      expect(schemaError?.suggestion).toBeDefined();
      expect(schemaError?.suggestion?.length).toBeGreaterThan(0);
    });

    it('should work with whitespace variations', () => {
      const code = `
        {%  schema  %}
        {
          "name":    "Section"   ,
          "presets": [{"name": "Section"}]
        }
        {%  endschema  %}
      `;

      const result = validateSchema(code);

      expect(result.schema?.name).toBe('Section');
    });

    it('should handle schema without presets gracefully', () => {
      const code = `
        {% schema %}
        {
          "name": "Minimal Section",
          "settings": []
        }
        {% endschema %}
      `;

      const result = validateSchema(code);

      expect(result.errors.some((e) => e.ruleId === 'schema-has-name')).toBe(false);
      expect(result.warnings.some((w) => w.ruleId === 'schema-has-presets')).toBe(true);
    });
  });

  describe('result structure', () => {
    it('should always return SchemaValidationResult structure', () => {
      const code = '{% schema %} {} {% endschema %}';
      const result = validateSchema(code);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('schema');

      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should have consistent error/warning structure', () => {
      const code = `<div>No schema</div>`;
      const result = validateSchema(code);

      result.errors.forEach((error) => {
        expect(error).toHaveProperty('valid');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('ruleId');
        expect(error).toHaveProperty('ruleName');
      });
    });
  });
});
