---
phase: 3
title: "AI Prompt & Backend Integration"
status: completed
effort: 2h
completed: 2026-01-26
---

# Phase 3: AI Prompt & Backend Integration

**Parent Plan**: [plan.md](./plan.md)
**Dependencies**: Phase 1 (AIResponseCard), Phase 2 (Auto-Apply)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-26 |
| Priority | P2 |
| Effort | 2h |
| Status | Pending |

Modify AI prompt to output structured `<!-- CHANGES -->` comment, implement extraction in code-extractor, and update stream completion event to include parsed changes.

## Key Insights (from Research)

1. **Change bullets key to UX**: Users scan bullets, not code
2. **3-5 changes max**: Focus on user-visible changes, not technical details
3. **AI prompt engineering**: Must be explicit about output format
4. **Fallback required**: AI may not always output structured changes

## Requirements

### Functional
- AI outputs `<!-- CHANGES: ["...", "..."] -->` comment at end of code
- Code extractor parses changes array from comment
- Stream completion event includes `changes[]` array
- UIMessage stores `changes[]` for persistence
- Fallback: Parse plain text changes if structured comment missing

### Non-Functional
- No breaking changes to existing code extraction
- Changes limited to 5 items max
- Human-readable, non-technical change descriptions

## Architecture

### AI Output Format

```liquid
{% schema %}
...
{% endschema %}

<!-- CHANGES: ["Added hero banner with gradient overlay", "Set primary color to #2563eb", "Added CTA button with hover effect"] -->
```

### Extraction Flow

```
AI Response (full content)
       ↓
extractCodeFromResponse()
       ↓
Returns: { code, hasCode, changes[] }
       ↓
message_complete event includes changes
       ↓
AIResponseCard displays change bullets
```

### Data Flow

```
api.chat.stream.tsx
       ↓
extractCodeFromResponse(fullContent)
       ↓
{
  code: "{% schema %}...",
  hasCode: true,
  changes: ["Added hero banner", "Set color", "Added CTA"]
}
       ↓
SSE: message_complete { changes: [...] }
       ↓
useChat stores in message state
       ↓
AIResponseCard renders bullets
```

## Related Code Files

| File | Action | Purpose |
|------|--------|---------|
| `app/services/ai-section-generator.server.ts` | MODIFY | Add CHANGES instruction to prompt |
| `app/utils/code-extractor.ts` | MODIFY | Extract changes array |
| `app/routes/api.chat.stream.tsx` | VERIFY | Already sends changes in completion |
| `app/components/chat/hooks/useChat.ts` | MODIFY | Store changes in message state |
| `app/types/chat.types.ts` | MODIFY | Add changes[] to UIMessage |

## Implementation Steps

### Step 1: Update UIMessage type (10m)

1. Add `changes?: string[]` to UIMessage interface
2. Update any type guards or validators

```typescript
// app/types/chat.types.ts
export interface UIMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  codeSnapshot?: string;
  changes?: string[];  // NEW: change bullets
  tokenCount?: number;
  isError?: boolean;
  errorMessage?: string;
  createdAt: Date;
}
```

### Step 2: Modify AI prompt (30m)

1. Locate system prompt in `ai-section-generator.server.ts`
2. Add CHANGES instruction after code generation rules
3. Add few-shot examples for consistent format
4. Test with sample prompts

```typescript
// Add to system prompt
`
When generating or modifying a section, ALWAYS include a CHANGES comment at the end of your code block:
<!-- CHANGES: ["Change 1", "Change 2", "Change 3"] -->

Guidelines for CHANGES:
- List 3-5 user-visible changes
- Focus on what users see, not technical details
- Use present tense ("Added", "Changed", "Removed")
- Be specific but concise

Example:
<!-- CHANGES: ["Added hero section with fullwidth image", "Set heading color to #1a1a2e", "Added CTA button with hover animation"] -->
`
```

### Step 3: Update code extractor (45m)

