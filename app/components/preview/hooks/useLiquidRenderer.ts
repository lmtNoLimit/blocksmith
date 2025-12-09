import { useState, useCallback, useRef, useEffect } from 'react';
import { Liquid, TopLevelToken, Context, Template } from 'liquidjs';
import type { PreviewSettings } from '../types';
import type { BlockInstance } from '../schema/SchemaTypes';
import { BlockDrop } from '../drops';

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

    engine.registerFilter('image_url', (image: unknown, options?: { width?: number; height?: number } | string) => {
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

    // Color filters (stubs)
    engine.registerFilter('color_to_rgb', (color: string) => color);
    engine.registerFilter('color_to_hsl', (color: string) => color);
    engine.registerFilter('color_modify', (color: string) => color);
    engine.registerFilter('color_lighten', (color: string) => color);
    engine.registerFilter('color_darken', (color: string) => color);

    // Register Shopify-specific custom tags for preview support
    // These tags are not in standard Liquid but required by Shopify sections

    // Form tags: {% form 'type', ...params %} ... {% endform %}
    engine.registerTag('form', {
      parse: function (tagToken: { args: string; getText: () => string }, remainTokens: TopLevelToken[]) {
        this.args = tagToken.args;
        this.tpl = [];

        // Collect tokens until {% endform %}
        const stream = this.liquid.parser.parseStream(remainTokens);
        stream
          .on('tag:endform', () => stream.stop())
          .on('template', (tpl: Template | undefined) => {
            if (tpl) this.tpl.push(tpl);
          })
          .on('end', () => {
            throw new Error(`tag ${tagToken.getText()} not closed`);
          });
        stream.start();
      },
      render: async function (ctx: Context) {
        // Evaluate form type parameter (extract first quoted string)
        let formType = 'generic';
        if (this.args) {
          const match = this.args.match(/['"]([^'"]+)['"]/);
          formType = match ? match[1] : 'generic';
        }

        // Create form context variable (Shopify provides this inside {% form %} blocks)
        const formContext = {
          errors: [],
          posted_successfully: false,
          id: `form-${formType}-preview`,
          // toString returns empty string to prevent [object Object] output
          toString: () => '',
          valueOf: () => ''
        };

        // Push form variable to context
        ctx.push({ form: formContext });

        // Render inner template content
        const bodyHtml = await this.liquid.renderer.renderTemplates(this.tpl, ctx);

        // Pop the form context
        ctx.pop();

        // Return form HTML wrapper
        return `<form method="post" class="shopify-form shopify-form-${formType}" data-preview="true">\n${bodyHtml}\n</form>`;
      },
    });

    engine.registerTag('endform', {
      parse: function () {
        // Empty parse - handled by form tag
      },
      render: function () {
        return Promise.resolve('');
      },
    });

    // Paginate tags: {% paginate collection.products by 5 %} ... {% endpaginate %}
    engine.registerTag('paginate', {
      parse: function (tagToken: { args: string; getText: () => string }, remainTokens: TopLevelToken[]) {
        this.args = tagToken.args;
        this.tpl = [];

        const stream = this.liquid.parser.parseStream(remainTokens);
        stream
          .on('tag:endpaginate', () => stream.stop())
          .on('template', (tpl: Template | undefined) => {
            if (tpl) this.tpl.push(tpl);
          })
          .on('end', () => {
            throw new Error(`tag ${tagToken.getText()} not closed`);
          });
        stream.start();
      },
      render: async function (ctx: Context) {
        // Render paginated content (preview shows first page only)
        const bodyHtml = await this.liquid.renderer.renderTemplates(this.tpl, ctx);
        return `<!-- Paginated section (preview shows first page) -->\n${bodyHtml}\n<!-- End pagination -->`;
      },
    });

    engine.registerTag('endpaginate', {
      parse: function () {},
      render: function () {
        return Promise.resolve('');
      },
    });

    // Section tag: {% section 'header' %}
    engine.registerTag('section', {
      parse: function (tagToken: { args: string }) {
        this.args = tagToken.args;
      },
      render: async function () {
        // Extract section name from args
        let sectionName = 'unknown';
        if (this.args) {
          const match = this.args.match(/['"]([^'"]+)['"]/);
          sectionName = match ? match[1] : 'unknown';
        }
        return `<!-- Section: ${sectionName} (not rendered in preview) -->`;
      },
    });

    // Render tag: {% render 'snippet-name', var: value %}
    engine.registerTag('render', {
      parse: function (tagToken: { args: string }) {
        this.args = tagToken.args;
      },
      render: async function () {
        // Extract snippet name from args
        let snippetName = 'unknown';
        if (this.args) {
          const match = this.args.match(/['"]([^'"]+)['"]/);
          snippetName = match ? match[1] : 'unknown';
        }
        return `<!-- Render snippet: ${snippetName} (not loaded in preview) -->`;
      },
    });

    // Comment tags: {% comment %} ... {% endcomment %}
    engine.registerTag('comment', {
      parse: function (tagToken: { getText: () => string }, remainTokens: TopLevelToken[]) {
        const stream = this.liquid.parser.parseStream(remainTokens);
        stream
          .on('tag:endcomment', () => stream.stop())
          .on('end', () => {
            throw new Error(`tag ${tagToken.getText()} not closed`);
          });
        stream.start();
      },
      render: function () {
        // Comments output nothing
        return Promise.resolve('');
      },
    });

    engine.registerTag('endcomment', {
      parse: function () {},
      render: function () {
        return Promise.resolve('');
      },
    });

    // Stylesheet tag: {% stylesheet %} ... {% endstylesheet %}
    engine.registerTag('stylesheet', {
      parse: function (tagToken: { getText: () => string }, remainTokens: TopLevelToken[]) {
        this.tpl = [];
        const stream = this.liquid.parser.parseStream(remainTokens);
        stream
          .on('tag:endstylesheet', () => stream.stop())
          .on('template', (tpl: Template | undefined) => {
            if (tpl) this.tpl.push(tpl);
          })
          .on('end', () => {
            throw new Error(`tag ${tagToken.getText()} not closed`);
          });
        stream.start();
      },
      render: async function (ctx: Context) {
        const cssContent = await this.liquid.renderer.renderTemplates(this.tpl, ctx);
        return `<style>${cssContent}</style>`;
      },
    });

    engine.registerTag('endstylesheet', {
      parse: function () {},
      render: function () {
        return Promise.resolve('');
      },
    });

    // Javascript tag: {% javascript %} ... {% endjavascript %}
    engine.registerTag('javascript', {
      parse: function (tagToken: { getText: () => string }, remainTokens: TopLevelToken[]) {
        this.tpl = [];
        const stream = this.liquid.parser.parseStream(remainTokens);
        stream
          .on('tag:endjavascript', () => stream.stop())
          .on('template', (tpl: Template | undefined) => {
            if (tpl) this.tpl.push(tpl);
          })
          .on('end', () => {
            throw new Error(`tag ${tagToken.getText()} not closed`);
          });
        stream.start();
      },
      render: async function (ctx: Context) {
        const jsContent = await this.liquid.renderer.renderTemplates(this.tpl, ctx);
        return `<script>${jsContent}</script>`;
      },
    });

    engine.registerTag('endjavascript', {
      parse: function () {},
      render: function () {
        return Promise.resolve('');
      },
    });
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
