/**
 * Shopify Liquid Metafield Filter Implementations
 * Renders metafield values based on their types
 */

import { escapeHtml } from './htmlEscape';

interface Metafield {
  value: unknown;
  type: string;
  key?: string;
  namespace?: string;
}

interface RatingValue {
  value: number;
  scale_max: number;
}

interface FileReference {
  url?: string;
  alt?: string;
}

interface ResourceReference {
  title?: string;
  url?: string;
}

export const metafieldFilters = {
  /** Renders metafield value as HTML based on its type */
  metafield_tag: (metafield: unknown): string => {
    if (!metafield) return '';

    const mf = metafield as Metafield;
    const value = mf.value;
    const type = mf.type || 'single_line_text_field';

    switch (type) {
      case 'single_line_text_field':
      case 'multi_line_text_field':
        return `<span class="metafield metafield--text">${escapeHtml(String(value ?? ''))}</span>`;

      case 'rich_text_field':
        return `<div class="metafield metafield--rich-text">${value}</div>`;

      case 'url':
        return `<a href="${escapeHtml(String(value ?? ''))}" class="metafield metafield--url">${escapeHtml(String(value ?? ''))}</a>`;

      case 'color':
        return `<span class="metafield metafield--color" style="background-color: ${escapeHtml(String(value ?? ''))}"></span>`;

      case 'rating': {
        const rating = value as RatingValue;
        const filledStars = Math.round(rating.value);
        const emptyStars = rating.scale_max - filledStars;
        const stars = '\u2605'.repeat(filledStars) + '\u2606'.repeat(emptyStars);
        return `<span class="metafield metafield--rating" aria-label="${rating.value} out of ${rating.scale_max}">${stars}</span>`;
      }

      case 'file_reference': {
        const file = value as FileReference;
        if (file.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          return `<img src="${escapeHtml(file.url)}" alt="${escapeHtml(file.alt || '')}" class="metafield metafield--image">`;
        }
        return `<a href="${escapeHtml(file.url || '')}" class="metafield metafield--file">${escapeHtml(file.alt || 'Download')}</a>`;
      }

      case 'product_reference':
      case 'collection_reference':
      case 'page_reference': {
        const ref = value as ResourceReference;
        return `<a href="${escapeHtml(ref.url || '#')}" class="metafield metafield--reference">${escapeHtml(ref.title || 'Link')}</a>`;
      }

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'number_integer':
      case 'number_decimal':
        return `<span class="metafield metafield--number">${value}</span>`;

      case 'date':
      case 'date_time': {
        const date = new Date(value as string);
        return `<time datetime="${value}" class="metafield metafield--date">${date.toLocaleDateString()}</time>`;
      }

      case 'json':
        return `<pre class="metafield metafield--json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;

      default:
        return String(value ?? '');
    }
  },

  /** Returns metafield value as plain text */
  metafield_text: (metafield: unknown): string => {
    if (!metafield) return '';

    const mf = metafield as Metafield;
    const value = mf.value;
    const type = mf.type || 'single_line_text_field';

    switch (type) {
      case 'rating': {
        const rating = value as RatingValue;
        return `${rating.value}/${rating.scale_max}`;
      }

      case 'file_reference': {
        const file = value as FileReference;
        return file.url || '';
      }

      case 'product_reference':
      case 'collection_reference':
      case 'page_reference': {
        const ref = value as ResourceReference;
        return ref.title || '';
      }

      case 'date':
      case 'date_time':
        return new Date(value as string).toLocaleDateString();

      case 'json':
        return JSON.stringify(value);

      default:
        return String(value ?? '');
    }
  },
};
