---
title: "Phase 03: AI CRO Integration"
status: done
effort: 4h
dependencies: [phase-01, phase-02]
completed_date: 2026-01-27T20:49:00Z
---

# Phase 03: AI CRO Integration

**Parent Plan**: [CRO-Focused Pivot](./plan.md)
**Dependencies**: [Phase 01](./phase-01-database-cro-recipes.md), [Phase 02](./phase-02-recipe-selection-ui.md)

---

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-26 |
| Priority | P1 |
| Implementation Status | Pending |
| Review Status | Not started |

---

## Key Insights (from Research)

- AI must explain WHY design choices work (psychological principles)
- Structured reasoning output enables consistent UI rendering
- Tie reasoning to specific user context (product type, price)
- Current SYSTEM_PROMPT is 394 lines - extend, don't replace
- JSON reasoning format ensures parseable output

---

## Requirements

### Functional Requirements

1. Inject CRO prompt templates into AI generation
2. AI returns section code + structured CRO reasoning
3. Reasoning explains design decisions with psychology references
4. Context-aware reasoning (adapts to product type, price range)

### Acceptance Criteria

- [ ] `SYSTEM_PROMPT` extended with CRO reasoning instructions
- [ ] AI response includes `<!-- CRO_REASONING_START -->` block
- [ ] Reasoning is parseable JSON with design decisions
- [ ] Each decision references CRO principle + explanation
- [ ] Context (product type, price) influences reasoning
- [ ] Fallback to generic reasoning if context missing

---

## Architecture

### CRO Reasoning Format

```json
{
  "goal": "Reduce Cart Abandonment",
  "decisions": [
    {
      "element": "CTA Placement",
      "choice": "Above-the-fold, following F-pattern",
      "principle": "Visual Hierarchy",
      "explanation": "80% of viewing time spent above fold; F-pattern matches natural reading behavior",
      "source": "Nielsen Norman Group"
    },
    {
      "element": "Urgency Element",
      "choice": "Stock counter showing limited availability",
      "principle": "Scarcity",
      "explanation": "Triggers loss aversion (Cialdini) - fear of missing out drives action",
      "source": "Cialdini, Influence"
    },
    {
      "element": "Trust Signal",
      "choice": "Guarantee badge near CTA",
      "principle": "Risk Reversal",
      "explanation": "Reduces perceived risk at decision moment; 30-day guarantee addresses hesitation",
      "source": "CRO Best Practices"
    }
  ],
  "tip": "A/B test urgency vs social proof for your audience."
}
```

### Response Structure

```
<!-- CHANGES -->
Description of section changes...

<!-- CRO_REASONING_START -->
{JSON reasoning object}
<!-- CRO_REASONING_END -->

{% schema %}...
<style>...
<section>...
```

---

## Related Code Files

| File | Action | Purpose |
|------|--------|---------|
| `app/services/ai.server.ts` | Modify | Add CRO system prompt extension |
| `app/utils/context-builder.ts` | Modify | Inject recipe context into prompts |
| `app/utils/cro-reasoning-parser.ts` | Create | Parse reasoning from response |
| `app/services/cro-recipe.server.ts` | Modify | Add prompt building with context |

---

## Implementation Steps

### Step 1: Extend SYSTEM_PROMPT (60 min)

Add CRO reasoning instructions to `ai.server.ts`:

```typescript
const CRO_REASONING_INSTRUCTIONS = `
## CRO REASONING OUTPUT

After generating the Liquid code, you MUST include a CRO reasoning block explaining your design decisions.

FORMAT:
<!-- CRO_REASONING_START -->
{
  "goal": "[Recipe goal from context]",
  "decisions": [
    {
      "element": "[Design element name]",
      "choice": "[What you chose]",
      "principle": "[CRO principle applied]",
      "explanation": "[Why this works psychologically]",
      "source": "[Reference if applicable]"
    }
  ],
  "tip": "[A/B testing suggestion or optimization tip]"
}
<!-- CRO_REASONING_END -->

Include 3-5 design decisions that directly address the stated conversion goal.
Each decision should reference specific CRO principles:
- Urgency, Scarcity, Social Proof, Authority, Reciprocity
- Visual Hierarchy, F-Pattern, Contrast, Whitespace
- Risk Reversal, Anchoring, Loss Aversion
`;
```

Append to existing SYSTEM_PROMPT when recipe context present.

### Step 2: Update Context Builder (45 min)

Modify `app/utils/context-builder.ts`:

