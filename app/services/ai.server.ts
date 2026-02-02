import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIServiceInterface } from "../types";
import type { StreamingOptions, ConversationContext, ExtendedStreamingOptions } from "../types/ai.types";
import { buildConversationPrompt, getChatSystemPrompt, buildCROEnhancedPrompt } from "../utils/context-builder";
import { parseCROReasoning, extractCodeWithoutReasoning, type CROReasoning } from "../utils/cro-reasoning-parser";
import type { CRORecipe } from "@prisma/client";
import type { RecipeContext } from "../services/cro-recipe.server";

/**
 * Generation config for Gemini API calls
 * maxOutputTokens: 65536 - Gemini 2.5 Flash max output limit (prevents silent truncation at ~8K default)
 * temperature: 0.3 - Lower for more deterministic, consistent Liquid output
 * Feature flag FLAG_MAX_OUTPUT_TOKENS enables rollback if issues arise
 */
const GENERATION_CONFIG = process.env.FLAG_MAX_OUTPUT_TOKENS !== 'false'
  ? { maxOutputTokens: 65536, temperature: 0.3 }
  : { temperature: 0.3 };

/**
 * System prompt for Shopify Liquid section generation
 * Optimized for raw output with markers - no markdown fences
 * ~100 lines with essential schema/CSS/form rules
 */
export const SYSTEM_PROMPT = `You are a Shopify Liquid code generator. Generate production-ready sections.

OUTPUT FORMAT (CRITICAL):
- Output ONLY raw Liquid code
- NO markdown fences (\`\`\`), NO backticks, NO explanations
- NO text before or after code
- Wrap output exactly: ===START LIQUID=== [code] ===END LIQUID===

STRUCTURE (required order):
1. {% schema %}...{% endschema %} - JSON config with name, settings, presets
2. {% style %}...{% endstyle %} - Scoped CSS with #shopify-section-{{ section.id }}
3. HTML/Liquid markup

EXAMPLE OUTPUT:
===START LIQUID===
{% schema %}
{
  "name": "Hero Banner",
  "settings": [
    {"type": "text", "id": "heading", "label": "Heading", "default": "Welcome"},
    {"type": "color", "id": "bg_color", "label": "Background", "default": "#f5f5f5"}
  ],
  "presets": [{"name": "Hero Banner"}]
}
{% endschema %}

{% style %}
#shopify-section-{{ section.id }} .ai-hero { padding: 40px; text-align: center; background: {{ section.settings.bg_color }}; }
#shopify-section-{{ section.id }} .ai-hero h1 { font-size: 2.5rem; margin: 0; }
{% endstyle %}

<div class="ai-hero">
  <h1>{{ section.settings.heading }}</h1>
</div>
===END LIQUID===

SCHEMA RULES:
- name: Required, max 25 chars, Title Case
- presets: Required for dynamic sections, name must match schema name
- Settings types: text, number, color, image_picker, select, range, richtext, url, checkbox
- number default must be number type (5 not "5")
- range requires min, max, step (all three required)
- select requires options array: [{"value": "x", "label": "X"}]
- image_picker has NO default - always use conditional: {% if section.settings.image %}
- richtext default must wrap in <p> tags
- url for buttons should have default: "#"
- All IDs must be unique within section

IMAGE PATTERNS:
Content images:
{% if section.settings.image %}
  {{ section.settings.image | image_url: width: 1200 | image_tag }}
{% else %}
  {{ 'image' | placeholder_svg_tag: 'ai-placeholder-image' }}
{% endif %}

Background images (use CSS, NOT image_tag):
<div class="ai-hero" {% if section.settings.bg_image %}style="background-image: url('{{ section.settings.bg_image | image_url: width: 1920 }}');"{% endif %}>

CSS RULES:
- Wrap in {% style %}...{% endstyle %}
- Prefix all selectors with #shopify-section-{{ section.id }}
- Prefix custom classes with "ai-"
- Mobile-first responsive design

FORM RULES:
- Product form: {% form 'product', section.settings.product %} (requires product argument)
- Contact form: {% form 'contact' %} (no argument)
- NEVER use {% form 'new_comment' %} - causes fatal errors

LABELS:
- Use plain text only: "label": "Background Color"
- NEVER use translation keys: "label": "t:sections..."

DO NOT:
- Add markdown code fences (\`\`\`liquid or \`\`\`)
- Include explanatory text before or after code
- Output partial sections (always include schema + style + markup)
- Use translation keys for labels
- Assume images exist without conditional check`;

