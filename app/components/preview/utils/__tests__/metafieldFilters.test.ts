import { metafieldFilters } from '../metafieldFilters';

describe('metafieldFilters', () => {
  describe('metafield_tag', () => {
    it('renders single line text', () => {
      const result = metafieldFilters.metafield_tag({
        value: 'Hello World',
        type: 'single_line_text_field',
      });
      expect(result).toBe('<span class="metafield metafield--text">Hello World</span>');
    });

    it('renders multi line text', () => {
      const result = metafieldFilters.metafield_tag({
        value: 'Line 1\nLine 2',
        type: 'multi_line_text_field',
      });
      expect(result).toContain('metafield--text');
    });

    it('renders rich text as div', () => {
      const result = metafieldFilters.metafield_tag({
        value: '<p>Rich content</p>',
        type: 'rich_text_field',
      });
      expect(result).toBe('<div class="metafield metafield--rich-text"><p>Rich content</p></div>');
    });

    it('renders URL as link', () => {
      const result = metafieldFilters.metafield_tag({
        value: 'https://example.com',
        type: 'url',
      });
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('metafield--url');
    });

    it('renders color as span with background', () => {
      const result = metafieldFilters.metafield_tag({
        value: '#ff0000',
        type: 'color',
      });
      expect(result).toContain('style="background-color: #ff0000"');
      expect(result).toContain('metafield--color');
    });

    it('renders rating with stars', () => {
      const result = metafieldFilters.metafield_tag({
        value: { value: 3, scale_max: 5 },
        type: 'rating',
      });
      expect(result).toContain('\u2605\u2605\u2605\u2606\u2606');
      expect(result).toContain('aria-label="3 out of 5"');
    });

    it('renders image file reference', () => {
      const result = metafieldFilters.metafield_tag({
        value: { url: 'https://example.com/image.jpg', alt: 'Test' },
        type: 'file_reference',
      });
      expect(result).toContain('<img');
      expect(result).toContain('src="https://example.com/image.jpg"');
      expect(result).toContain('alt="Test"');
    });

    it('renders non-image file as download link', () => {
      const result = metafieldFilters.metafield_tag({
        value: { url: 'https://example.com/file.pdf', alt: 'Manual' },
        type: 'file_reference',
      });
      expect(result).toContain('<a href="https://example.com/file.pdf"');
      expect(result).toContain('>Manual</a>');
    });

    it('renders product reference as link', () => {
      const result = metafieldFilters.metafield_tag({
        value: { title: 'Related Product', url: '/products/related' },
        type: 'product_reference',
      });
      expect(result).toContain('<a href="/products/related"');
      expect(result).toContain('>Related Product</a>');
    });

    it('renders boolean as Yes/No', () => {
      expect(metafieldFilters.metafield_tag({ value: true, type: 'boolean' })).toBe('Yes');
      expect(metafieldFilters.metafield_tag({ value: false, type: 'boolean' })).toBe('No');
    });

    it('renders number', () => {
      const result = metafieldFilters.metafield_tag({
        value: 42,
        type: 'number_integer',
      });
      expect(result).toBe('<span class="metafield metafield--number">42</span>');
    });

    it('renders date with time tag', () => {
      const result = metafieldFilters.metafield_tag({
        value: '2024-01-15',
        type: 'date',
      });
      expect(result).toContain('<time datetime="2024-01-15"');
      expect(result).toContain('metafield--date');
    });

    it('renders JSON as pre with escaped HTML', () => {
      const result = metafieldFilters.metafield_tag({
        value: { key: 'value' },
        type: 'json',
      });
      expect(result).toContain('<pre class="metafield metafield--json">');
      // JSON is HTML-escaped for safety (quotes become &quot;)
      expect(result).toContain('&quot;key&quot;');
      expect(result).toContain('&quot;value&quot;');
    });

    it('escapes HTML in text values', () => {
      const result = metafieldFilters.metafield_tag({
        value: '<script>alert("xss")</script>',
        type: 'single_line_text_field',
      });
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('returns empty string for null', () => {
      expect(metafieldFilters.metafield_tag(null)).toBe('');
    });
  });

  describe('metafield_text', () => {
    it('returns text value as string', () => {
      const result = metafieldFilters.metafield_text({
        value: 'Plain text',
        type: 'single_line_text_field',
      });
      expect(result).toBe('Plain text');
    });

    it('returns rating as fraction', () => {
      const result = metafieldFilters.metafield_text({
        value: { value: 4, scale_max: 5 },
        type: 'rating',
      });
      expect(result).toBe('4/5');
    });

    it('returns file URL', () => {
      const result = metafieldFilters.metafield_text({
        value: { url: 'https://example.com/file.pdf' },
        type: 'file_reference',
      });
      expect(result).toBe('https://example.com/file.pdf');
    });

    it('returns reference title', () => {
      const result = metafieldFilters.metafield_text({
        value: { title: 'Product Name' },
        type: 'product_reference',
      });
      expect(result).toBe('Product Name');
    });

    it('returns formatted date', () => {
      const result = metafieldFilters.metafield_text({
        value: '2024-01-15',
        type: 'date',
      });
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('returns stringified JSON', () => {
      const result = metafieldFilters.metafield_text({
        value: { foo: 'bar' },
        type: 'json',
      });
      expect(result).toBe('{"foo":"bar"}');
    });

    it('returns empty string for null', () => {
      expect(metafieldFilters.metafield_text(null)).toBe('');
    });
  });
});
