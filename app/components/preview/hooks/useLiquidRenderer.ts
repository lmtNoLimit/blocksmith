import { useState, useCallback, useRef, useEffect } from 'react';
import { Liquid } from 'liquidjs';
import type { PreviewSettings } from '../types';

interface RenderResult {
  html: string;
  css: string;
}

interface UseLiquidRendererResult {
  render: (template: string, settings: PreviewSettings, mockData?: Record<string, unknown>) => Promise<RenderResult>;
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

    // Register Shopify-specific filter stubs
    engine.registerFilter('img_url', (image: string | { src: string } | null, _size?: string) => {
      if (!image) return 'https://via.placeholder.com/300';
      return typeof image === 'string' ? image : image.src || 'https://via.placeholder.com/300';
    });

    engine.registerFilter('image_url', (image: string | { src: string } | null) => {
      if (!image) return 'https://via.placeholder.com/300';
      return typeof image === 'string' ? image : image.src;
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

    engine.registerFilter('link_to', (url: string, title: string) => {
      return `<a href="${url}">${title}</a>`;
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

    // Color filters (stubs)
    engine.registerFilter('color_to_rgb', (color: string) => color);
    engine.registerFilter('color_to_hsl', (color: string) => color);
    engine.registerFilter('color_modify', (color: string) => color);
    engine.registerFilter('color_lighten', (color: string) => color);
    engine.registerFilter('color_darken', (color: string) => color);
  }, []);

  const render = useCallback(async (
    template: string,
    settings: PreviewSettings,
    mockData: Record<string, unknown> = {}
  ): Promise<RenderResult> => {
    if (!engineRef.current) {
      throw new Error('Liquid engine not initialized');
    }

    setIsRendering(true);
    setError(null);

    try {
      // Strip Shopify-specific tags that LiquidJS doesn't support
      // Remove {% schema %}...{% endschema %} blocks
      let processedTemplate = template.replace(/\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/gi, '');

      // Extract CSS from {% style %}...{% endstyle %} blocks (Shopify syntax)
      const shopifyStyleMatch = processedTemplate.match(/\{%\s*style\s*%\}([\s\S]*?)\{%\s*endstyle\s*%\}/gi);
      const shopifyStyles = shopifyStyleMatch?.map(s =>
        s.replace(/\{%\s*style\s*%\}/gi, '').replace(/\{%\s*endstyle\s*%\}/gi, '')
      ).join('\n') || '';

      // Remove {% style %}...{% endstyle %} from template
      processedTemplate = processedTemplate.replace(/\{%\s*style\s*%\}[\s\S]*?\{%\s*endstyle\s*%\}/gi, '');

      // Also extract CSS from regular <style> tags
      const styleMatch = processedTemplate.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      const htmlStyles = styleMatch?.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n') || '';

      // Combine all CSS
      const css = [shopifyStyles, htmlStyles].filter(Boolean).join('\n');

      // Remove style tags from template for HTML-only rendering
      const htmlTemplate = processedTemplate.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

      // Build render context with section object
      const context = {
        ...mockData,
        section: {
          id: 'preview-section',
          settings
        },
        settings
      };

      // Pre-process the template to render any Liquid in the CSS
      const renderedCss = css ? await engineRef.current.parseAndRender(css, context) : '';
      const html = await engineRef.current.parseAndRender(htmlTemplate, context);

      return { html, css: renderedCss };
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