```typescript
interface RecipeContext {
  productType?: string;
  priceRange?: string;
  targetAudience?: string;
  customNotes?: string;
}

export function buildCROPrompt(
  recipe: CRORecipe,
  context: RecipeContext
): string {
  let prompt = recipe.promptTemplate;

  // Inject context
  const contextBlock = buildContextBlock(context);
  prompt = prompt.replace('{{CONTEXT}}', contextBlock);

  // Add principles reminder
  prompt += `\n\nREMEMBER: Apply these CRO principles: ${recipe.croPrinciples.join(', ')}`;

  return prompt;
}

function buildContextBlock(context: RecipeContext): string {
  const lines: string[] = [];
  if (context.productType) lines.push(`Product Type: ${context.productType}`);
  if (context.priceRange) lines.push(`Price Range: ${context.priceRange}`);
  if (context.targetAudience) lines.push(`Target Audience: ${context.targetAudience}`);
  if (context.customNotes) lines.push(`Additional Notes: ${context.customNotes}`);
  return lines.length ? `USER CONTEXT:\n${lines.join('\n')}` : '';
}
```

### Step 3: Create Reasoning Parser (45 min)

Create `app/utils/cro-reasoning-parser.ts`:

```typescript
export interface CRODecision {
  element: string;
  choice: string;
  principle: string;
  explanation: string;
  source?: string;
}

export interface CROReasoning {
  goal: string;
  decisions: CRODecision[];
  tip?: string;
}

export function parseCROReasoning(response: string): CROReasoning | null {
  const startMarker = '<!-- CRO_REASONING_START -->';
  const endMarker = '<!-- CRO_REASONING_END -->';

  const startIndex = response.indexOf(startMarker);
  const endIndex = response.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return null; // No reasoning block found
  }

  const jsonStr = response
    .substring(startIndex + startMarker.length, endIndex)
    .trim();

  try {
    return JSON.parse(jsonStr) as CROReasoning;
  } catch (e) {
    console.error('Failed to parse CRO reasoning:', e);
    return null;
  }
}

export function extractCodeWithoutReasoning(response: string): string {
  const startMarker = '<!-- CRO_REASONING_START -->';
  const endMarker = '<!-- CRO_REASONING_END -->';

  return response
    .replace(new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'g'), '')
    .trim();
}
```

### Step 4: Update AI Service (60 min)

Modify `ai.server.ts` to:
1. Accept recipe context parameter
2. Append CRO instructions when recipe present
3. Return parsed reasoning alongside code

```typescript
interface GenerateOptions {
  prompt: string;
  recipe?: CRORecipe;
  recipeContext?: RecipeContext;
}

interface GenerateResult {
  code: string;
  reasoning?: CROReasoning;
  rawResponse: string;
}

export async function generateSection(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, recipe, recipeContext } = options;

  let systemPrompt = SYSTEM_PROMPT;
  let userPrompt = prompt;

  if (recipe) {
    // Append CRO reasoning instructions
    systemPrompt += CRO_REASONING_INSTRUCTIONS;

    // Build CRO-enhanced prompt
    userPrompt = buildCROPrompt(recipe, recipeContext || {});
  }

  const response = await generateWithGemini(systemPrompt, userPrompt);

  // Parse reasoning if present
  const reasoning = parseCROReasoning(response);
  const code = extractCodeWithoutReasoning(response);

  return { code, reasoning, rawResponse: response };
}
```

### Step 5: Update Section Creation Flow (30 min)

Modify `app.sections.new.tsx` action and `app.sections.$id.tsx` loader:
1. Pass recipe + context to AI service
2. Store reasoning with section (optional)
3. Return reasoning to UI for display

### Step 6: Test CRO Reasoning Output (30 min)

Create test cases:
- Recipe with full context → structured reasoning
- Recipe without context → generic reasoning
- Non-recipe prompt → no reasoning block
- Malformed reasoning → graceful fallback

---

## CRO Principle Reference

| Principle | When to Apply | Example |
|-----------|---------------|---------|
| Urgency | Cart abandonment, promos | "Only 3 left", countdown timer |
| Scarcity | Limited items, sales | "Limited edition", stock counter |
| Social Proof | Trust building, high-ticket | Reviews, testimonials, "1000+ sold" |
| Authority | Expensive products | Certifications, expert quotes |
| Visual Hierarchy | Page engagement | Large headlines, contrasting CTAs |
| F-Pattern | Content layout | Left-aligned key info, eye flow |
| Risk Reversal | Objection handling | Guarantees, return policies |
| Anchoring | Upsell/cross-sell | Original price → sale price |

---

## Success Criteria

1. AI generates reasoning block with every recipe-based request
2. Reasoning is valid JSON and parseable
3. Each decision references specific CRO principle
4. Context (product type, price) influences explanations
5. Code generation quality unchanged
6. No increase in generation time > 10%

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Reasoning format inconsistent | Medium | Medium | Strict prompt instructions, parser fallback |
| Token limit exceeded | Low | High | Monitor token usage, trim if needed |
| Reasoning quality varies | Medium | Medium | Example-based prompt training |
| Parsing fails | Medium | Low | Graceful fallback to null reasoning |
