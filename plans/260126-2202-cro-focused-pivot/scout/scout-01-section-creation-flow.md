# Scout Report: Section Creation Flow Analysis

**Date**: 2026-01-26
**Purpose**: Understand existing section creation flow for CRO pivot implementation

---

## Key Files Inventory

### Routes
| File | Purpose |
|------|---------|
| `app/routes/app.sections.new.tsx` | Create section with prompt form + template picker |
| `app/routes/app.sections.$id.tsx` | Editor with AI chat, code preview, publishing |
| `app/routes/app.sections._index.tsx` | Sections list with filtering |

### Services
| File | Purpose |
|------|---------|
| `app/services/ai.server.ts` | Gemini 2.5 Flash integration, 394-line SYSTEM_PROMPT |
| `app/services/chat.server.ts` | Conversation persistence |
| `app/utils/context-builder.ts` | Prompt assembly, continuation prompts |
| `app/utils/prompt-templates.ts` | 8 pre-built templates (Hero, Testimonials, Product Grid, etc.) |

### Components
| File | Purpose |
|------|---------|
| `app/components/generate/PromptInput.tsx` | Main prompt textarea (10-2000 chars) |
| `app/components/generate/TemplateSuggestions.tsx` | Template gallery grid |
| `app/components/generate/PromptExamples.tsx` | Quick example chips |
| `app/components/chat/ChatInput.tsx` | Chat refinement input |
| `app/components/chat/SuggestionChips.tsx` | Follow-up action suggestions |

---

## Current Flow

```
User → app.sections.new.tsx
        │
        ├─ Enter free-form prompt (PromptInput.tsx)
        │   OR
        ├─ Select template (TemplateSuggestions.tsx)
        │
        ↓
action() creates Section + Conversation
        │
        ↓
Redirect to app.sections.$id.tsx
        │
        ↓
AI generates code via ChatPanel
        │
        ↓
User refines via ChatInput
```

---

## System Prompt Structure (ai.server.ts)

- Lines 15-394: Comprehensive Shopify Liquid generation rules
- Covers: schema, CSS scoping, markup, forms, patterns
- maxOutputTokens: 65536 (prevents truncation)
- Response format: CHANGES comment + Liquid code

---

## Integration Points for CRO Pivot

### What Needs to Change
1. **app.sections.new.tsx**: Replace prompt textarea with CRO recipe cards
2. **SYSTEM_PROMPT**: Add CRO principles injection based on selected recipe
3. **New Model**: CRORecipe collection in database
4. **New Components**: RecipeCard, RecipeSelector, CROReasoning panel

### What Can Be Reused
1. `TemplateSuggestions.tsx` pattern → adapt for RecipeCards
2. `context-builder.ts` → extend with CRO context
3. `prompt-templates.ts` → migrate to CRORecipe model
4. Chat flow → unchanged (refinements still work)
5. Editor layout → add CRO Reasoning panel

---

## Unresolved Questions

1. Should recipe selection persist as section metadata for analytics?
2. How to handle "edge case" prompts that don't fit recipes?
3. Should CRO reasoning be stored with section for future reference?