/**
 * CRO Reasoning Instructions
 * Appended to SYSTEM_PROMPT when generating with a CRO recipe
 * Instructs AI to include structured reasoning AFTER the end marker
 */
export const CRO_REASONING_INSTRUCTIONS = `

=== CRO REASONING OUTPUT ===

After the ===END LIQUID=== marker, include a CRO reasoning block explaining your design decisions.

FORMAT:
===START LIQUID===
[Your Liquid code here]
===END LIQUID===

<!-- CRO_REASONING_START -->
{
  "goal": "[The conversion goal]",
  "decisions": [
    {
      "element": "[Design element]",
      "choice": "[What you implemented]",
      "principle": "[CRO principle applied]",
      "explanation": "[Why this works - 1-2 sentences]",
      "source": "[Reference, e.g., 'Nielsen Norman Group']"
    }
  ],
  "tip": "[A/B testing suggestion]"
}
<!-- CRO_REASONING_END -->

REQUIREMENTS:
- 3-5 design decisions addressing the conversion goal
- Each decision references a CRO principle
- JSON must be valid and parseable

CRO PRINCIPLES: Urgency, Scarcity, Social Proof, Authority, Reciprocity, Visual Hierarchy, F-Pattern, Contrast, Whitespace, Risk Reversal, Anchoring, Loss Aversion`;

/**
 * Options for CRO-aware generation
 */
export interface CROGenerationOptions {
  recipe?: CRORecipe;
  recipeContext?: RecipeContext;
}

/**
 * Result from CRO-aware generation
 */
