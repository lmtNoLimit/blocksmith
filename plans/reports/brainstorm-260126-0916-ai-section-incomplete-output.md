# Brainstorm: AI Section Generation Incomplete Output

> **Status**: Brainstorm Document (for reference)
> **Date**: 2026-01-26
> **Decision**: Option D (Hybrid) selected for future implementation

## Problem Statement

AI section generation completes streaming normally but produces broken/incomplete Liquid code. The HTML markup gets cut off before closing tags, affecting sections of all complexity levels.

**Root Cause**: Gemini 2.5 Flash has a default output token limit (~8K tokens). The current implementation doesn't set explicit `maxOutputTokens`, causing silent truncation when sections exceed this limit.

---

## Selected Solution: Option D (Hybrid Approach)

Combine increased token limits with completion detection and smart continuation.

---

## Implementation Plan

### Phase 1: Increase Token Limits (Core Fix)

**File**: `app/services/ai.server.ts`

1. Add `maxOutputTokens: 65536` to all Gemini generation calls:
   - `generateSection()` method
   - `generateSectionStream()` method
   - `generateWithContext()` method

2. Add generation config object for consistency:
   ```typescript
   const GENERATION_CONFIG = {
     maxOutputTokens: 65536,
     temperature: 0.7,
   };
   ```

### Phase 2: Completion Validation

**File**: `app/utils/code-extractor.ts` (extend existing)

1. Create `validateLiquidCompleteness()` function:
   - Check all HTML tags are properly closed (stack-based validator)
   - Verify `{% schema %}...{% endschema %}` is complete
   - Validate schema JSON is parseable
   - Check no dangling `{% if %}`, `{% for %}`, etc.

2. Return structured result:
   ```typescript
   interface ValidationResult {
     isComplete: boolean;
     issues: string[];  // ["Unclosed <div> tag", "Schema JSON truncated"]
     lastValidPosition?: number;  // For continuation
   }
   ```

### Phase 3: Auto-Continuation Logic

**File**: `app/routes/api.chat.stream.tsx` (extend)

1. After streaming completes, call `validateLiquidCompleteness()`

2. If incomplete:
   - Extract last valid code position
   - Build continuation prompt: "Continue the Liquid section from where it stopped. Here's what was generated so far: [truncated code]. Complete the remaining HTML and ensure all tags are closed."
   - Stream continuation response
   - Merge with original (deduplicate overlapping code)

3. Limit to 2 continuation attempts max

### Phase 4: UI Feedback

**File**: `app/components/StreamingCodeBlock.tsx` (extend)

