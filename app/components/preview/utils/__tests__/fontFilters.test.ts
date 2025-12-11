import { fontFilters } from '../fontFilters';

describe('fontFilters', () => {
  describe('font_face', () => {
    it('generates @font-face CSS', () => {
      const result = fontFilters.font_face({
        family: 'Roboto',
        weight: 400,
        style: 'normal',
      });
      expect(result).toContain('@font-face');
      expect(result).toContain('font-family: "Roboto"');
      expect(result).toContain('font-weight: 400');
      expect(result).toContain('font-style: normal');
      expect(result).toContain('font-display: swap');
    });

    it('uses defaults for missing properties', () => {
      const result = fontFilters.font_face({});
      expect(result).toContain('font-family: "sans-serif"');
      expect(result).toContain('font-weight: 400');
      expect(result).toContain('font-style: normal');
    });

    it('returns empty string for null', () => {
      expect(fontFilters.font_face(null)).toBe('');
    });
  });

  describe('font_url', () => {
    it('generates font URL with default woff2 format', () => {
      const result = fontFilters.font_url({ family: 'Roboto' });
      expect(result).toBe('https://fonts.shopifycdn.com/preview/roboto.woff2');
    });

    it('generates font URL with specified format', () => {
      const result = fontFilters.font_url({ family: 'Open Sans' }, 'woff');
      expect(result).toBe('https://fonts.shopifycdn.com/preview/open-sans.woff');
    });

    it('uses arial as default family', () => {
      const result = fontFilters.font_url({});
      expect(result).toBe('https://fonts.shopifycdn.com/preview/arial.woff2');
    });

    it('returns empty string for null', () => {
      expect(fontFilters.font_url(null)).toBe('');
    });
  });

  describe('font_modify', () => {
    it('modifies weight with number', () => {
      const result = fontFilters.font_modify({ family: 'Roboto', weight: 400 }, 'weight', 700);
      expect(result.weight).toBe(700);
    });

    it('modifies weight with string bold', () => {
      const result = fontFilters.font_modify({ family: 'Roboto' }, 'weight', 'bold');
      expect(result.weight).toBe(700);
    });

    it('modifies weight with string normal', () => {
      const result = fontFilters.font_modify({ family: 'Roboto', weight: 700 }, 'weight', 'normal');
      expect(result.weight).toBe(400);
    });

    it('modifies weight with numeric string', () => {
      const result = fontFilters.font_modify({ family: 'Roboto' }, 'weight', '600');
      expect(result.weight).toBe(600);
    });

    it('modifies style', () => {
      const result = fontFilters.font_modify({ family: 'Roboto' }, 'style', 'italic');
      expect(result.style).toBe('italic');
    });

    it('preserves other properties', () => {
      const result = fontFilters.font_modify({ family: 'Roboto', weight: 400 }, 'style', 'italic');
      expect(result.family).toBe('Roboto');
      expect(result.weight).toBe(400);
    });

    it('returns default for null input', () => {
      const result = fontFilters.font_modify(null, 'weight', 700);
      expect(result.family).toBe('sans-serif');
    });
  });
});
