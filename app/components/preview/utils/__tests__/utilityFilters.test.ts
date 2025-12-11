import { utilityFilters } from '../utilityFilters';

describe('utilityFilters', () => {
  describe('default', () => {
    it('returns value when not nil', () => {
      expect(utilityFilters.default('hello', 'fallback')).toBe('hello');
      expect(utilityFilters.default(42, 0)).toBe(42);
      expect(utilityFilters.default(true, false)).toBe(true);
    });

    it('returns default for null', () => {
      expect(utilityFilters.default(null, 'fallback')).toBe('fallback');
    });

    it('returns default for undefined', () => {
      expect(utilityFilters.default(undefined, 'fallback')).toBe('fallback');
    });

    it('returns default for empty string', () => {
      expect(utilityFilters.default('', 'fallback')).toBe('fallback');
    });

    it('returns default for false', () => {
      expect(utilityFilters.default(false, true)).toBe(true);
    });

    it('returns 0 when 0 is the value (not default)', () => {
      expect(utilityFilters.default(0, 100)).toBe(0);
    });
  });

  describe('default_errors', () => {
    it('renders error list as ul', () => {
      const result = utilityFilters.default_errors([{ message: 'Error 1' }, { message: 'Error 2' }]);
      expect(result).toContain('<ul class="form-errors">');
      expect(result).toContain('<li>Error 1</li>');
      expect(result).toContain('<li>Error 2</li>');
    });

    it('returns empty string for null', () => {
      expect(utilityFilters.default_errors(null)).toBe('');
    });

    it('returns empty string for non-array', () => {
      expect(utilityFilters.default_errors('not an array')).toBe('');
    });

    it('escapes HTML in error messages', () => {
      const result = utilityFilters.default_errors([{ message: '<script>xss</script>' }]);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('default_pagination', () => {
    it('renders pagination with previous and next', () => {
      const result = utilityFilters.default_pagination({
        previous: { url: '/page/1' },
        next: { url: '/page/3' },
      });
      expect(result).toContain('<nav class="pagination">');
      expect(result).toContain('href="/page/1"');
      expect(result).toContain('href="/page/3"');
      expect(result).toContain('Previous');
      expect(result).toContain('Next');
    });

    it('renders pagination parts', () => {
      const result = utilityFilters.default_pagination({
        parts: [
          { url: '/page/1', title: '1', is_link: true },
          { url: '/page/2', title: '2', is_link: false },
          { url: '/page/3', title: '3', is_link: true },
        ],
      });
      expect(result).toContain('<a href="/page/1">1</a>');
      expect(result).toContain('<span class="pagination__current">2</span>');
      expect(result).toContain('<a href="/page/3">3</a>');
    });

    it('returns empty string for null', () => {
      expect(utilityFilters.default_pagination(null)).toBe('');
    });
  });

  describe('highlight', () => {
    it('wraps matching text in mark tags', () => {
      const result = utilityFilters.highlight('Hello World', 'World');
      expect(result).toBe('Hello <mark>World</mark>');
    });

    it('is case insensitive', () => {
      const result = utilityFilters.highlight('Hello World', 'world');
      expect(result).toBe('Hello <mark>World</mark>');
    });

    it('highlights multiple occurrences', () => {
      const result = utilityFilters.highlight('foo bar foo', 'foo');
      expect(result).toBe('<mark>foo</mark> bar <mark>foo</mark>');
    });

    it('escapes regex special characters', () => {
      const result = utilityFilters.highlight('Price: $19.99', '$19.99');
      expect(result).toBe('Price: <mark>$19.99</mark>');
    });

    it('returns original text when no query', () => {
      expect(utilityFilters.highlight('Hello', '')).toBe('Hello');
    });

    it('returns empty string for null text', () => {
      expect(utilityFilters.highlight(null as unknown as string, 'query')).toBe('');
    });
  });

  describe('payment_type_img_url', () => {
    it('returns CDN URL for payment type', () => {
      expect(utilityFilters.payment_type_img_url('visa')).toBe(
        'https://cdn.shopify.com/s/files/1/0000/0001/files/visa.svg'
      );
    });
  });

  describe('payment_type_svg_tag', () => {
    it('returns SVG for known payment types', () => {
      expect(utilityFilters.payment_type_svg_tag('visa')).toContain('VISA');
      expect(utilityFilters.payment_type_svg_tag('mastercard')).toContain('MC');
      expect(utilityFilters.payment_type_svg_tag('american_express')).toContain('AMEX');
      expect(utilityFilters.payment_type_svg_tag('paypal')).toContain('PayPal');
    });

    it('returns generic SVG for unknown types', () => {
      const result = utilityFilters.payment_type_svg_tag('unknown_card');
      expect(result).toContain('unknown_card');
      expect(result).toContain('<svg');
    });
  });

  describe('stylesheet_tag', () => {
    it('generates link tag', () => {
      expect(utilityFilters.stylesheet_tag('/styles/main.css')).toBe(
        '<link rel="stylesheet" href="/styles/main.css" type="text/css">'
      );
    });
  });

  describe('script_tag', () => {
    it('generates script tag', () => {
      expect(utilityFilters.script_tag('/js/app.js')).toBe('<script src="/js/app.js"></script>');
    });
  });

  describe('preload_tag', () => {
    it('generates preload link without as attribute', () => {
      expect(utilityFilters.preload_tag('/styles/main.css')).toBe(
        '<link rel="preload" href="/styles/main.css">'
      );
    });

    it('generates preload link with as attribute', () => {
      expect(utilityFilters.preload_tag('/styles/main.css', 'style')).toBe(
        '<link rel="preload" href="/styles/main.css" as="style">'
      );
    });
  });

  describe('time_tag', () => {
    it('generates time element from string date', () => {
      const result = utilityFilters.time_tag('2024-01-15T10:30:00Z');
      expect(result).toContain('<time datetime=');
      expect(result).toContain('2024-01-15');
    });

    it('generates time element from Date object', () => {
      const result = utilityFilters.time_tag(new Date('2024-01-15T10:30:00Z'));
      expect(result).toContain('<time datetime=');
    });

    it('returns empty string for invalid date', () => {
      expect(utilityFilters.time_tag('invalid')).toBe('');
    });
  });

  describe('weight_with_unit', () => {
    it('converts grams to kg by default', () => {
      expect(utilityFilters.weight_with_unit(1000)).toBe('1.00 kg');
      expect(utilityFilters.weight_with_unit(2500)).toBe('2.50 kg');
    });

    it('converts grams to lb', () => {
      const result = utilityFilters.weight_with_unit(453.592, 'lb');
      expect(result).toMatch(/1\.00 lb/);
    });

    it('converts grams to oz', () => {
      const result = utilityFilters.weight_with_unit(28.3495, 'oz');
      expect(result).toMatch(/1\.00 oz/);
    });

    it('keeps grams when unit is g', () => {
      expect(utilityFilters.weight_with_unit(500, 'g')).toBe('500.00 g');
    });

    it('uses g for unknown units', () => {
      expect(utilityFilters.weight_with_unit(500, 'unknown')).toBe('500.00 g');
    });
  });
});