1. Add completion status indicator
2. Show "Section may be incomplete" warning if validation fails
3. Add "Complete Section" manual button as fallback

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/services/ai.server.ts` | Add maxOutputTokens config, refactor generation calls |
| `app/utils/code-extractor.ts` | Add `validateLiquidCompleteness()` function |
| `app/routes/api.chat.stream.tsx` | Add continuation logic after streaming |
| `app/components/StreamingCodeBlock.tsx` | Add completion status UI |

---

## Verification

1. **Unit Tests**: Test `validateLiquidCompleteness()` with various incomplete sections
2. **Integration**: Generate complex sections (10+ blocks) and verify full output
3. **Edge Cases**: Test continuation logic with intentionally truncated responses
4. **Manual QA**: Generate 5-10 sections of varying complexity, verify all complete

---

## Alternatives Considered (for reference)

### Option A: Increase Output Limits + Completion Detection

**Approach**: Set explicit `maxOutputTokens` to maximum allowed and add validation to detect incomplete output.

**Implementation**:
1. Add `maxOutputTokens: 65536` (Gemini 2.5 Flash max) to generation config
2. Create `isCompleteLiquidSection()` validator checking:
   - All HTML tags properly closed
   - Schema block complete with valid JSON
   - No dangling Liquid tags
3. Show warning to user if section appears incomplete
4. Allow manual "Continue Generation" button

**Pros**:
- Simple to implement (1-2 files)
- Preserves AI creativity (no structural constraints)
- Works for all section types
- User gets full uninterrupted flow

**Cons**:
- Higher token cost per generation
- May still fail for extremely large sections
- Detection heuristics may have false positives/negatives

**Complexity**: Low | **Risk**: Low

---

### Option B: Split Generation into Stages

**Approach**: Generate section in separate phases (schema → markup → styles) then merge.

**Implementation**:
1. Phase 1: Generate schema JSON only with settings/blocks
2. Phase 2: Generate HTML/Liquid markup using schema as context
3. Phase 3: Generate CSS styles (if needed)
4. Merge all phases into final section

**Pros**:
- Each phase fits comfortably in token limits
- Can validate each phase independently
- Easier to debug which phase failed
- More predictable output structure

**Cons**:
- 3x API calls = higher latency + cost
- AI loses holistic view of section
- May create disconnects (schema settings not used in markup)
- Complex state management during generation
- Less creative freedom

**Complexity**: High | **Risk**: Medium

---

### Option C: Auto-Continue/Retry on Incomplete

**Approach**: Detect truncation and automatically continue generation from where it stopped.

**Implementation**:
1. After generation completes, run `isCompleteLiquidSection()` check
2. If incomplete, extract the last valid position
3. Send continuation prompt: "Continue from: `<last valid code>`"
4. Merge continuation with original
5. Repeat up to 3 times if still incomplete

**Pros**:
- Handles any section size theoretically
- Maintains AI's original creative direction
- Transparent to user (just takes longer)
- Self-healing without user intervention

**Cons**:
- Multiple API calls for large sections
- Risk of context drift during continuation
- Merging logic can be tricky (duplicate code)
- May produce inconsistent styling across continuations

**Complexity**: Medium | **Risk**: Medium

---

### Option D: Hybrid Approach (Recommended)

**Approach**: Combine A + C - Increase limits AND add smart continuation.

**Implementation**:
1. Set `maxOutputTokens: 65536` (prevents most truncations)
2. Add completion validation after generation
3. If incomplete:
   - Show partial result to user
   - Offer "Auto-complete" button
   - Use continuation prompt to finish
4. Add progress indicator showing estimated completion %

**Pros**:
- Best of both worlds
- Most sections complete in single pass (faster)
- Graceful handling of edge cases
- User stays in control

**Cons**:
- More code than Option A alone
- Still requires good continuation logic

**Complexity**: Medium | **Risk**: Low

---

## Comparison Matrix

| Criteria | Option A | Option B | Option C | Option D |
|----------|----------|----------|----------|----------|
| Implementation Effort | Low | High | Medium | Medium |
| API Costs | Medium | High | High | Medium-High |
| User Experience | Good | Poor | Good | Best |
| Reliability | Good | Medium | Medium | High |
| AI Creativity | Full | Constrained | Full | Full |
| Latency | Low | High | Variable | Low-Variable |

---

## Recommendation

**Option D (Hybrid)** provides the best balance:

1. **Quick Win**: Adding `maxOutputTokens: 65536` will fix 90%+ of truncation issues immediately
2. **Safety Net**: Completion detection + auto-continue handles edge cases
3. **User Control**: Optional manual continuation preserves user agency

**Estimated Changes**:
- `app/services/ai.server.ts` - Add maxOutputTokens to generation config
- `app/utils/code-extractor.ts` - Add comprehensive completion validator
- `app/routes/api.chat.stream.tsx` - Add continuation logic
- UI - Add "Auto-complete" button for incomplete sections

---

## Unresolved Questions

1. Should we warn users before generating very complex sections that they may need continuation?
2. What's the maximum number of continuation attempts before giving up?
3. Should incomplete sections be savable as drafts for manual editing?
4. Do we need a fallback to a more capable model (e.g., Gemini Pro) for complex sections?

---

## Next Steps

After approval:
- `/code` - Implement the hybrid solution
- `/test` - Verify with complex section generation
