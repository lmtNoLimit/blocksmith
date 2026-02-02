---
title: "Rebuild AI Chat/Response Mechanism"
description: "Remove broken code extraction, rebuild with simplified direct-output approach using raw Liquid markers"
status: pending
priority: P1
effort: 8h
branch: main
tags: [ai, refactor, streaming, liquid, bug-fix]
created: 2026-02-01
---

# Rebuild AI Chat/Response Mechanism

## Problem Summary

Current AI chat system has 4 critical bugs:
1. **Code extraction fails** - extracted Liquid incomplete/malformed
2. **Streaming issues** - response chunks lost/duplicated during SSE
3. **Auto-continuation breaks** - MAX_TOKENS continuation creates duplicate/merged code
4. **Dual extraction sync issues** - server + client extraction causes conflicts

## Solution

Remove extraction layer entirely. AI outputs raw Liquid with `===START LIQUID===` / `===END LIQUID===` markers. Direct storage without parsing.

## Phases

| Phase | File | Status | Effort |
|-------|------|--------|--------|
| 01 | [phase-01-delete-extraction-files-and-update-imports.md](./phase-01-delete-extraction-files-and-update-imports.md) | pending | 0.5h |
| 02 | [phase-02-refactor-system-prompt-for-raw-liquid-output.md](./phase-02-refactor-system-prompt-for-raw-liquid-output.md) | **done** | 2h |
| 03 | [phase-03-remove-extraction-and-continuation-from-api-stream.md](./phase-03-remove-extraction-and-continuation-from-api-stream.md) | pending | 2h |
| 04 | [phase-04-simplify-usechat-hook-for-direct-code-storage.md](./phase-04-simplify-usechat-hook-for-direct-code-storage.md) | pending | 1.5h |
| 05 | [phase-05-cleanup-context-builder-and-chat-extension.md](./phase-05-cleanup-context-builder-and-chat-extension.md) | pending | 1h |
| 06 | [phase-06-end-to-end-testing-and-validation.md](./phase-06-end-to-end-testing-and-validation.md) | pending | 1h |

## Key Design Decisions

1. **Markers over fences** - `===START LIQUID===` prevents markdown confusion
2. **Temperature 0.2-0.3** - Lower temp for consistent raw output
3. **No continuation** - Remove MAX_TOKENS retry, accept natural limits
4. **Single storage point** - Client accumulates, stores on complete

## Files to Delete

- `app/utils/code-extraction.client.ts` (171 lines)
- `app/utils/code-extractor.ts` (465 lines)

## Environment Variables to Remove

- `FLAG_AUTO_CONTINUE`
- `FLAG_VALIDATE_LIQUID`

## Dependencies

- CRO recipe system preserved (context-builder CRO functions kept)
- Version history preserved (restore API unchanged)
- Streaming infrastructure preserved (SSE events intact)

## Research Sources

- [SSE Streaming Report](./research/researcher-01-sse-streaming.md)
- [Prompt Engineering Report](./research/researcher-02-prompt-engineering.md)

## Validation Summary

**Validated:** 2026-02-01
**Questions asked:** 4

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Fallback if markers missing | Store full response as-is |
| CHANGES comment bullets | Remove entirely (no parsing) |
| Code delivery to client | Server sends codeSnapshot in message_complete event |
| SYSTEM_PROMPT size | Keep ~100 lines with core schema/CSS/form rules |

### Action Items

- [x] Phase 02: Keep SYSTEM_PROMPT at ~100 lines (not 50) - preserve schema/CSS/form rules
- [x] Phase 03: Add fallback logic - if markers not found, store full response
- [x] Phase 03/04: Remove CHANGES comment parsing completely
- [x] Phase 03: Server extracts code and sends codeSnapshot to client