export interface CROGenerationResult {
  code: string;
  reasoning: CROReasoning | null;
  rawResponse: string;
}

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

  /**
   * Get system prompt with optional CRO reasoning instructions
   * @param includeCROInstructions - Whether to append CRO reasoning instructions
   */
  getSystemPrompt(includeCROInstructions = false): string {
    if (includeCROInstructions) {
      return SYSTEM_PROMPT + CRO_REASONING_INSTRUCTIONS;
    }
    return SYSTEM_PROMPT;
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

      // Extract code from markers and sanitize
      let cleanedCode = this.extractCodeFromMarkers(text.trim());
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
   * Extract Liquid code from marker-wrapped output
   * Primary: ===START LIQUID=== ... ===END LIQUID===
   * Fallback: Strip markdown fences if AI doesn't follow instructions
   */
  private extractCodeFromMarkers(text: string): string {
    // Primary: Extract from markers
    const markerMatch = text.match(/===START LIQUID===\s*([\s\S]*?)\s*===END LIQUID===/);
    if (markerMatch) {
      return markerMatch[1].trim();
    }

    // Fallback: Strip markdown fences (defense against AI not following instructions)
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
   * Extended options allow accessing finishReason for auto-continuation
   */
  async *generateWithContext(
    userMessage: string,
    context: ConversationContext,
    options?: ExtendedStreamingOptions
  ): AsyncGenerator<string, void, unknown> {
    const fullPrompt = buildConversationPrompt(userMessage, context);

    if (!this.genAI) {
      yield* this.generateSectionStream(fullPrompt, options);
      options?.onFinishReason?.('STOP'); // Mock always completes
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

      // Get finish reason and expose via callback for auto-continuation
      const aggregatedResponse = await result.response;
      const finishReason = aggregatedResponse.candidates?.[0]?.finishReason;

      // Log non-STOP finish reasons for monitoring
      if (finishReason && finishReason !== 'STOP') {
        console.warn(`[ai.server] generateWithContext finishReason: ${finishReason}`);
      }

      // Expose finish reason to caller for continuation logic
      options?.onFinishReason?.(finishReason);
    } catch (error) {
      console.error("Gemini context streaming error:", error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));

      // Provide helpful error response
      yield "I encountered an error processing your request. Please try again or simplify your request.";
    }
  }

  /**
   * Generate section with CRO context and reasoning
   * Used when generating from CRO recipes
   * Includes CRO reasoning instructions in system prompt
   */
  async *generateWithCROContext(
    userMessage: string,
    context: ConversationContext,
    croOptions: CROGenerationOptions,
    options?: ExtendedStreamingOptions
  ): AsyncGenerator<string, void, unknown> {
    // Build enhanced prompt with CRO context
    let fullPrompt = userMessage;
    if (croOptions.recipe && croOptions.recipeContext) {
      fullPrompt = buildCROEnhancedPrompt(croOptions.recipe, croOptions.recipeContext);
    }

    // Add conversation context if available
    fullPrompt = buildConversationPrompt(fullPrompt, context);

    if (!this.genAI) {
      // Mock mode: yield mock with CRO reasoning
      const mockResponse = this.getMockCROSection(croOptions.recipe?.businessProblem || 'Conversion Optimization');
      const chunks = mockResponse.match(/.{1,50}/g) || [];
      for (const chunk of chunks) {
        yield chunk;
        await new Promise(r => setTimeout(r, 20));
      }
      options?.onFinishReason?.('STOP');
      return;
    }

    try {
      // Use system prompt with CRO instructions appended
      const systemPrompt = this.getSystemPrompt(true);

      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: getChatSystemPrompt(systemPrompt),
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

      // Get finish reason
      const aggregatedResponse = await result.response;
      const finishReason = aggregatedResponse.candidates?.[0]?.finishReason;

      if (finishReason && finishReason !== 'STOP') {
        console.warn(`[ai.server] generateWithCROContext finishReason: ${finishReason}`);
      }

      options?.onFinishReason?.(finishReason);
    } catch (error) {
      console.error("Gemini CRO streaming error:", error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
      yield "I encountered an error processing your request. Please try again.";
    }
  }

  /**
   * Parse CRO reasoning from completed response
   * Utility method to extract reasoning after streaming completes
   */
  parseCROReasoning(response: string): CROReasoning | null {
    return parseCROReasoning(response);
  }

  /**
   * Extract code without reasoning block
   * Use when storing section code separately from reasoning
   */
  extractCodeOnly(response: string): string {
    return extractCodeWithoutReasoning(response);
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
   * Mock section with CRO reasoning for development/testing
   */
  getMockCROSection(goal: string): string {
    return `
{% schema %}
{
  "name": "CRO Optimized Section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Limited Time Offer"
    },
    {
      "type": "text",
      "id": "cta_text",
      "label": "CTA Button Text",
      "default": "Shop Now"
    },
    {
      "type": "url",
      "id": "cta_link",
      "label": "CTA Link",
      "default": "#"
    }
  ],
  "presets": [
    {
      "name": "CRO Optimized Section"
    }
  ]
}
{% endschema %}

{% style %}
#shopify-section-{{ section.id }} .ai-cro-section {
  padding: 60px 20px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

#shopify-section-{{ section.id }} .ai-cro-section h2 {
  font-size: 2.5rem;
  margin: 0 0 1.5rem;
  font-weight: 700;
}

#shopify-section-{{ section.id }} .ai-cro-section .cta-btn {
  display: inline-block;
  padding: 16px 32px;
  background: #fff;
  color: #764ba2;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  transition: transform 0.2s;
}

#shopify-section-{{ section.id }} .ai-cro-section .cta-btn:hover {
  transform: scale(1.05);
}
{% endstyle %}

<div class="ai-cro-section">
  <h2>{{ section.settings.heading }}</h2>
  <a href="{{ section.settings.cta_link }}" class="cta-btn">{{ section.settings.cta_text }}</a>
</div>

<!-- CRO_REASONING_START -->
{
  "goal": "${goal}",
  "decisions": [
    {
      "element": "Color Scheme",
      "choice": "High-contrast gradient background with white CTA",
      "principle": "Visual Hierarchy",
      "explanation": "The gradient creates visual interest while the white button stands out as the clear action point.",
      "source": "CRO Best Practices"
    },
    {
      "element": "CTA Design",
      "choice": "Large padding, prominent placement, hover animation",
      "principle": "Contrast",
      "explanation": "Oversized button with animation draws attention and encourages clicks.",
      "source": "Baymard Institute"
    },
    {
      "element": "Heading Style",
      "choice": "Bold, large typography above CTA",
      "principle": "F-Pattern",
      "explanation": "Users scan from top-left; placing value proposition above CTA follows natural eye movement.",
      "source": "Nielsen Norman Group"
    }
  ],
  "tip": "Test different CTA colors (orange, green) against the current white to find what converts best for your audience."
}
<!-- CRO_REASONING_END -->
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
