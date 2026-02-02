# Prompt Engineering for Raw Output - Research Report

## Problem
Existing 400+ line system prompt instructs AI to output raw Liquid, yet AI sometimes wraps in markdown fences or adds explanations despite clear instructions.

## Key Findings

### 1. System Prompt Patterns That Work
- **Explicit negation statements**: "no markdown, no fenced code blocks, no explanations, no yapping"
- **Output prefixes**: Use `LIQUID:` or `OUTPUT:` prefix to signal format intent
- **Direct instruction**: "Return raw Liquid code only, no wrapping, no markdown formatting"
- **Constraint examples**: List what NOT to do explicitly (e.g., "Do NOT wrap in backticks, do NOT add explanation text")

### 2. Why Long Prompts Fail
Research shows **formatting context dramatically impacts output**:
- Prompt template changes can cause 40% performance variance (code translation)
- 400+ lines of instruction dilutes core signal/noise ratio
- LLMs may partially follow conflicting instructions when prompt is too verbose
- Explanation attempts override raw-output instructions in longer prompts

**Solution**: Consolidate system prompt to ~100 focused lines max, prioritize critical constraints.

### 3. Few-Shot Prompting for Consistency
Most effective technique:
- Show 2-3 examples of desired raw output WITHOUT markdown wrapping
- Ensure example consistency (spacing, newlines, format)
- Examples train model on exact output format better than explanation
- Use identical structure across all examples (critical for Liquid code)

### 4. Structural Techniques
**Effective approaches:**
- Use output markers: `===START LIQUID===` ... `===END LIQUID===`
- Prefix pattern: `LIQUID:` at output start prevents markdown wrapping
- Negative examples in few-shot: Show what NOT to do
- Single-line constraint: "Output ONLY Liquid code, nothing else"

### 5. Gemini API Specific
- Supports structured output with schema validation (2024+)
- Schema-based generation enforces format compliance
- JSON schema approach: Define exact output structure, model fills it
- Temperature/top_p: Lower temperature (0.1-0.3) for deterministic output

### 6. Anti-patterns to Avoid
- Long system prompts dilute instructions
- Verbose explanations in prompt encourage verbose output
- Contradictory instructions ("generate with explanation" vs "raw output only")
- Not showing examples of desired format

## Implementation Recommendation

**Refactor existing system prompt:**

1. **Core constraint** (5 lines): State raw output requirement
2. **Few-shot examples** (20 lines): 2-3 examples of pure Liquid without markdown
3. **Format markers** (3 lines): Use `===START LIQUID===` / `===END LIQUID===`
4. **Negative constraints** (5 lines): Explicit "do NOT" statements
5. **Temperature setting**: Use 0.2-0.3 for Gemini API calls

Target: 40-50 lines total vs 400+ current.

**Example structure:**
```
You are a Liquid code generator.

OUTPUT FORMAT REQUIREMENT:
- Generate ONLY raw Liquid code
- NO markdown fences, NO backticks, NO explanations
- NO text before or after code
- Wrap output: ===START LIQUID=== [code] ===END LIQUID===

EXAMPLES:
[Show 2 raw examples with markers, no markdown]

CONSTRAINTS:
- Do NOT add explanatory text
- Do NOT use markdown code fences
- Do NOT comment your output
```

## Research Sources
- [Gemini API Prompting Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [Prompt Design Impact on LLM Performance](https://arxiv.org/html/2411.10541v1)
- [Few-Shot Prompting Guide](https://learnprompting.org/docs/basics/few_shot)
- [Structured Output Formatting](https://medium.com/@the_manoj_desai/output-formatting-strategies-getting-exactly-what-you-want-how-you-want-it-8cebb61bad2d)

## Unresolved Questions
- Does Gemini respond better to XML markers vs plain markers?
- Optimal few-shot example count for Liquid generation (2 vs 3 vs 5)?
- Performance impact of schema-based output vs prompt-based for Liquid?
