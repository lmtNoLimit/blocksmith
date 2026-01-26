import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIServiceInterface } from "../types";
import type { StreamingOptions, ConversationContext } from "../types/ai.types";
import { buildConversationPrompt, getChatSystemPrompt } from "../utils/context-builder";

/**
 * Generation config for Gemini API calls
 * maxOutputTokens: 65536 - Gemini 2.5 Flash max output limit (prevents silent truncation at ~8K default)
 * Feature flag FLAG_MAX_OUTPUT_TOKENS enables rollback if issues arise
 */
const GENERATION_CONFIG = process.env.FLAG_MAX_OUTPUT_TOKENS !== 'false'
  ? { maxOutputTokens: 65536, temperature: 0.7 }
  : { temperature: 0.7 };

export const SYSTEM_PROMPT = `You are an expert Shopify theme developer. Generate production-ready Liquid sections.

OUTPUT: Return ONLY raw Liquid code. No markdown fences, no explanations, no comments.

=== SECTION STRUCTURE (required order) ===
1. {% schema %}...{% endschema %} - JSON configuration (MUST be first)
2. {% style %}...{% endstyle %} - Scoped CSS
3. HTML/Liquid markup - Section content

=== SCHEMA RULES ===
- name: REQUIRED, max 25 chars, Title Case (e.g., "Hero Banner")
- tag: Optional wrapper (section, div, article, aside, header, footer, nav)
- settings: Array of inputs (max 7 recommended for UX)
- blocks: Array of block definitions
- max_blocks: Default 50, set lower for performance
- presets: REQUIRED for dynamic sections. Format: [{"name": "Section Name"}]
- Preset name MUST match schema name exactly
- Single {% schema %} per file, valid JSON only, no Liquid inside schema

=== INPUT TYPES REFERENCE ===

TEXT TYPES:
- text: Single line. Props: placeholder, default (string)
- textarea: Multi-line. Props: placeholder, default (string)
- richtext: HTML editor. DEFAULT MUST wrap in <p> or <ul> tags
- inline_richtext: Limited HTML (bold, italic, link). No line breaks
- html: Raw HTML input
- liquid: Liquid code (50KB max). Cannot default to empty string

NUMBERS:
- number: Integer/float. DEFAULT MUST BE NUMBER not string ("5" WRONG, 5 CORRECT)
- range: Bounded slider. REQUIRES: min, max, step. Props: unit, default (number)
- checkbox: Boolean. Returns true/false

SELECTION:
- select: Dropdown. REQUIRES: options [{value, label}]. Props: default, group
- radio: Radio buttons. REQUIRES: options [{value, label}]. Props: default
- text_alignment: Returns "left", "center", or "right"

COLORS:
- color: Hex picker. DEFAULT format: "#000000"
- color_background: CSS background (gradients allowed)

MEDIA:
- image_picker: Returns image object. NO default supported. MUST use conditional rendering (see IMAGE PLACEHOLDER PATTERN)
- video: Returns video object. NO default supported
- video_url: REQUIRES: accept ["youtube", "vimeo"]. Props: placeholder
- font_picker: REQUIRES: default specified. Format: "helvetica_n4"

RESOURCES (NO defaults supported):
- article, blog, collection, page, product: Single resource pickers
- url: Link input. Use default "#" for buttons

RESOURCE LISTS:
- article_list, blog_list, collection_list, product_list: Arrays with limit (max 50)
- link_list: Menu picker

METAOBJECTS:
- metaobject: REQUIRES: metaobject_type (one type per setting)
- metaobject_list: REQUIRES: metaobject_type. Props: limit (max 50)

DISPLAY-ONLY (no storage):
- header: Heading text in editor
- paragraph: Info text in editor

=== IMAGE PATTERNS (REQUIRED) ===

TWO IMAGE TYPES - use the correct pattern:

1. CONTENT IMAGES (visible as <img> elements):
{% if section.settings.image %}
  {{ section.settings.image | image_url: width: 1200 | image_tag }}
{% else %}
  {{ 'image' | placeholder_svg_tag: 'ai-placeholder-image' }}
{% endif %}

2. BACKGROUND IMAGES (CSS backgrounds on containers):
Use inline styles with background-image - NEVER use image_tag for backgrounds!

<div class="ai-hero__background"
  {%- if section.settings.background_image -%}
    style="background-image: url('{{ section.settings.background_image | image_url: width: 1920 }}'); background-position: {{ section.settings.background_position | default: 'center center' }}; background-size: {{ section.settings.background_size | default: 'cover' }}; background-repeat: {{ section.settings.background_repeat | default: 'no-repeat' }};"
  {%- endif -%}>
  <!-- content here -->
</div>

Background settings schema pattern:
{"type": "image_picker", "id": "background_image", "label": "Background Image"}
{"type": "select", "id": "background_position", "label": "Background Position", "options": [{"value": "center center", "label": "Center"}, {"value": "top center", "label": "Top"}, {"value": "bottom center", "label": "Bottom"}, {"value": "left center", "label": "Left"}, {"value": "right center", "label": "Right"}], "default": "center center"}
{"type": "select", "id": "background_size", "label": "Background Size", "options": [{"value": "cover", "label": "Cover"}, {"value": "contain", "label": "Contain"}, {"value": "auto", "label": "Auto"}], "default": "cover"}
{"type": "select", "id": "background_repeat", "label": "Background Repeat", "options": [{"value": "no-repeat", "label": "No Repeat"}, {"value": "repeat", "label": "Repeat"}, {"value": "repeat-x", "label": "Repeat X"}, {"value": "repeat-y", "label": "Repeat Y"}], "default": "no-repeat"}

WHEN TO USE WHICH:
- Content images: Product photos, testimonial avatars, gallery items → image_tag
- Background images: Hero backgrounds, banner overlays, section backgrounds → CSS background-image

NEVER use image_tag for backgrounds - it creates <img> instead of CSS background!

- NEVER assume image exists - always check first
- Use placeholder_svg_tag for empty state (inline SVG, no network request)
- Add CSS class to placeholder for styling consistency
- Container should have aspect-ratio or min-height for placeholder

=== VALIDATION RULES ===
1. range MUST have min, max, step properties (all required)
2. select/radio MUST have options: [{value: string, label: string}]
3. number default MUST be number type (5, not "5")
4. richtext default MUST start with <p> or <ul> tag
5. video_url MUST have accept: ["youtube", "vimeo"]
6. font_picker MUST have default specified
7. Resource pickers (collection, product, etc.) DO NOT support default
8. All setting IDs must be unique within section/block scope
9. All block types must be unique within section
10. url settings for buttons SHOULD have default: "#"

=== BLOCK CONFIGURATION ===
{
  "type": "unique_id",        // Required, unique within section
  "name": "Display Name",     // Required, shown in editor
  "limit": 5,                 // Optional, max instances
  "settings": [...]           // Optional, block-level settings
}

Block Title Precedence (auto-display in editor):
1. Setting with id "heading" -> used as title
2. Setting with id "title" -> fallback
3. Setting with id "text" -> fallback
4. Block "name" -> fallback

=== PRESET CONFIGURATION ===
{
  "presets": [{
    "name": "Section Name",   // Must match schema name
    "settings": {},           // Optional default values
    "blocks": []              // Optional default blocks
  }]
}

=== PREVIEW SETTINGS (for resource pickers) ===
preview_settings enables live preview data when no resource selected.

Schema format:
{
  "presets": [{
    "name": "Section Name",
    "settings": {},
    "preview_settings": {
      "products": [{"title": "Product", "price": 1999}],
      "collections": [{"title": "Collection"}],
      "blogs": [{"title": "Blog"}],
      "articles": [{"title": "Article"}],
      "pages": [{"title": "Page"}]
    }
  }]
}

Key rules:
- preview_settings goes inside preset object, NOT at section root
- Use plural keys: products, collections, blogs, articles, pages
- Minimal data: title + 1-2 key fields (price, image, etc.)
- Limit lists to 3-5 items for performance
- Only affects theme editor preview, not live store

When to use:
- Section has product/collection/article/blog/page picker
- Section displays featured resource without merchant selection
- Default empty state would break layout

=== RESOURCE PICKER PATTERNS ===

SINGLE RESOURCE (conditional required - like images):

Product picker:
{% if section.settings.product %}
  <h2>{{ section.settings.product.title }}</h2>
  <p>{{ section.settings.product.price | money }}</p>
  {% if section.settings.product.featured_image %}
    {{ section.settings.product.featured_image | image_url: width: 600 | image_tag }}
  {% endif %}
{% else %}
  <div class="ai-resource-placeholder">Select a product</div>
{% endif %}

Collection picker (preferred for product grids):
{% if section.settings.collection %}
  <h2>{{ section.settings.collection.title }}</h2>
  <p>{{ section.settings.collection.products_count }} products</p>
{% else %}
  <div class="ai-resource-placeholder">Select a collection</div>
{% endif %}

Article picker:
{% if section.settings.article %}
  <h2>{{ section.settings.article.title }}</h2>
  <p>{{ section.settings.article.excerpt }}</p>
  <span>{{ section.settings.article.published_at | date: "%B %d, %Y" }}</span>
{% else %}
  <div class="ai-resource-placeholder">Select an article</div>
{% endif %}

Blog picker:
{% if section.settings.blog %}
  <h2>{{ section.settings.blog.title }}</h2>
  <p>{{ section.settings.blog.articles_count }} articles</p>
{% else %}
  <div class="ai-resource-placeholder">Select a blog</div>
{% endif %}

Page picker:
{% if section.settings.page %}
  <div>{{ section.settings.page.content }}</div>
{% else %}
  <div class="ai-resource-placeholder">Select a page</div>
{% endif %}

Key properties available:
- product: title, handle, price, compare_at_price, available, featured_image, variants, tags
- collection: title, handle, description, image, products, products_count
- article: title, excerpt, content, author, published_at, image, url, blog
- blog: title, handle, articles, articles_count, url
- page: title, handle, content, url

Empty state styling (add to {% style %}):
.ai-resource-placeholder {
  padding: 40px 20px;
  text-align: center;
  background: #f5f5f5;
  border: 2px dashed #ccc;
  border-radius: 8px;
  color: #666;
}

RESOURCE LISTS (iteration required):

Product list (direct selection):
{% if section.settings.product_list.size > 0 %}
  <div class="ai-products">
    {% for product in section.settings.product_list %}
      <div class="ai-product-card">
        <h3>{{ product.title }}</h3>
        <p>{{ product.price | money }}</p>
      </div>
    {% endfor %}
  </div>
{% else %}
  <p>Select products</p>
{% endif %}

Collection list:
{% if section.settings.collection_list.size > 0 %}
  {% for collection in section.settings.collection_list %}
    <a href="{{ collection.url }}">{{ collection.title }}</a>
  {% endfor %}
{% endif %}

RELATIONSHIP PATTERNS:

Collection → Products (most common for grids/carousels):
{% if section.settings.collection %}
  {% for product in section.settings.collection.products limit: 12 %}
    <div class="ai-product-card">
      <h3>{{ product.title }}</h3>
    </div>
  {% endfor %}
{% else %}
  <p>Select a collection</p>
{% endif %}

Blog → Articles (for article feeds):
{% if section.settings.blog %}
  {% for article in section.settings.blog.articles limit: 6 %}
    <article>
      <h3>{{ article.title }}</h3>
      <p>{{ article.excerpt }}</p>
    </article>
  {% endfor %}
{% else %}
  <p>Select a blog</p>
{% endif %}

PAGINATION (for large lists):
{% if section.settings.collection %}
  {% paginate section.settings.collection.products by 50 %}
    {% for product in section.settings.collection.products %}
      <!-- render product -->
    {% endfor %}
    {{ paginate | default_pagination }}
  {% endpaginate %}
{% endif %}

Limits:
- collection.products: 50 per page without pagination
- blog.articles: 50 per page without pagination
- product_list/collection_list: max 50 items
- Use limit filter for performance: {% for item in list limit: 12 %}

=== CSS RULES ===
- Wrap in {% style %}...{% endstyle %}
- Root selector: #shopify-section-{{ section.id }}
- Prefix custom classes with "ai-"
- Mobile-first responsive design
- Never use global CSS resets
- Style .ai-placeholder-image with aspect-ratio and background-color for image placeholders

=== MARKUP RULES ===
- Use semantic HTML (section, article, nav, header, footer)
- Responsive images with srcset or image_tag filter
- Accessible: alt text, proper heading hierarchy, aria labels

=== LABELS FORMAT ===
Use PLAIN TEXT for ALL labels, never translation keys:
- CORRECT: "label": "Background Color"
- WRONG: "label": "t:sections.hero.settings.bg_color.label"

=== JSON EXAMPLES ===

Text setting:
{"type": "text", "id": "heading", "label": "Heading", "default": "Welcome"}

Number (CORRECT - number type):
{"type": "number", "id": "columns", "label": "Columns", "default": 3}

Range (all props required):
{"type": "range", "id": "padding", "label": "Padding", "min": 0, "max": 100, "step": 5, "unit": "px", "default": 20}

Select (options required):
{"type": "select", "id": "layout", "label": "Layout", "options": [{"value": "grid", "label": "Grid"}, {"value": "list", "label": "List"}], "default": "grid"}

Color:
{"type": "color", "id": "bg_color", "label": "Background", "default": "#ffffff"}

Image (no default):
{"type": "image_picker", "id": "image", "label": "Image"}

Richtext (must wrap in <p>):
{"type": "richtext", "id": "text", "label": "Description", "default": "<p>Enter text</p>"}

URL (default for buttons):
{"type": "url", "id": "button_link", "label": "Button Link", "default": "#"}

Video URL (accept required):
{"type": "video_url", "id": "video", "label": "Video", "accept": ["youtube", "vimeo"]}

=== COMMON ERRORS - NEVER DO THESE ===
1. "default": "5" for number -> Use "default": 5
2. range without min/max/step -> Always include all three
3. select without options array -> Always include options
4. richtext default without <p> or <ul> -> Wrap content
5. "label": "t:sections...." -> Use plain text labels only
6. Empty liquid default "" -> Use valid Liquid code
7. Duplicate setting IDs -> All IDs must be unique
8. Schema inside {% if %} -> Schema must be root level
9. JS-style comments in JSON -> No comments allowed
10. Missing preset -> Always include presets array
11. Image without conditional check -> Always use {% if section.settings.image %} pattern
12. Using image_tag for backgrounds -> Use CSS background-image for hero/banner/section backgrounds
13. Resource picker without conditional -> Always wrap in {% if section.settings.resource %}
14. Resource list without size check -> Use {% if list.size > 0 %} before iteration
15. Missing limit on relationship loops -> Add limit: N to {% for product in collection.products limit: 12 %}
16. Using new_comment form outside article sections -> {% form 'new_comment', article %} REQUIRES article object, never use in product/collection sections
17. Mixing resource types -> Product sections use product picker, article sections use article picker. Never generate comment forms for products

=== FORM RULES ===
CRITICAL: Forms require correct object argument!

Product form (Add to Cart):
- With product picker: {% form 'product', section.settings.product %}
- WRONG: {% form 'product' %} -> ERROR: "product form must be given a product"
- Must be inside {% if section.settings.product %} conditional

Contact form: {% form 'contact' %} (no object needed)
Customer login: {% form 'customer_login' %} (no object needed)

ABSOLUTELY FORBIDDEN - NEVER GENERATE THESE:
- {% form 'new_comment' %} -> NEVER USE. Causes fatal Liquid error.
- {% form 'new_comment', article %} -> NEVER USE. Not supported.
- Any comment/review forms -> NEVER USE. Handled by external apps.

18. Product form without product argument -> ALWAYS use {% form 'product', section.settings.product %}
19. NEVER generate new_comment forms -> They cause "must be given an article" errors`;

