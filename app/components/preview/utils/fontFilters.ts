/**
 * Shopify Liquid Font Filter Implementations
 * Font manipulation and CSS generation for section preview
 */

interface FontObject {
  family?: string;
  fallback_families?: string;
  weight?: number | string;
  style?: string;
  variants?: Array<{ weight: number; style: string }>;
  src?: string;
}

export const fontFilters = {
  /** Generates @font-face CSS declaration */
  font_face: (font: unknown): string => {
    if (!font) return '';

    const fontObj = font as FontObject;
    const family = fontObj.family || 'sans-serif';
    const weight = fontObj.weight || 400;
    const style = fontObj.style || 'normal';

    // In production, this would generate actual @font-face with src URLs
    return `@font-face {
  font-family: "${family}";
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
  src: local("${family}");
}`;
  },

  /** Returns URL to font file */
  font_url: (font: unknown, format?: string): string => {
    if (!font) return '';

    const fontObj = font as FontObject;
    // Return placeholder URL - real implementation would use Shopify CDN
    const family = (fontObj.family || 'arial').toLowerCase().replace(/\s+/g, '-');
    const ext = format || 'woff2';

    return `https://fonts.shopifycdn.com/preview/${family}.${ext}`;
  },

  /** Modifies font properties (weight, style) */
  font_modify: (font: unknown, attribute: string, value: string | number): FontObject => {
    if (!font) return { family: 'sans-serif' };

    const fontObj = { ...(font as FontObject) };

    switch (attribute) {
      case 'weight':
        fontObj.weight =
          typeof value === 'string'
            ? value === 'bold'
              ? 700
              : value === 'normal'
                ? 400
                : parseInt(value)
            : value;
        break;
      case 'style':
        fontObj.style = String(value);
        break;
    }

    return fontObj;
  },
};
