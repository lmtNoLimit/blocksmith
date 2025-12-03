import { resolveTranslationKey, extractSettings, extractBlocks } from '../parseSchema';
import type { SchemaDefinition } from '../SchemaTypes';

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