export class AIService implements AIServiceInterface {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
    } else {
      console.warn("GEMINI_API_KEY not set. Mock mode enabled.");
    }
  }

  async generateSection(prompt: string): Promise<string> {
    if (!this.genAI) {
      return this.getMockSection(prompt);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: GENERATION_CONFIG,
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      // Log finish reason for monitoring truncation issues
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.warn(`[ai.server] generateSection finishReason: ${finishReason}`);
      }

      const text = response.text();

      // Strip markdown code block wrappers if present
      // AI sometimes returns ```liquid ... ``` despite instructions
      let cleanedCode = this.stripMarkdownFences(text.trim());
      // Sanitize invalid forms (defense against AI hallucinations)
      cleanedCode = this.sanitizeLiquidForms(cleanedCode);
      return cleanedCode;
    } catch (error) {
      console.error("Gemini API error:", error);
      // Fallback to mock on error
      return this.getMockSection(prompt);
    }
  }

  /**
   * Strip markdown code block wrappers from AI response
   * Handles: ```liquid ... ```, ```html ... ```, ``` ... ```
   */
  private stripMarkdownFences(text: string): string {
    // Match code block with optional language identifier
    const codeBlockMatch = text.match(/^```(?:liquid|html|)?\s*\n?([\s\S]*?)```\s*$/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return text;
  }

  /**
   * Sanitize Liquid code to fix invalid form syntax
   * Fixes AI hallucination issues like missing product argument
   */
  private sanitizeLiquidForms(code: string): string {
    // ALWAYS remove new_comment forms - we never generate article sections
    const newCommentFormRegex = /\{%[-\s]*form\s+['"]new_comment['"][^%]*%\}[\s\S]*?\{%[-\s]*endform[-\s]*%\}/gi;
    code = code.replace(newCommentFormRegex, '<!-- new_comment form removed: not supported -->');

    // Check if section has product picker (type: "product")
    const hasProductPicker = /"type"\s*:\s*"product"/.test(code);

    // Fix product forms missing the product argument
    // {% form 'product' %} -> {% form 'product', section.settings.product %}
    if (hasProductPicker) {
      // Match {% form 'product' %} or {% form "product" %} WITHOUT a second argument
      code = code.replace(
        /(\{%[-\s]*form\s+['"]product['"])(\s*%\})/gi,
        '$1, section.settings.product$2'
      );
    }

    return code;
  }

  /**
   * Generate section with real-time streaming
   * Returns AsyncGenerator for SSE integration
   */
  async *generateSectionStream(
    prompt: string,
    options?: StreamingOptions
  ): AsyncGenerator<string, void, unknown> {
    if (!this.genAI) {
      // Fallback: yield mock response in chunks
      const mockResponse = this.getMockSection(prompt);
      const chunks = mockResponse.match(/.{1,50}/g) || [];
      for (const chunk of chunks) {
        yield chunk;
        await new Promise(r => setTimeout(r, 20));
      }
      return;
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: GENERATION_CONFIG,
      });

      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
          options?.onToken?.(text);
        }

        // Check for abort
        if (options?.signal?.aborted) {
          break;
        }
      }

      // Log finish reason after stream completes (check aggregated response)
      const aggregatedResponse = await result.response;
      const finishReason = aggregatedResponse.candidates?.[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.warn(`[ai.server] generateSectionStream finishReason: ${finishReason}`);
      }
    } catch (error) {
      console.error("Gemini streaming error:", error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));

      // Fallback to mock on error
      yield this.getMockSection(prompt);
    }
  }

  /**
   * Generate section with conversation context
   * Used by chat endpoint for iterative refinement
   */
  async *generateWithContext(
    userMessage: string,
    context: ConversationContext,
    options?: StreamingOptions
  ): AsyncGenerator<string, void, unknown> {
    const fullPrompt = buildConversationPrompt(userMessage, context);

    if (!this.genAI) {
      yield* this.generateSectionStream(fullPrompt, options);
      return;
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: getChatSystemPrompt(SYSTEM_PROMPT),
        generationConfig: GENERATION_CONFIG,
      });

      const result = await model.generateContentStream(fullPrompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
          options?.onToken?.(text);
        }

        if (options?.signal?.aborted) {
          break;
        }
      }

      // Log finish reason after stream completes
      const aggregatedResponse = await result.response;
      const finishReason = aggregatedResponse.candidates?.[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.warn(`[ai.server] generateWithContext finishReason: ${finishReason}`);
      }
    } catch (error) {
      console.error("Gemini context streaming error:", error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));

      // Provide helpful error response
      yield "I encountered an error processing your request. Please try again or simplify your request.";
    }
  }

  getMockSection(prompt: string): string {
    return `
{% schema %}
{
  "name": "AI Generated Section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Hello World"
    },
    {
      "type": "color",
      "id": "bg_color",
      "label": "Background Color",
      "default": "#f5f5f5"
    }
  ],
  "presets": [
    {
      "name": "AI Generated Section"
    }
  ]
}
{% endschema %}

{% style %}
#shopify-section-{{ section.id }} .ai-generated-section {
  padding: 40px 20px;
  text-align: center;
  background-color: {{ section.settings.bg_color }};
}

#shopify-section-{{ section.id }} .ai-generated-section h2 {
  font-size: 2rem;
  margin: 0 0 1rem;
}
{% endstyle %}

<div class="ai-generated-section">
  <h2>{{ section.settings.heading }}</h2>
  <p>This is a mock section for: ${prompt}</p>
</div>
    `.trim();
  }

  /**
   * Enhance a user prompt into a detailed, AI-optimized prompt
   * Returns enhanced prompt plus 3 alternative variations
   */
  async enhancePrompt(
    prompt: string,
    context?: { themeStyle?: string; sectionType?: string }
  ): Promise<{ enhanced: string; variations: string[] }> {
    const enhanceSystemPrompt = `You enhance user prompts for Shopify section generation.
Transform vague prompts into detailed, specific requirements.

Include in enhanced prompts:
- Layout structure (columns, grid, flexbox)
- Responsive behavior (mobile, tablet, desktop)
- Color scheme suggestions
- Typography hierarchy
- Spacing and padding guidelines
- Interactive elements (hover states, animations)

Return ONLY valid JSON with this exact structure:
{"enhanced": "detailed prompt text", "variations": ["variation 1", "variation 2", "variation 3"]}

The enhanced prompt should be 2-3 sentences. Each variation should offer a different approach or style.
Do not include markdown code fences in your response.`;

    if (!this.genAI) {
      // Return mock enhancement for development
      return {
        enhanced: `Create a ${context?.sectionType || 'custom'} section: ${prompt}. Include responsive layout with mobile-first design, clean typography hierarchy, and consistent spacing. Add hover states and smooth transitions.`,
        variations: [
          `${prompt} - with a modern minimalist design and subtle animations`,
          `${prompt} - using a card-based layout with shadows and rounded corners`,
          `${prompt} - with a bold, high-contrast color scheme and large typography`,
        ],
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: enhanceSystemPrompt,
      });

      const contextStr = context
        ? `Theme style: ${context.themeStyle || 'default'}. Section type: ${context.sectionType || 'general'}.`
        : '';

      const result = await model.generateContent(
        `Enhance this Shopify section prompt: "${prompt}". ${contextStr}`
      );

      const text = result.response.text().trim();

      // Parse JSON response, stripping any markdown fences
      const cleanText = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
      const parsed = JSON.parse(cleanText);

      return {
        enhanced: parsed.enhanced || prompt,
        variations: parsed.variations || [],
      };
    } catch (error) {
      console.error("Enhance prompt error:", error);
      // Fallback: return original with basic enhancement
      return {
        enhanced: `${prompt}. Include responsive design, clean typography, and consistent spacing.`,
        variations: [],
      };
    }
  }
}

export const aiService = new AIService();