1. Modify `extractCodeFromResponse()` in `code-extractor.ts`
2. Add regex to find `<!-- CHANGES: [...] -->`
3. Parse JSON array from match
4. Remove CHANGES comment from code output
5. Add fallback for unstructured changes

```typescript
// app/utils/code-extractor.ts
interface ExtractionResult {
  code: string | null;
  hasCode: boolean;
  changes: string[];  // NEW
}

function extractChanges(content: string): string[] {
  // Primary: Structured comment
  const changesMatch = content.match(
    /<!--\s*CHANGES:\s*(\[.*?\])\s*-->/s
  );
  if (changesMatch) {
    try {
      const changes = JSON.parse(changesMatch[1]);
      return changes.slice(0, 5); // Max 5 changes
    } catch {
      // Invalid JSON, fall through to fallback
    }
  }

  // Fallback: Parse bullet points from text
  const bulletMatch = content.match(/(?:^|\n)[-•]\s+(.+)/gm);
  if (bulletMatch) {
    return bulletMatch
      .map(b => b.replace(/^[-•]\s+/, '').trim())
      .slice(0, 5);
  }

  return [];
}
```

### Step 4: Verify API stream sends changes (15m)

1. Check `api.chat.stream.tsx` message_complete event
2. Confirm `changes` field is included (already done per code review)
3. Add debug logging if needed

```typescript
// Already in api.chat.stream.tsx (line 194-206)
controller.enqueue(
  encoder.encode(
    `data: ${JSON.stringify({
      type: 'message_complete',
      data: {
        messageId: assistantMessage.id,
        codeSnapshot: sanitizedCode,
        hasCode: extraction.hasCode,
        changes: extraction.changes,  // Already present!
      },
    })}\n\n`
  )
);
```

### Step 5: Update useChat to store changes (20m)

1. Modify useChat hook to extract changes from completion event
2. Store in message state
3. Pass to AIResponseCard via MessageList

```typescript
// In useChat.ts, message_complete handler
case 'message_complete':
  setMessages(prev => prev.map(m =>
    m.id === 'streaming'
      ? {
          ...m,
          id: event.data.messageId,
          codeSnapshot: event.data.codeSnapshot,
          changes: event.data.changes || [],  // NEW
        }
      : m
  ));
  break;
```

## Todo List

- [x] Add changes[] to UIMessage type
- [x] Update AI system prompt with CHANGES instruction
- [x] Add few-shot examples to prompt
- [x] Implement extractChanges() in code-extractor.ts
- [x] Add fallback parsing for unstructured changes
- [x] Remove CHANGES comment from extracted code
- [x] Verify message_complete sends changes
- [x] Update useChat to store changes in state
- [x] Test end-to-end: prompt -> extraction -> display
- [x] Add unit tests for extractChanges()
- [x] Test with various AI outputs (structured, unstructured, missing)

## Success Criteria

- [x] AI outputs `<!-- CHANGES: [...] -->` comment in code
- [x] Code extractor parses changes array correctly
- [x] Changes appear in AIResponseCard as bullets
- [x] Fallback works when structured comment missing
- [x] Max 5 changes enforced
- [x] CHANGES comment removed from displayed code

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI inconsistent output | Medium | Medium | Fallback parser + few-shot examples |
| JSON parse errors | Low | Low | Try-catch with fallback |
| Changes too technical | Medium | Low | Prompt engineering + examples |

## Security Considerations

- Sanitize changes array content before display (XSS)
- Limit changes array length (DoS prevention)
- Validate JSON structure before parse
- No user input flows through changes extraction

## Next Steps

After completing this phase:
1. Full integration testing
2. Visual QA across all chat states
3. Performance testing with long conversations
4. Consider analytics: track change bullet click-through

## Unresolved Questions

1. **Max changes**: Cap at 5 or show all? (Recommendation: 5 max)
2. **Change categorization**: Group by type? (Recommendation: No, keep simple)
3. **Empty changes**: Show "Code updated" fallback? (Recommendation: Yes)
4. **Persistence**: Store changes in DB? (Recommendation: Yes, in message record)
