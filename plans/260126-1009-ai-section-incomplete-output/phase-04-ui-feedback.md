# Phase 04: Add UI Feedback for Completion Status

## Context Links

- [Phase 03: Auto-Continuation](./phase-03-auto-continuation.md)
- [Main Plan](./plan.md)

## Overview

Add visual feedback in chat UI when auto-continuation occurs or code is potentially incomplete. Users should understand when AI is "finishing up" vs when output may be truncated.

## Key Insights

- Current CodeBlock component has no status indicator
- SSE events from Phase 03 provide continuation status
- Users need to know: generating, continuing, complete, potentially incomplete
- Polaris provides banner/badge components for status

## Requirements

1. Handle `continuation_start` SSE event in chat UI
2. Handle `continuation_complete` SSE event in chat UI
3. Show "Completing..." indicator during continuation
4. Show warning badge if response still incomplete after max retries
5. Add tooltip explaining potential truncation

## Architecture

```
Chat UI Components
├── ChatMessages.tsx
│   └── useSSEStream hook
│       ├── message_start → isGenerating: true
│       ├── content_delta → append content
│       ├── continuation_start → isContinuing: true
│       ├── continuation_complete → isContinuing: false
│       └── message_complete → isGenerating: false, check wasComplete
│
├── MessageBubble.tsx
│   └── Shows continuation indicator
│
└── CodeBlock.tsx (or new StatusBadge)
    └── Shows completion status badge
```

## Related Code Files

| File | Purpose |
|------|---------|
| `app/components/chat/CodeBlock.tsx` | Code display component |
| `app/components/chat/ChatMessages.tsx` | Message list + SSE handler |
| `app/components/chat/MessageBubble.tsx` | Individual message display |
| `app/hooks/useSSEStream.ts` | SSE stream hook (if exists) |

## Implementation Steps

### Step 1: Update SSE event types (10 min)

In `types/chat.types.ts`:
```typescript
export type SSEEventType =
  | 'message_start'
  | 'content_delta'
  | 'continuation_start'
  | 'continuation_complete'
  | 'message_complete'
  | 'error';

export interface ContinuationStartEvent {
  type: 'continuation_start';
  data: {
    attempt: number;
    errors: Array<{ type: string; message: string }>;
  };
}

export interface MessageCompleteEvent {
  type: 'message_complete';
  data: {
    messageId: string;
    codeSnapshot?: string;
    hasCode: boolean;
    changes?: string[];
    wasComplete?: boolean; // NEW: indicates if continuation succeeded
    continuationCount?: number; // NEW: how many continuations occurred
  };
}
```

### Step 2: Update SSE handler state (20 min)

In chat message handling (likely `ChatMessages.tsx` or a hook):
```typescript
const [generationStatus, setGenerationStatus] = useState<{
  isGenerating: boolean;
  isContinuing: boolean;
  continuationAttempt: number;
  wasComplete: boolean;
}>({
  isGenerating: false,
  isContinuing: false,
  continuationAttempt: 0,
  wasComplete: true,
});

// Handle continuation events
case 'continuation_start':
  setGenerationStatus(prev => ({
    ...prev,
    isContinuing: true,
    continuationAttempt: event.data.attempt,
  }));
  break;

case 'continuation_complete':
  setGenerationStatus(prev => ({
    ...prev,
    isContinuing: false,
    wasComplete: event.data.isComplete,
  }));
  break;

case 'message_complete':
  setGenerationStatus({
    isGenerating: false,
    isContinuing: false,
    continuationAttempt: 0,
    wasComplete: event.data.wasComplete ?? true,
  });
  break;
```

### Step 3: Add continuation indicator (15 min)

In `MessageBubble.tsx` or inline in chat:
```tsx
{generationStatus.isContinuing && (
  <s-box padding="small" background="surface-secondary">
    <s-stack direction="inline" alignItems="center" gap="small">
      <s-spinner size="small" />
      <s-text color="subdued">
        Completing section (attempt {generationStatus.continuationAttempt}/2)...
      </s-text>
    </s-stack>
  </s-box>
)}
```

### Step 4: Add completion status badge to CodeBlock (20 min)

Update `CodeBlock.tsx`:
```typescript
export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  completionStatus?: 'complete' | 'potentially-incomplete' | 'generating';
}

// In header section:
{completionStatus === 'potentially-incomplete' && (
  <s-tooltip content="AI output may be incomplete. Some code may be missing.">
    <s-badge tone="attention">
      Potentially Incomplete
    </s-badge>
  </s-tooltip>
)}

{completionStatus === 'complete' && continuationCount > 0 && (
  <s-tooltip content={`AI continued ${continuationCount} time(s) to complete this section.`}>
    <s-badge tone="success">
      Auto-completed
    </s-badge>
  </s-tooltip>
)}
```

### Step 5: Update message_complete payload (10 min)

In `api.chat.stream.tsx`, add completion metadata:
```typescript
controller.enqueue(
  encoder.encode(
    `data: ${JSON.stringify({
      type: 'message_complete',
      data: {
        messageId: assistantMessage.id,
        codeSnapshot: sanitizedCode,
        hasCode: extraction.hasCode,
        changes: extraction.changes,
        wasComplete: validation.isComplete,  // NEW
        continuationCount,                    // NEW
      },
    })}\n\n`
  )
);
```

### Step 6: Store completion status in message (10 min)

Optional: persist completion status to database for history view.

In `chat.server.ts`:
```typescript
await prisma.message.update({
  where: { id: assistantMessage.id },
  data: {
    metadata: {
      wasComplete: validation.isComplete,
      continuationCount,
    }
  }
});
```

### Step 7: Add tests (15 min)

Test cases:
- `continuation_start` event shows indicator
- `continuation_complete` event hides indicator
- Incomplete status shows warning badge
- Complete with continuations shows success badge

## Todo List

- [x] Add SSE event types for continuation
- [x] Update chat message handler for new events
- [x] Add continuation indicator (spinner + text)
- [x] Add completion status badge to CodeBlock
- [x] Update `message_complete` event with completion metadata
- [ ] Optionally persist completion status to database (skipped for v1)
- [x] Add component tests
- [x] Manual test full flow

## Implementation Notes

**Completed:** 2026-01-26
**Review:** `/plans/reports/code-reviewer-260126-1559-phase04-ui-feedback.md`

All required features implemented and tested. Optional database persistence skipped per YAGNI - can add later if analytics needed.

Key changes:
1. `GenerationStatus` interface tracks continuation state in `useChat.ts`
2. Continuation indicator shows "attempt X/2" during streaming
3. CodeBlock badges: "Potentially Incomplete" (warning) or "Auto-completed" (success)
4. SSE events: `continuation_start`, `continuation_complete` with metadata
5. Test coverage: 9 new badge rendering tests

**Verdict:** ✅ Approved for deployment

## Success Criteria

- User sees "Completing..." during continuation
- Warning badge appears if output potentially incomplete
- Success badge shows auto-completion occurred
- Tooltip explains status
- No visual changes when continuation not triggered

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| UI flicker | Medium | Low | Debounce state updates |
| Confusing UX | Medium | Medium | Clear, concise labels + tooltips |
| Badge overload | Low | Low | Only show when relevant |

## Security Considerations

- No new inputs from user
- Status metadata is server-generated
- No XSS vectors in status display

## Next Steps

After completing Phase 04:
1. A/B test badge visibility with users
2. Gather feedback on indicator clarity
3. Consider adding "Retry" button for incomplete sections
4. Document feature for support team
