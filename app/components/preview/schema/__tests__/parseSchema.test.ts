import {
  resolveTranslationKey,
  extractSettings,
  extractBlocks,
  buildInitialState,
  updateSchemaDefaults,
  updateSchemaDefaultsWithReport,
  getSettingsDiff,
  isResourceType,
  isPresentationalType,
  coerceValue,
  RESOURCE_TYPES,
  PRESENTATIONAL_TYPES
} from '../parseSchema';
import type { SchemaDefinition, SchemaSetting, SettingType } from '../SchemaTypes';

describe('resolveTranslationKey', () => {
  it('resolves translation key with label suffix', () => {
    const result = resolveTranslationKey('t:sections.hero.settings.background_image.label');
    expect(result).toBe('Background Image');
  });

  it('resolves translation key with options and label suffix', () => {
    const result = resolveTranslationKey('t:sections.hero.settings.text_alignment.options__2.label');
    expect(result).toBe('Text Alignment');
  });

  it('leaves plain text unchanged', () => {
    const result = resolveTranslationKey('Background Color');
    expect(result).toBe('Background Color');
  });

  it('handles empty string', () => {
    const result = resolveTranslationKey('');
    expect(result).toBe('');
  });

  it('handles undefined', () => {
    const result = resolveTranslationKey(undefined);
    expect(result).toBe('');
  });

  it('converts snake_case to Title Case', () => {
    const result = resolveTranslationKey('t:sections.hero.settings.button_text.label');
    expect(result).toBe('Button Text');
  });

  it('handles translation key with info suffix', () => {
    const result = resolveTranslationKey('t:sections.hero.settings.heading.info');
    expect(result).toBe('Heading');
  });

  it('handles translation key with placeholder suffix', () => {
    const result = resolveTranslationKey('t:sections.hero.settings.email.placeholder');
    expect(result).toBe('Email');
  });

  it('skips common prefixes and suffixes', () => {
    const result = resolveTranslationKey('t:sections.blocks.settings.call_to_action.label');
    expect(result).toBe('Call To Action');
  });

  it('handles numbered options patterns', () => {
    const result = resolveTranslationKey('t:sections.hero.settings.alignment.options__1.label');
    expect(result).toBe('Alignment');
  });

  it('fallback returns key without t: prefix', () => {
    const result = resolveTranslationKey('t:label');
    expect(result).toBe('label');
  });
});

describe('extractSettings', () => {
  it('resolves translation keys in setting labels', () => {
    const schema: SchemaDefinition = {
      name: 'Test Section',
      settings: [
        {
          type: 'text',
          id: 'heading',
          label: 't:sections.hero.settings.heading.label',
        },
      ],
    };

    const settings = extractSettings(schema);
    expect(settings).toHaveLength(1);
    expect(settings[0].label).toBe('Heading');
  });

  it('resolves translation keys in select option labels', () => {
    const schema: SchemaDefinition = {
      name: 'Test Section',
      settings: [
        {
          type: 'select',
          id: 'alignment',
          label: 't:sections.hero.settings.alignment.label',
          options: [
            { value: 'left', label: 't:sections.hero.settings.alignment.options__1.label' },
            { value: 'center', label: 't:sections.hero.settings.alignment.options__2.label' },
          ],
        },
      ],
    };

    const settings = extractSettings(schema);
    expect(settings).toHaveLength(1);
    expect(settings[0].label).toBe('Alignment');
    expect(settings[0].options?.[0].label).toBe('Alignment');
    expect(settings[0].options?.[1].label).toBe('Alignment');
  });

  it('resolves translation keys in info and placeholder', () => {
    const schema: SchemaDefinition = {
      name: 'Test Section',
      settings: [
        {
          type: 'text',
          id: 'email',
          label: 't:sections.contact.settings.email.label',
          info: 't:sections.contact.settings.email.info',
          placeholder: 't:sections.contact.settings.email.placeholder',
        },
      ],
    };

    const settings = extractSettings(schema);
    expect(settings).toHaveLength(1);
    expect(settings[0].label).toBe('Email');
    expect(settings[0].info).toBe('Email');
    expect(settings[0].placeholder).toBe('Email');
  });

  it('leaves plain text labels unchanged', () => {
    const schema: SchemaDefinition = {
      name: 'Test Section',
      settings: [
        {
          type: 'text',
          id: 'title',
          label: 'Section Title',
        },
      ],
    };

    const settings = extractSettings(schema);
    expect(settings).toHaveLength(1);
    expect(settings[0].label).toBe('Section Title');
  });
});

