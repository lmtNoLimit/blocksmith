import { useState, useCallback, useRef, useEffect } from 'react';
import { Liquid } from 'liquidjs';
import type { PreviewSettings } from '../types';
import type { BlockInstance } from '../schema/SchemaTypes';
import { BlockDrop } from '../drops';
import { arrayFilters, stringFilters, mathFilters } from '../utils/liquidFilters';
import { colorFilters } from '../utils/colorFilters';
import { registerShopifyTags } from '../utils/liquidTags';

interface RenderResult {
  html: string;
  css: string;
}

interface UseLiquidRendererResult {
  render: (template: string, settings: PreviewSettings, blocks?: BlockInstance[], mockData?: Record<string, unknown>) => Promise<RenderResult>;
  isRendering: boolean;
  error: string | null;
}

/**
 * Hook for rendering Liquid templates using LiquidJS
 * Provides Shopify-compatible filter stubs
 */
export function useLiquidRenderer(): UseLiquidRendererResult {
  const engineRef = useRef<Liquid | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize LiquidJS engine once
  useEffect(() => {
    engineRef.current = new Liquid({
      strictFilters: false,
      strictVariables: false
    });

    const engine = engineRef.current;

    // Inline SVG placeholder for broken/missing images (works offline)
    const PLACEHOLDER_IMAGE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#f0f0f0" width="300" height="200"/><rect fill="#e0e0e0" x="110" y="60" width="80" height="80" rx="4"/><circle fill="#ccc" cx="130" cy="85" r="8"/><polygon fill="#ccc" points="120,130 150,95 180,130"/><polygon fill="#d0d0d0" points="140,130 160,110 180,130"/></svg>');

    // Register Shopify-specific filter stubs
    engine.registerFilter('img_url', (image: unknown, size?: string) => {
      if (!image) return PLACEHOLDER_IMAGE;
      if (typeof image === 'string') return image;

      // Handle ImageDrop or any object with src property
      const imageObj = image as { src?: string; url?: string; img_url?: (size?: string) => string };

      // Check if it has an img_url method (like ImageDrop)
      if (typeof imageObj.img_url === 'function') {
        return imageObj.img_url(size);
      }

      // Fall back to src or url property
      return imageObj.src || imageObj.url || PLACEHOLDER_IMAGE;
    });

    engine.registerFilter('image_url', (image: unknown, _options?: { width?: number; height?: number } | string) => {
      if (!image || image === 'placeholder') return PLACEHOLDER_IMAGE;
      if (typeof image === 'string') return image;

      // Handle ImageDrop or any object with src property
      const imageObj = image as { src?: string; url?: string };
      const baseUrl = imageObj.src || imageObj.url;

      if (!baseUrl) return PLACEHOLDER_IMAGE;

      // In real Shopify, options would add width/height params
      // For preview, just return the base URL
      return baseUrl;
    });

    engine.registerFilter('money', (cents: number) => {
      const amount = (cents / 100).toFixed(2);
      return `$${amount}`;
    });

    engine.registerFilter('money_with_currency', (cents: number) => {
      const amount = (cents / 100).toFixed(2);
      return `$${amount} USD`;
    });

    engine.registerFilter('money_without_currency', (cents: number) => {
      return (cents / 100).toFixed(2);
    });

    engine.registerFilter('money_without_trailing_zeros', (cents: number) => {
      const amount = cents / 100;
      return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
    });

    engine.registerFilter('asset_url', (path: string) => `/assets/${path}`);
    engine.registerFilter('file_url', (filename: string) => `/files/${filename}`);

    engine.registerFilter('t', (key: string) => key);

    engine.registerFilter('handle', (str: string) => {
      return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    });

    engine.registerFilter('handleize', (str: string) => {
      return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    });

    engine.registerFilter('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });

    engine.registerFilter('json', (value: unknown) => JSON.stringify(value));

    engine.registerFilter('date', (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return dateStr;
      }
    });

    engine.registerFilter('img_tag', (url: string, alt?: string) => {
      return `<img src="${url}" alt="${alt || ''}" />`;
    });

    engine.registerFilter('link_to', (text: string, url?: string) => {
      // Shopify syntax: {{ 'text' | link_to: '/url' }}
      // text is the pipe input, url is the filter parameter
      return `<a href="${url || '#'}">${text || ''}</a>`;
    });

    // Payment button filter stub - renders placeholder button
    engine.registerFilter('payment_button', () => {
      return `<button type="button" class="shopify-payment-button" style="padding: 12px 24px; background: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">Buy with Shop Pay</button>`;
    });

    engine.registerFilter('product_url', (product: { url?: string; handle?: string }) => {
      return product?.url || `/products/${product?.handle || 'product'}`;
    });

    engine.registerFilter('collection_url', (collection: { url?: string; handle?: string }) => {
      return collection?.url || `/collections/${collection?.handle || 'collection'}`;
    });

    engine.registerFilter('url_for_type', (type: string) => {
      return `/collections/types?q=${encodeURIComponent(type)}`;
    });

    engine.registerFilter('url_for_vendor', (vendor: string) => {
      return `/collections/vendors?q=${encodeURIComponent(vendor)}`;
    });

    engine.registerFilter('where', (array: unknown[], key: string, value: unknown) => {
      if (!Array.isArray(array)) return [];
      return array.filter((item) => {
        const record = item as Record<string, unknown>;
        return record[key] === value;
      });
    });

    engine.registerFilter('times', (a: number, b: number) => a * b);
    engine.registerFilter('divided_by', (a: number, b: number) => Math.floor(a / b));
    engine.registerFilter('modulo', (a: number, b: number) => a % b);

    // Register array filters (first, last, map, compact, concat, etc.)
    Object.entries(arrayFilters).forEach(([name, fn]) => {
      engine.registerFilter(name, fn as (...args: unknown[]) => unknown);
    });

    // Register string filters (escape_once, newline_to_br, strip_html, etc.)
    Object.entries(stringFilters).forEach(([name, fn]) => {
      engine.registerFilter(name, fn as (...args: unknown[]) => unknown);
    });

    // Register math filters (abs, at_least, at_most, ceil, floor, round, plus, minus)
    Object.entries(mathFilters).forEach(([name, fn]) => {
      engine.registerFilter(name, fn as (...args: unknown[]) => unknown);
    });

    // Register color filters (replace stubs with real implementations)
    Object.entries(colorFilters).forEach(([name, fn]) => {
      engine.registerFilter(name, fn as (...args: unknown[]) => unknown);
    });

    // Register all Shopify-specific tags (form, paginate, section, render, comment, style, etc.)
    registerShopifyTags(engine);
  }, []);

  const render = useCallback(async (
    template: string,
    settings: PreviewSettings,
    blocks: BlockInstance[] = [],
    mockData: Record<string, unknown> = {}
  ): Promise<RenderResult> => {
    if (!engineRef.current) {
      throw new Error('Liquid engine not initialized');
    }

    setIsRendering(true);
    setError(null);

    try {
      // Strip {% schema %}...{% endschema %} blocks (not renderable)
      const processedTemplate = template.replace(/\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/gi, '');

      // Build section settings by merging primitive values with resource drops
      const settingsResourceDrops = mockData.settingsResourceDrops as Record<string, unknown> | undefined;
      const mergedSettings = settingsResourceDrops
        ? { ...settings, ...settingsResourceDrops }
        : settings;

      // Build render context with section object including blocks
      const context = {
        ...mockData,
        section: {
          id: 'preview-section',
          settings: mergedSettings,
          blocks: blocks.map(block => new BlockDrop(block))
        },
        settings: mergedSettings
      };

      // Render the full template (including {% style %} tags which output <style data-shopify-style>)
      const renderedHtml = await engineRef.current.parseAndRender(processedTemplate, context);

      // Extract CSS from all <style> tags (including data-shopify-style from {% style %} tag)
      const allStyles = renderedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      const css = allStyles?.map((s: string) => s.replace(/<\/?style[^>]*>/gi, '')).join('\n') || '';

      // Remove all style tags from HTML output
      const html = renderedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

      return { html, css };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Render failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsRendering(false);
    }
  }, []);

  return { render, isRendering, error };
}
