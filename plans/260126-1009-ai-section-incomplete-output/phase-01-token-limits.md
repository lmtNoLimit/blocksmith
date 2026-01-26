# Phase 01: Add maxOutputTokens to AI Service

## Context Links

- [Research: Gemini Token Limits](./research/researcher-01-gemini-token-limits.md)
- [Main Plan](./plan.md)

## Overview

Add explicit `maxOutputTokens: 65536` to all Gemini generation calls. Currently no limit is set, causing silent truncation at default ~8K tokens.

## Key Insights

- Gemini 2.5 Flash supports up to 65,536 output tokens
- Default behavior uses model-specific limit (unclear, ~8K observed)
- `finishReason` field indicates truncation: "MAX_TOKENS" vs "STOP"
- Always explicitly set `maxOutputTokens` per Google best practices

## Requirements

1. Add `maxOutputTokens: 65536` to `generateSection()` method
2. Add `maxOutputTokens: 65536` to `generateSectionStream()` method
3. Add `maxOutputTokens: 65536` to `generateWithContext()` method
4. Log `finishReason` from response metadata
5. Add feature flag `FLAG_MAX_OUTPUT_TOKENS`

## Architecture

```
ai.server.ts
├── generateSection() ─────────► Add generationConfig
├── generateSectionStream() ───► Add generationConfig
└── generateWithContext() ─────► Add generationConfig
```

All methods pass `generationConfig` to `getGenerativeModel()`:
```typescript
const model = this.genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    maxOutputTokens: 65536,
    temperature: 0.7,
  }
});
```

## Related Code Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/services/ai.server.ts` | 405, 485, 530 | `getGenerativeModel()` calls |

## Implementation Steps

### Step 1: Define generation config constant (5 min)

At top of `ai.server.ts`, after imports:
```typescript
const GENERATION_CONFIG = {
  maxOutputTokens: 65536,
  temperature: 0.7,
};
```

### Step 2: Update generateSection() (10 min)

Line ~405 - Add `generationConfig` to model options:
```typescript
const model = this.genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: GENERATION_CONFIG,
});
```

Log finish reason after generation:
```typescript
const result = await model.generateContent(prompt);
const finishReason = result.response.candidates?.[0]?.finishReason;
if (finishReason !== 'STOP') {
  console.warn(`[ai.server] Unexpected finishReason: ${finishReason}`);
}
```

### Step 3: Update generateSectionStream() (10 min)

Line ~485 - Same pattern. For streaming, check after loop completes:
```typescript
const model = this.genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: GENERATION_CONFIG,
});
```

### Step 4: Update generateWithContext() (10 min)

Line ~530 - Same pattern:
```typescript
const model = this.genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: getChatSystemPrompt(SYSTEM_PROMPT),
  generationConfig: GENERATION_CONFIG,
});
```

### Step 5: Add feature flag (10 min)

In `.env`:
```
FLAG_MAX_OUTPUT_TOKENS=true
```

Conditional config:
```typescript
const GENERATION_CONFIG = process.env.FLAG_MAX_OUTPUT_TOKENS === 'true'
  ? { maxOutputTokens: 65536, temperature: 0.7 }
  : { temperature: 0.7 };
```

### Step 6: Add tests (15 min)

Update `ai.server.test.ts` to verify:
- Config is passed to model
- `finishReason` logging works
- Feature flag toggles behavior

## Todo List

- [ ] Add `GENERATION_CONFIG` constant with `maxOutputTokens: 65536`
- [ ] Update `generateSection()` to use config
- [ ] Update `generateSectionStream()` to use config
- [ ] Update `generateWithContext()` to use config
- [ ] Log `finishReason` for non-STOP completions
- [ ] Add `FLAG_MAX_OUTPUT_TOKENS` feature flag
- [ ] Add/update unit tests
- [ ] Manual test with long section prompt

## Success Criteria

- All 3 generation methods use `maxOutputTokens: 65536`
- Console logs `finishReason` when not "STOP"
- Feature flag can disable new behavior
- Existing tests pass
- No regressions in section generation

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Higher API costs | Low | Low | Only affects long outputs |
| Longer response times | Low | Medium | Already using streaming |
| Breaking changes | Very Low | High | Feature flag rollback |

## Security Considerations

- No new user inputs
- No new external APIs
- Token limit increase poses no security risk

## Next Steps

After completing Phase 01:
1. Deploy and monitor `finishReason` logs
2. Proceed to Phase 02 (validation) to catch remaining edge cases
3. Update documentation with new env variable