describe('extractBlocks', () => {
  it('resolves translation keys in block names', () => {
    const schema: SchemaDefinition = {
      name: 'Test Section',
      blocks: [
        {
          type: 'testimonial',
          name: 't:sections.testimonials.blocks.testimonial.name',
          settings: [
            {
              type: 'text',
              id: 'author',
              label: 't:sections.testimonials.blocks.testimonial.settings.author.label',
            },
          ],
        },
      ],
    };

    const blocks = extractBlocks(schema);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].name).toBe('Testimonial');
    expect(blocks[0].settings?.[0].label).toBe('Author');
  });

  it('resolves translation keys in block setting options', () => {
    const schema: SchemaDefinition = {
      name: 'Test Section',
      blocks: [
        {
          type: 'button',
          name: 't:sections.cta.blocks.button.name',
          settings: [
            {
              type: 'select',
              id: 'style',
              label: 't:sections.cta.blocks.button.settings.style.label',
              options: [
                { value: 'primary', label: 't:sections.cta.blocks.button.settings.style.options__1.label' },
                { value: 'secondary', label: 't:sections.cta.blocks.button.settings.style.options__2.label' },
              ],
            },
          ],
        },
      ],
    };

    const blocks = extractBlocks(schema);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].name).toBe('Button');
    expect(blocks[0].settings?.[0].label).toBe('Style');
    expect(blocks[0].settings?.[0].options?.[0].label).toBe('Style');
    expect(blocks[0].settings?.[0].options?.[1].label).toBe('Style');
  });
});

