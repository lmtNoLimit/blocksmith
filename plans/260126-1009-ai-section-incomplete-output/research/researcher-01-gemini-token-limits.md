# Gemini 2.5 Flash API Token Limits Research

## 1. Maximum Output Token Limit

**Gemini 2.5 Flash: 65,536 tokens maximum output**

- Input context window: 1,048,576 tokens (1M tokens)
- Maximum tokens per run (prompt + output): 128,000 tokens
- Hard limit: 65,535 tokens for output alone

Sources: [Google AI Models](https://ai.google.dev/gemini-api/docs/models), [DataStudios Analysis](https://www.datastudios.org/post/google-gemini-2-5-flash-context-window-token-limits)

---

## 2. Setting maxOutputTokens in Node.js SDK

### Google Generative AI SDK (@google/genai)

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    maxOutputTokens: 8000,
    temperature: 0.8,
    topP: 0.95,
  }
});

const response = await model.generateContent("Your prompt here");
```

### Vertex AI SDK (@google-cloud/vertexai)

```javascript
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({ project: 'your-project', location: 'us-central1' });
const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

const response = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: 'Your prompt' }] }],
  generationConfig: {
    maxOutputTokens: 8000
  }
});
```

Sources: [Google GenAI Documentation](https://googleapis.github.io/js-genai/), [Vertex AI Docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters)

---

## 3. Default Behavior (When maxOutputTokens Not Specified)

**Default: Uses model-specific output token limit**

When `maxOutputTokens` is not explicitly set:
- API defaults to model's predefined maximum output limit
- For Gemini 2.5 Flash: defaults to 65,536 tokens
- No universal fallback value; each model defines its own default

⚠️ **Caveat**: If not specified, the model may output up to its maximum, which could be inefficient or unexpected. **Best practice: Always explicitly set maxOutputTokens.**

Sources: [Vertex AI GenerationConfig](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1beta1/GenerationConfig)

---

## 4. Best Practices for Long Outputs

### Monitoring Response Completion
- **Check `finishReason` field**: If not "STOP", inspect for "MAX_TOKENS" or "LENGTH"
- **Sign of truncation**: Response ends abruptly despite hitting token limit
- **Use `usageMetadata`**: Verify input/output token counts in response

### Streaming for Long Outputs
```javascript
// Stream response as it generates
const stream = await model.generateContentStream(prompt);
for await (const chunk of stream.stream) {
  console.log(chunk.text());
}
```
Streaming prevents client timeout for long-running generations and handles large outputs progressively.

### Token Budgeting
- Reserve tokens for output: Don't fill entire context window with input
- For complex outputs: Set `maxOutputTokens` to 8,000–16,000 minimum
- Monitor token usage in production: Track input/output ratios
- Use caching for repeated prompts: Reduces token consumption

### Known Issues (Gemini 2.5 Flash)
1. **Truncation despite high limits**: Users report incomplete responses even at 65,535 token limit
2. **Thinking models**: With thinking enabled, `max_output_tokens` may ignore thinking budget allocation
3. **Structured output**: Returns null if generation exceeds `maxOutputTokens` with `response_schema`

Sources: [Truncated Response Thread](https://discuss.ai.google.dev/t/truncated-response-issue-with-gemini-2-5-flash-preview/81258), [MAX_TOKENS Issue](https://github.com/google-gemini/gemini-cli/issues/2104)

---

## 5. API Documentation Links

- **Gemini API Models**: https://ai.google.dev/gemini-api/docs/models
- **Generate Content Endpoint**: https://ai.google.dev/api/generate-content
- **Quickstart Guide**: https://ai.google.dev/gemini-api/docs/quickstart
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Vertex AI Params**: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters
- **Firebase AI Logic**: https://firebase.google.com/docs/ai-logic/models

---

## Key Takeaway for Blocksmith

For AI section generation with potential long Liquid output:
1. **Set explicit maxOutputTokens**: 8,000–16,000 for reliable section generation
2. **Monitor finishReason**: Log truncation events to catch incomplete sections
3. **Implement streaming**: Use SSE streaming (already done) to handle chunked output
4. **Validate output completion**: Check if generated Liquid is valid/complete before saving
5. **Add retry logic**: Retry with lower maxOutputTokens if MAX_TOKENS finish reason detected

---

## Unresolved Questions

- Exact default token allocation for Gemini 2.5 Flash when maxOutputTokens not set (model docs unclear)
- Why truncation occurs below 65K limit in production (ongoing investigation by Google)
- Performance impact of streaming vs. batch for ~4-8K token outputs
