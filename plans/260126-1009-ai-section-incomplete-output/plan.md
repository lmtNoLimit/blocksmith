---
title: "Fix AI Section Generation Incomplete Output"
description: "Hybrid approach: maxOutputTokens + validation + auto-continuation for complete Liquid sections"
status: pending
priority: P1
effort: 7h
branch: main
tags: [ai, gemini, liquid, validation, streaming]
created: 2026-01-26
---

# AI Section Generation Incomplete Output Fix

## Overview

AI section generation produces broken/incomplete Liquid code due to Gemini 2.5 Flash default token limits (~8K). This plan implements a hybrid solution combining:
1. Explicit `maxOutputTokens: 65536` configuration
2. Stack-based Liquid/HTML completeness validation
3. Auto-continuation logic for truncated responses
4. UI feedback for generation status

## Phases

| Phase | Description | Effort | File |
|-------|-------------|--------|------|
| 01 | Add maxOutputTokens to AI service | 1h | [phase-01-token-limits.md](./phase-01-token-limits.md) |
| 02 | Create Liquid completeness validator | 2h | [phase-02-liquid-validation.md](./phase-02-liquid-validation.md) |
| 03 | Add auto-continuation logic | 3h | [phase-03-auto-continuation.md](./phase-03-auto-continuation.md) |
| 04 | Add UI feedback for completion status | 1h | [phase-04-ui-feedback.md](./phase-04-ui-feedback.md) |

## Dependencies

- **Phase 02** depends on **Phase 01** (token limits prevent most truncation)
- **Phase 03** depends on **Phase 02** (needs validator to detect incomplete)
- **Phase 04** depends on **Phase 03** (needs completion status from backend)

## Key Files

- `app/services/ai.server.ts` - AI generation service (Phases 01, 03)
- `app/utils/code-extractor.ts` - Code extraction + validation (Phase 02)
- `app/routes/api.chat.stream.tsx` - SSE streaming endpoint (Phase 03)
- `app/components/chat/CodeBlock.tsx` - Code display (Phase 04)

## Success Metrics

- Zero truncated Liquid sections in production
- `finishReason` logged for all generations
- Auto-continuation triggers < 5% of generations
- User sees clear feedback when continuation occurs

## Rollback Strategy

Feature flags per phase:
- `FLAG_MAX_OUTPUT_TOKENS=true` - Phase 01
- `FLAG_VALIDATE_LIQUID=true` - Phase 02
- `FLAG_AUTO_CONTINUE=true` - Phase 03

Disable flag to revert to previous behavior without deployment.

## Validation Summary

**Validated:** 2026-01-26
**Questions asked:** 7

### Confirmed Decisions

| Decision | Choice |
|----------|--------|
| Token limit | 65,536 tokens (max) - covers 90%+ of truncation |
| Continuation UX | Stream tokens in real-time to client |
| Feature flags | Environment variables (simple, redeploy to change) |
| HTML validation | Lenient - only error on 3+ unclosed tags |
| Persist completion status | Yes - add `wasComplete`, `continuationCount` to Message model |
| Save incomplete sections | Yes - save with warning flag rather than losing work |
| Deployment strategy | Phase 01 first, then remaining phases |

### Action Items

- [ ] Add `wasComplete` and `continuationCount` fields to Message model (Phase 03/04)
- [ ] Ensure incomplete sections save with warning flag (Phase 03)
- [ ] Plan Phase 01 as standalone deployment before other phases

### Deployment Order

1. **Deploy Phase 01** → Monitor for 24-48h
2. **Deploy Phase 02+03+04** → Bundled with validation + continuation
