/**
 * Shopify Liquid Utility Filter Implementations
 * General-purpose utility filters for section preview
 */

import { escapeHtml } from './htmlEscape';

interface PaginateObject {
  previous?: { url: string };
  parts?: Array<{ url: string; title: string; is_link: boolean }>;
  next?: { url: string };
}

interface FormError {
  message: string;
}

export const utilityFilters = {
  /** Returns defaultValue if value is nil, false, or empty string */
  default: (value: unknown, defaultValue: unknown): unknown => {
    if (value === null || value === undefined || value === '' || value === false) {
      return defaultValue;
    }
    return value;
  },

  /** Renders form errors as an unordered list */
  default_errors: (errors: unknown): string => {
    if (!errors || !Array.isArray(errors)) return '';

    const errorList = errors as FormError[];
    const items = errorList.map((e) => `<li>${escapeHtml(e.message)}</li>`).join('');
    return `<ul class="form-errors">${items}</ul>`;
  },

  /** Renders default pagination HTML */
  default_pagination: (paginate: unknown): string => {
    if (!paginate) return '';

    const p = paginate as PaginateObject;
    let html = '<nav class="pagination">';

    if (p.previous) {
      html += `<a href="${escapeHtml(p.previous.url)}" class="pagination__prev">Previous</a>`;
    }

    if (p.parts) {
      html += '<span class="pagination__pages">';
      for (const part of p.parts) {
        if (part.is_link) {
          html += `<a href="${escapeHtml(part.url)}">${escapeHtml(part.title)}</a>`;
        } else {
          html += `<span class="pagination__current">${escapeHtml(part.title)}</span>`;
        }
      }
      html += '</span>';
    }

    if (p.next) {
      html += `<a href="${escapeHtml(p.next.url)}" class="pagination__next">Next</a>`;
    }

    html += '</nav>';
    return html;
  },

  /** Highlights search query terms in text */
  highlight: (text: string, query: string): string => {
    if (!text || !query) return text || '';

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  /** Returns URL to payment type image */
  payment_type_img_url: (type: string): string => {
    // Return placeholder URL - real implementation uses Shopify CDN
    return `https://cdn.shopify.com/s/files/1/0000/0001/files/${type}.svg`;
  },

  /** Returns inline SVG for payment type icon */
  payment_type_svg_tag: (type: string): string => {
    const icons: Record<string, string> = {
      visa: '<svg viewBox="0 0 38 24"><rect fill="#1434CB" width="38" height="24" rx="3"/><text x="19" y="15" fill="white" text-anchor="middle" font-size="8">VISA</text></svg>',
      mastercard:
        '<svg viewBox="0 0 38 24"><rect fill="#EB001B" width="38" height="24" rx="3"/><circle cx="15" cy="12" r="7" fill="#F79E1B" fill-opacity="0.8"/><text x="19" y="15" fill="white" text-anchor="middle" font-size="6">MC</text></svg>',
      american_express:
        '<svg viewBox="0 0 38 24"><rect fill="#006FCF" width="38" height="24" rx="3"/><text x="19" y="15" fill="white" text-anchor="middle" font-size="6">AMEX</text></svg>',
      paypal:
        '<svg viewBox="0 0 38 24"><rect fill="#003087" width="38" height="24" rx="3"/><text x="19" y="15" fill="white" text-anchor="middle" font-size="6">PayPal</text></svg>',
      shopify_pay:
        '<svg viewBox="0 0 38 24"><rect fill="#5C6AC4" width="38" height="24" rx="3"/><text x="19" y="15" fill="white" text-anchor="middle" font-size="6">Shop</text></svg>',
    };

    return (
      icons[type] ||
      `<svg viewBox="0 0 38 24"><rect fill="#ccc" width="38" height="24" rx="3"/><text x="19" y="15" fill="#666" text-anchor="middle" font-size="6">${escapeHtml(type)}</text></svg>`
    );
  },

  /** Generates link tag for stylesheet */
  stylesheet_tag: (url: string): string => {
    return `<link rel="stylesheet" href="${escapeHtml(url)}" type="text/css">`;
  },

  /** Generates script tag */
  script_tag: (url: string): string => {
    return `<script src="${escapeHtml(url)}"></script>`;
  },

  /** Generates preload link tag */
  preload_tag: (url: string, as?: string): string => {
    const asAttr = as ? ` as="${escapeHtml(as)}"` : '';
    return `<link rel="preload" href="${escapeHtml(url)}"${asAttr}>`;
  },

  /** Generates time element from date */
  time_tag: (date: string | Date, format?: string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const isoString = d.toISOString();
    const display = format ? d.toLocaleDateString() : d.toLocaleString();
    return `<time datetime="${isoString}">${escapeHtml(display)}</time>`;
  },

  /** Formats weight with unit (grams input, converts to specified unit) */
  weight_with_unit: (grams: number, unit?: string): string => {
    const u = unit || 'kg';
    let value: number;
    let displayUnit: string;

    switch (u) {
      case 'kg':
        value = grams / 1000;
        displayUnit = 'kg';
        break;
      case 'lb':
        value = grams * 0.00220462;
        displayUnit = 'lb';
        break;
      case 'oz':
        value = grams * 0.035274;
        displayUnit = 'oz';
        break;
      default:
        value = grams;
        displayUnit = 'g';
    }

    return `${value.toFixed(2)} ${displayUnit}`;
  },
};