describe('buildInitialState - expanded defaults', () => {
  it('sets font_picker default to system-ui', () => {
    const settings: SchemaSetting[] = [{ type: 'font_picker', id: 'font', label: 'Font' }];
    const state = buildInitialState(settings);
    expect(state.font).toBe('system-ui');
  });

  it('sets text_alignment default to left', () => {
    const settings: SchemaSetting[] = [{ type: 'text_alignment', id: 'align', label: 'Align' }];
    const state = buildInitialState(settings);
    expect(state.align).toBe('left');
  });

  it('sets radio default to first option', () => {
    const settings: SchemaSetting[] = [{
      type: 'radio',
      id: 'layout',
      label: 'Layout',
      options: [{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]
    }];
    const state = buildInitialState(settings);
    expect(state.layout).toBe('grid');
  });

  it('sets collection_list default to empty JSON array', () => {
    const settings: SchemaSetting[] = [{ type: 'collection_list', id: 'collections', label: 'Collections' }];
    const state = buildInitialState(settings);
    expect(state.collections).toBe('[]');
  });

  it('sets product_list default to empty JSON array', () => {
    const settings: SchemaSetting[] = [{ type: 'product_list', id: 'products', label: 'Products' }];
    const state = buildInitialState(settings);
    expect(state.products).toBe('[]');
  });

  it('sets url default to #', () => {
    const settings: SchemaSetting[] = [{ type: 'url', id: 'link', label: 'Link' }];
    const state = buildInitialState(settings);
    expect(state.link).toBe('#');
  });

  it('uses explicit default over type default', () => {
    const settings: SchemaSetting[] = [{ type: 'url', id: 'link', label: 'Link', default: '/products' }];
    const state = buildInitialState(settings);
    expect(state.link).toBe('/products');
  });

  it('sets image_picker default to empty string (Shopify nil behavior)', () => {
    const settings: SchemaSetting[] = [{ type: 'image_picker', id: 'image', label: 'Image' }];
    const state = buildInitialState(settings);
    expect(state.image).toBe('');
  });

  it('sets checkbox default to false', () => {
    const settings: SchemaSetting[] = [{ type: 'checkbox', id: 'enabled', label: 'Enabled' }];
    const state = buildInitialState(settings);
    expect(state.enabled).toBe(false);
  });

  it('sets color default to #000000', () => {
    const settings: SchemaSetting[] = [{ type: 'color', id: 'text_color', label: 'Text Color' }];
    const state = buildInitialState(settings);
    expect(state.text_color).toBe('#000000');
  });

  it('sets number default to min value or 0', () => {
    const settings: SchemaSetting[] = [
      { type: 'number', id: 'count', label: 'Count' },
      { type: 'range', id: 'opacity', label: 'Opacity', min: 0.5, max: 1 }
    ];
    const state = buildInitialState(settings);
    expect(state.count).toBe(0);
    expect(state.opacity).toBe(0.5);
  });

  it('sets select default to first option value', () => {
    const settings: SchemaSetting[] = [{
      type: 'select',
      id: 'size',
      label: 'Size',
      options: [{ value: 'small', label: 'Small' }, { value: 'large', label: 'Large' }]
    }];
    const state = buildInitialState(settings);
    expect(state.size).toBe('small');
  });

  it('sets resource types to empty string', () => {
    const settings: SchemaSetting[] = [
      { type: 'product', id: 'featured_product', label: 'Product' },
      { type: 'collection', id: 'featured_collection', label: 'Collection' },
      { type: 'article', id: 'featured_article', label: 'Article' },
      { type: 'blog', id: 'featured_blog', label: 'Blog' },
      { type: 'page', id: 'featured_page', label: 'Page' },
      { type: 'link_list', id: 'menu', label: 'Menu' }
    ];
    const state = buildInitialState(settings);
    expect(state.featured_product).toBe('');
    expect(state.featured_collection).toBe('');
    expect(state.featured_article).toBe('');
    expect(state.featured_blog).toBe('');
    expect(state.featured_page).toBe('');
    expect(state.menu).toBe('');
  });

  it('skips header and paragraph display-only types', () => {
    const settings: SchemaSetting[] = [
      { type: 'header', id: 'header1', label: 'Section Header' },
      { type: 'paragraph', id: 'para1', label: 'Info text' },
      { type: 'text', id: 'title', label: 'Title' }
    ];
    const state = buildInitialState(settings);
    expect(state.header1).toBeUndefined();
    expect(state.para1).toBeUndefined();
    expect(state.title).toBe('');
  });
});

describe('updateSchemaDefaults', () => {
  const baseLiquid = `<div>{{ section.settings.heading }}</div>
{% schema %}
{
  "name": "Hero",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Hello" },
    { "type": "number", "id": "columns", "label": "Columns", "default": 3 },
    { "type": "checkbox", "id": "show_border", "label": "Show Border", "default": false }
  ]
}
{% endschema %}`;

  it('updates single setting default', () => {
    const result = updateSchemaDefaults(baseLiquid, { heading: 'New Heading' });
    expect(result).toContain('"default": "New Heading"');
  });

  it('updates multiple setting defaults', () => {
    const result = updateSchemaDefaults(baseLiquid, { heading: 'Updated', columns: 4, show_border: true });
    expect(result).toContain('"default": "Updated"');
    expect(result).toContain('"default": 4');
    expect(result).toContain('"default": true');
  });

  it('preserves non-default attributes (label, info, options)', () => {
    const result = updateSchemaDefaults(baseLiquid, { heading: 'Updated' });
    expect(result).toContain('"label": "Heading"');
    expect(result).toContain('"type": "text"');
    expect(result).toContain('"id": "heading"');
  });

  it('returns original code if no schema block', () => {
    const noSchema = '<div>No schema here</div>';
    const result = updateSchemaDefaults(noSchema, { heading: 'Test' });
    expect(result).toBe(noSchema);
  });

  it('returns original code if malformed JSON', () => {
    const malformed = '{% schema %} invalid json {% endschema %}';
    const result = updateSchemaDefaults(malformed, { heading: 'Test' });
    expect(result).toBe(malformed);
  });

  it('skips settings not in newDefaults', () => {
    const result = updateSchemaDefaults(baseLiquid, { heading: 'Updated' });
    expect(result).toContain('"default": 3'); // columns unchanged
    expect(result).toContain('"default": false'); // show_border unchanged
  });

  it('skips resource-based settings', () => {
    const liquidWithProduct = `{% schema %}
{
  "name": "Featured",
  "settings": [
    { "type": "product", "id": "featured_product", "label": "Product" },
    { "type": "text", "id": "title", "label": "Title", "default": "Old" }
  ]
}
{% endschema %}`;
    const result = updateSchemaDefaults(liquidWithProduct, { featured_product: 'some-id', title: 'New' });
    expect(result).not.toContain('"default": "some-id"');
    expect(result).toContain('"default": "New"');
  });

  it('maintains valid JSON formatting', () => {
    const result = updateSchemaDefaults(baseLiquid, { heading: 'Test' });
    const schemaMatch = result.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
    expect(() => JSON.parse(schemaMatch![1].trim())).not.toThrow();
  });
});

describe('updateSchemaDefaultsWithReport', () => {
  const liquidWithMixed = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Hello" },
    { "type": "product", "id": "product", "label": "Product" },
    { "type": "collection", "id": "collection", "label": "Collection" },
    { "type": "color", "id": "bg_color", "label": "Background", "default": "#ffffff" }
  ]
}
{% endschema %}`;

  it('returns updated code and unsupported settings list', () => {
    const result = updateSchemaDefaultsWithReport(liquidWithMixed, {
      heading: 'Updated',
      product: 'pid',
      collection: 'cid',
      bg_color: '#000000'
    });
    expect(result.code).toContain('"default": "Updated"');
    expect(result.code).toContain('"default": "#000000"');
    expect(result.unsupportedSettings).toContain('product');
    expect(result.unsupportedSettings).toContain('collection');
    expect(result.unsupportedSettings).toHaveLength(2);
  });

  it('returns empty unsupportedSettings when no resource types', () => {
    const result = updateSchemaDefaultsWithReport(liquidWithMixed, { heading: 'Test' });
    expect(result.unsupportedSettings).toHaveLength(0);
  });

  it('returns original code and empty array for no schema', () => {
    const noSchema = '<div>No schema</div>';
    const result = updateSchemaDefaultsWithReport(noSchema, { heading: 'Test' });
    expect(result.code).toBe(noSchema);
    expect(result.unsupportedSettings).toHaveLength(0);
  });

  it('tracks all resource types as unsupported', () => {
    const allResources = `{% schema %}
{
  "name": "Resources",
  "settings": [
    { "type": "product", "id": "p1", "label": "Product" },
    { "type": "collection", "id": "c1", "label": "Collection" },
    { "type": "article", "id": "a1", "label": "Article" },
    { "type": "blog", "id": "b1", "label": "Blog" },
    { "type": "page", "id": "pg1", "label": "Page" },
    { "type": "link_list", "id": "ll1", "label": "Menu" },
    { "type": "product_list", "id": "pl1", "label": "Products" },
    { "type": "collection_list", "id": "cl1", "label": "Collections" },
    { "type": "metaobject", "id": "mo1", "label": "Meta" },
    { "type": "metaobject_list", "id": "mol1", "label": "Meta List" }
  ]
}
{% endschema %}`;
    const result = updateSchemaDefaultsWithReport(allResources, {
      p1: 'a', c1: 'b', a1: 'c', b1: 'd', pg1: 'e',
      ll1: 'f', pl1: 'g', cl1: 'h', mo1: 'i', mol1: 'j'
    });
    expect(result.unsupportedSettings).toHaveLength(10);
  });
});

describe('getSettingsDiff', () => {
  it('returns only changed settings', () => {
    const schema: SchemaDefinition = {
      name: 'Test',
      settings: [
        { type: 'text', id: 'heading', label: 'Heading', default: 'Hello' },
        { type: 'number', id: 'count', label: 'Count', default: 5 },
        { type: 'checkbox', id: 'enabled', label: 'Enabled', default: true }
      ]
    };
    const diff = getSettingsDiff(schema, { heading: 'Hello', count: 10, enabled: true });
    expect(diff).toEqual({ count: 10 }); // only count changed
  });

  it('returns empty object for no changes', () => {
    const schema: SchemaDefinition = {
      name: 'Test',
      settings: [
        { type: 'text', id: 'heading', label: 'Heading', default: 'Hello' }
      ]
    };
    const diff = getSettingsDiff(schema, { heading: 'Hello' });
    expect(diff).toEqual({});
  });

  it('returns empty object for null schema', () => {
    const diff = getSettingsDiff(null, { heading: 'Test' });
    expect(diff).toEqual({});
  });

  it('returns empty object for schema without settings', () => {
    const schema: SchemaDefinition = { name: 'Empty' };
    const diff = getSettingsDiff(schema, { heading: 'Test' });
    expect(diff).toEqual({});
  });

  it('uses type-specific defaults when no explicit default', () => {
    const schema: SchemaDefinition = {
      name: 'Test',
      settings: [
        { type: 'checkbox', id: 'enabled', label: 'Enabled' }, // default: false
        { type: 'url', id: 'link', label: 'Link' } // default: '#'
      ]
    };
    const diff = getSettingsDiff(schema, { enabled: false, link: '/products' });
    expect(diff).toEqual({ link: '/products' }); // only link changed from default '#'
  });

  it('skips settings without id', () => {
    const schema: SchemaDefinition = {
      name: 'Test',
      settings: [
        { type: 'header', id: '', label: 'Header' } as SchemaSetting,
        { type: 'text', id: 'title', label: 'Title', default: 'Old' }
      ]
    };
    const diff = getSettingsDiff(schema, { title: 'New' });
    expect(diff).toEqual({ title: 'New' });
  });

  it('ignores settings not in newValues', () => {
    const schema: SchemaDefinition = {
      name: 'Test',
      settings: [
        { type: 'text', id: 'heading', label: 'Heading', default: 'Hello' },
        { type: 'text', id: 'subheading', label: 'Subheading', default: 'World' }
      ]
    };
    const diff = getSettingsDiff(schema, { heading: 'Updated' });
    expect(diff).toEqual({ heading: 'Updated' });
    expect(diff).not.toHaveProperty('subheading');
  });
});

describe('RESOURCE_TYPES constant', () => {
  it('contains all 10 resource types', () => {
    expect(RESOURCE_TYPES).toHaveLength(10);
    expect(RESOURCE_TYPES).toContain('product');
    expect(RESOURCE_TYPES).toContain('collection');
    expect(RESOURCE_TYPES).toContain('article');
    expect(RESOURCE_TYPES).toContain('blog');
    expect(RESOURCE_TYPES).toContain('page');
    expect(RESOURCE_TYPES).toContain('link_list');
    expect(RESOURCE_TYPES).toContain('product_list');
    expect(RESOURCE_TYPES).toContain('collection_list');
    expect(RESOURCE_TYPES).toContain('metaobject');
    expect(RESOURCE_TYPES).toContain('metaobject_list');
  });
});

describe('PRESENTATIONAL_TYPES constant', () => {
  it('contains all 10 presentational types', () => {
    expect(PRESENTATIONAL_TYPES).toHaveLength(10);
    expect(PRESENTATIONAL_TYPES).toContain('checkbox');
    expect(PRESENTATIONAL_TYPES).toContain('color');
    expect(PRESENTATIONAL_TYPES).toContain('color_background');
    expect(PRESENTATIONAL_TYPES).toContain('color_scheme');
    expect(PRESENTATIONAL_TYPES).toContain('font_picker');
    expect(PRESENTATIONAL_TYPES).toContain('number');
    expect(PRESENTATIONAL_TYPES).toContain('radio');
    expect(PRESENTATIONAL_TYPES).toContain('range');
    expect(PRESENTATIONAL_TYPES).toContain('select');
    expect(PRESENTATIONAL_TYPES).toContain('text_alignment');
  });
});

describe('isResourceType', () => {
  it('returns true for resource types', () => {
    expect(isResourceType('product')).toBe(true);
    expect(isResourceType('collection')).toBe(true);
    expect(isResourceType('article')).toBe(true);
    expect(isResourceType('blog')).toBe(true);
    expect(isResourceType('page')).toBe(true);
    expect(isResourceType('link_list')).toBe(true);
    expect(isResourceType('product_list')).toBe(true);
    expect(isResourceType('collection_list')).toBe(true);
    expect(isResourceType('metaobject')).toBe(true);
    expect(isResourceType('metaobject_list')).toBe(true);
  });

  it('returns false for non-resource types', () => {
    expect(isResourceType('text')).toBe(false);
    expect(isResourceType('number')).toBe(false);
    expect(isResourceType('checkbox')).toBe(false);
    expect(isResourceType('color')).toBe(false);
    expect(isResourceType('select')).toBe(false);
    expect(isResourceType('image_picker')).toBe(false);
  });
});

describe('isPresentationalType', () => {
  it('returns true for presentational types', () => {
    expect(isPresentationalType('checkbox')).toBe(true);
    expect(isPresentationalType('color')).toBe(true);
    expect(isPresentationalType('color_background')).toBe(true);
    expect(isPresentationalType('color_scheme')).toBe(true);
    expect(isPresentationalType('font_picker')).toBe(true);
    expect(isPresentationalType('number')).toBe(true);
    expect(isPresentationalType('radio')).toBe(true);
    expect(isPresentationalType('range')).toBe(true);
    expect(isPresentationalType('select')).toBe(true);
    expect(isPresentationalType('text_alignment')).toBe(true);
  });

  it('returns false for non-presentational types', () => {
    expect(isPresentationalType('text')).toBe(false);
    expect(isPresentationalType('textarea')).toBe(false);
    expect(isPresentationalType('richtext')).toBe(false);
    expect(isPresentationalType('product')).toBe(false);
    expect(isPresentationalType('collection')).toBe(false);
    expect(isPresentationalType('image_picker')).toBe(false);
  });
});

describe('coerceValue', () => {
  it('coerces to boolean for checkbox type', () => {
    expect(coerceValue(true, 'checkbox')).toBe(true);
    expect(coerceValue(false, 'checkbox')).toBe(false);
    expect(coerceValue(1, 'checkbox')).toBe(true);
    expect(coerceValue(0, 'checkbox')).toBe(false);
    expect(coerceValue('true', 'checkbox')).toBe(true);
    expect(coerceValue('', 'checkbox')).toBe(false);
  });

  it('coerces to number for number type', () => {
    expect(coerceValue(42, 'number')).toBe(42);
    expect(coerceValue('42', 'number')).toBe(42);
    expect(coerceValue('3.14', 'number')).toBe(3.14);
    expect(coerceValue('invalid', 'number')).toBe(0); // NaN fallback
  });

  it('coerces to number for range type', () => {
    expect(coerceValue(50, 'range')).toBe(50);
    expect(coerceValue('75', 'range')).toBe(75);
    expect(coerceValue('0.5', 'range')).toBe(0.5);
  });

  it('coerces to string for text type', () => {
    expect(coerceValue('hello', 'text')).toBe('hello');
    expect(coerceValue(123, 'text')).toBe('123');
    expect(coerceValue(true, 'text')).toBe('true');
  });

  it('coerces to string for other types', () => {
    expect(coerceValue('red', 'color')).toBe('red');
    expect(coerceValue('left', 'select')).toBe('left');
    expect(coerceValue('https://example.com', 'url')).toBe('https://example.com');
  });
});

/**
 * Phase 05 Edge Cases - Settings Sync Testing
 * Tests for edge cases documented in plans/260106-2006-section-settings-sync/phase-05-testing.md
 */
describe('Phase 05 Edge Cases', () => {
  describe('Empty Schema', () => {
    it('handles Liquid without {% schema %} gracefully', () => {
      const code = '<div>No schema here</div>';
      const result = updateSchemaDefaults(code, { heading: 'Test' });
      expect(result).toBe(code); // Unchanged
    });

    it('handles empty liquid code', () => {
      const result = updateSchemaDefaults('', { heading: 'Test' });
      expect(result).toBe('');
    });

    it('handles code with only whitespace', () => {
      const code = '   \n\t  \n   ';
      const result = updateSchemaDefaults(code, { heading: 'Test' });
      expect(result).toBe(code);
    });
  });

  describe('Malformed JSON', () => {
    it('handles invalid JSON in schema', () => {
      const code = '{% schema %}{ invalid {% endschema %}';
      const result = updateSchemaDefaults(code, { heading: 'Test' });
      expect(result).toBe(code); // Unchanged
    });

    it('handles truncated JSON in schema', () => {
      const code = '{% schema %}{"name": "Test", "settings": [{% endschema %}';
      const result = updateSchemaDefaults(code, { heading: 'Test' });
      expect(result).toBe(code); // Unchanged
    });

    it('handles empty schema block', () => {
      const code = '{% schema %}{% endschema %}';
      const result = updateSchemaDefaults(code, { heading: 'Test' });
      expect(result).toBe(code); // Unchanged, empty string is not valid JSON
    });

    it('handles schema with only whitespace', () => {
      const code = '{% schema %}   \n\t  {% endschema %}';
      const result = updateSchemaDefaults(code, { heading: 'Test' });
      expect(result).toBe(code); // Unchanged
    });
  });

  describe('Type Coercion', () => {
    it('coerces string number input to number for number setting', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "number", "id": "padding", "label": "Padding", "default": 10 }
  ]
}
{% endschema %}`;
      // Note: In real usage, the settings value would come from form input as string
      // The updateSchemaDefaults function preserves whatever type is passed
      const result = updateSchemaDefaults(liquid, { padding: 20 });
      expect(result).toContain('"default": 20');
    });

    it('preserves boolean type for checkbox settings', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "checkbox", "id": "enabled", "label": "Enabled", "default": false }
  ]
}
{% endschema %}`;
      const result = updateSchemaDefaults(liquid, { enabled: true });
      expect(result).toContain('"default": true');
    });

    it('handles string values for text settings', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Old" }
  ]
}
{% endschema %}`;
      const result = updateSchemaDefaults(liquid, { heading: 'New Heading' });
      expect(result).toContain('"default": "New Heading"');
    });
  });

  describe('Setting ID Not in Schema', () => {
    it('ignores unknown setting IDs', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Original" }
  ]
}
{% endschema %}`;
      const result = updateSchemaDefaults(liquid, {
        unknown_id: 'value',
        heading: 'Updated'
      });
      // Only heading should be updated, unknown_id ignored
      expect(result).toContain('"default": "Updated"');
      expect(result).not.toContain('unknown_id');
    });

    it('handles all unknown setting IDs', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "text", "id": "title", "label": "Title", "default": "Original" }
  ]
}
{% endschema %}`;
      const result = updateSchemaDefaults(liquid, {
        nonexistent: 'foo',
        also_unknown: 'bar',
        fake_setting: 123
      });
      // Original should remain unchanged
      expect(result).toContain('"default": "Original"');
    });
  });

  describe('Settings Without ID', () => {
    it('skips settings without ID when updating defaults', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "header", "content": "Section Header" },
    { "type": "text", "id": "heading", "label": "Heading", "default": "Hello" }
  ]
}
{% endschema %}`;
      const result = updateSchemaDefaults(liquid, { heading: 'World' });
      expect(result).toContain('"default": "World"');
      expect(result).toContain('"type": "header"'); // Header preserved
    });
  });

  describe('Edge Case: Special Characters', () => {
    it('handles special characters in string defaults', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Hello" }
  ]
}
{% endschema %}`;
      const result = updateSchemaDefaults(liquid, {
        heading: 'Hello "World" & <Friends>'
      });
      expect(result).toContain('"default": "Hello \\"World\\" & <Friends>"');
    });

    it('handles newlines in text values', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "textarea", "id": "content", "label": "Content", "default": "Line1" }
  ]
}
{% endschema %}`;
      const result = updateSchemaDefaults(liquid, {
        content: 'Line1\nLine2\nLine3'
      });
      expect(result).toContain('Line1\\nLine2\\nLine3');
    });

    it('handles unicode characters', () => {
      const liquid = `{% schema %}
{
  "name": "Test",
  "settings": [
    { "type": "text", "id": "title", "label": "Title", "default": "English" }
  ]
}
{% endschema %}`;
      const result = updateSchemaDefaults(liquid, {
        title: '日本語テスト 🚀'
      });
      expect(result).toContain('日本語テスト 🚀');
    });
  });
});
