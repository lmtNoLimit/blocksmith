---
title: "AI Chat Panel Refinement"
description: "Unified AIResponseCard with streaming phases, auto-apply, and non-destructive restore"
status: completed
priority: P1
effort: 8h
branch: main
tags: [chat, ux, streaming, versions, ai-response]
created: 2026-01-26
updated: 2026-01-26
completed: 2026-01-26T13:37:00Z
---

# AI Chat Panel Refinement

## Overview

Consolidate streaming + completed message states into single `AIResponseCard` component with phase indicators, auto-apply on completion, and bolt.new-style non-destructive restore.

## Goals

1. **Unified UX**: Same component renders streaming AND saved messages
2. **Clear Progress**: Phase indicators (Analyzing -> Schema -> Styling -> Finalizing)
3. **Auto-Apply**: Generation auto-applies, removing manual "Apply" friction
4. **Non-Destructive Restore**: Creates new version, preserves history

## Implementation Phases

| Phase | Name | Effort | Status | File |
|-------|------|--------|--------|------|
| 1 | AIResponseCard Component | 3h | completed | [phase-01-ai-response-card.md](./phase-01-ai-response-card.md) |
| 2 | Auto-Apply & Version Management | 3h | completed | [phase-02-auto-apply-version-management.md](./phase-02-auto-apply-version-management.md) |
| 3 | AI Prompt & Backend Integration | 2h | completed | [phase-03-ai-prompt-backend.md](./phase-03-ai-prompt-backend.md) |

## Key Components

```
app/components/chat/
├── AIResponseCard.tsx         # NEW - Unified streaming/completed card
├── MessageItem.tsx            # Modify - Use AIResponseCard for assistant
├── VersionCard.tsx            # Modify - Remove Apply, add Active badge
├── RestoreMessage.tsx         # NEW - Restore confirmation message
└── hooks/useStreamingProgress.ts  # Modify - Add phaseContext
```

## Architecture Summary

```
User sends message
       ↓
┌─────────────────────────────┐
│ AIResponseCard (streaming)  │ ← Phase indicators + spinner
│ • Analyzing your request    │
│ • Building section schema...│
└─────────────────────────────┘
       ↓ (on completion)
┌─────────────────────────────┐
│ AIResponseCard (completed)  │ ← Auto-apply triggers here
│ • Added hero banner         │   Preview updates automatically
│ • Set background to blue    │
│ ▼ Show code                 │
│ [v3 Active]      [Restore]  │ ← Only Restore on non-active
└─────────────────────────────┘
```

## Success Criteria

- [ ] Visual consistency: Streaming matches reloaded state
- [ ] Auto-apply: No manual click needed after generation
- [ ] Version clarity: Active badge always visible
- [ ] Restore flow: Creates new version, preserves history
- [ ] Changes bullets: AI outputs structured `<!-- CHANGES -->` comment

## Dependencies

- Existing SSE streaming via `api.chat.stream.tsx`
- Code extraction via `extractCodeFromResponse()`
- Polaris Web Components for UI

---

## Validation Summary

**Validated:** 2026-01-26
**Questions asked:** 6

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Auto-apply behavior | Always auto-apply (even if user edited code manually) |
| Preview button | Keep on VersionCard (allows quick compare before restore) |
| Streaming phases | 4 phases: Analyzing → Schema → Styling → Finalizing |
| CHANGES fallback | Parse bullet points from text when structured comment missing |
| Restore token cost | Free (no AI tokens consumed, instant code copy) |
| Code accordion default | Always collapsed on page reload |

### Implementation Notes

1. **Auto-apply always overwrites** - Users rely on version history for recovery, not edit-aware detection
2. **Preview button retained** - Enables compare workflow before committing to restore
3. **4-phase model confirmed** - Matches original brainstorm, provides balance of detail
4. **Graceful fallback** - Parse `-` and `•` bullets if AI misses CHANGES comment
5. **Free restore** - No API call, just copy code to new version record
6. **Code always collapsed** - Clean scannable UI, user explicitly expands when needed

### Action Items

- [ ] Ensure auto-apply effect doesn't check for manual edits (per decision)
- [ ] Keep Preview button in VersionCard redesign
- [ ] Implement bullet-point fallback parser in code-extractor.ts
- [ ] Restore endpoint should NOT call AI, just copy code
