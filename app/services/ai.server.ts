import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are an expert Shopify theme developer specializing in creating Liquid sections.

When generating a section, follow these strict requirements:

1. **Structure**: Generate a complete Liquid section file with:
   - Schema block (JSON)
   - Style block (scoped CSS)
   - HTML/Liquid markup

2. **CSS Scoping**: Always wrap styles in {% style %} tags and use #shopify-section-{{ section.id }} as the root selector to avoid conflicts.

3. **Schema**: Include settings for key properties (colors, spacing, text). Keep it simple (max 5-7 settings). Always include a preset.

4. **Best Practices**:
   - Use semantic HTML
   - Make it responsive (mobile-first)
   - Add Liquid translation filters for user-facing text: {{ 'key' | t }}
   - Never use global CSS resets
   - Prefix all custom classes with "ai-"

5. **Output Format**: Return ONLY the Liquid code. No explanations, no markdown code blocks.

Example structure:
{% schema %}
{
  "name": "Section Name",
  "settings": [...],
  "presets": [{"name": "Section Name"}]
}
{% endschema %}

{% style %}
#shopify-section-{{ section.id }} .ai-container {
  /* styles */
}
{% endstyle %}

<div class="ai-container">
  <!-- markup -->
</div>
`;

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateSection(prompt: string): Promise<string> {
    if (!this.genAI) {
      console.warn("GEMINI_API_KEY not set. Using mock response.");
      return this.getMockSection(prompt);
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        systemInstruction: SYSTEM_PROMPT
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return text.trim();
    } catch (error) {
      console.error("Gemini API error:", error);
      // Fallback to mock on error
      return this.getMockSection(prompt);
    }
  }

  private getMockSection(prompt: string): string {
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
  <p>{{ 'sections.ai_generated.description' | t: prompt: "${prompt}" }}</p>
</div>
    `.trim();
  }
}

export const aiService = new AIService();
