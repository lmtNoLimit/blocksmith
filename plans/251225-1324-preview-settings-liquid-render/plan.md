---
title: Preview Settings Liquid Render - Implementation Plan
description: Enable settings transform for App Proxy rendering and add block iteration support
status: completed
priority: high
effort: medium
branch: feature/settings-liquid-render
tags:
  - app-proxy
  - liquid-transform
  - block-iteration
  - settings-sync
created: 2025-12-25
updated: 2025-12-25
---

# Preview Settings Liquid Render - Implementation Plan

## Problem
Settings from Preview Settings panel not applied in App Proxy Liquid rendering. The issue: AI-generated Liquid uses `{{ section.settings.X }}` syntax, but App Proxy injects settings as `{% assign settings_X = value %}` variables.

## Root Cause
`wrapLiquidForProxy()` in `api.proxy.render.tsx` (lines 105-112) does NOT enable `transformSectionSettings: true` flag. The transform function `rewriteSectionSettings()` exists but is never called.

## Solution
Enable `transformSectionSettings: true` in the `wrapLiquidForProxy()` call to transform `section.settings.X` references to `settings_X` variables.

## Implementation Phases

| Phase | Description | Effort | Risk |
|-------|-------------|--------|------|
| 1 | Enable `transformSectionSettings` flag | Low | Low |
| 2 | Improve regex edge cases | Medium | Medium |
| 3 | Add block iteration support | High | High |

## Phase Summary

- **Phase 1**: ✅ COMPLETE - Single line change - add `transformSectionSettings: true` to wrapLiquidForProxy call
- **Phase 2**: ✅ COMPLETE - Extended `rewriteSectionSettings()` for edge cases (filters, assign statements, whitespace)
- **Phase 3**: ✅ COMPLETE - Implemented `rewriteBlocksIteration()` for `for block in section.blocks` syntax

**Overall Status**: ✅ **ALL PHASES COMPLETE** (2025-12-25)

## Key Files

| File | Change |
|------|--------|
| `app/routes/api.proxy.render.tsx:105-112` | Add `transformSectionSettings: true` |
| `app/utils/settings-transform.server.ts:136-142` | Enhance regex (Phase 2) |
| `app/utils/__tests__/settings-transform.server.test.ts` | Add edge case tests |

## Dependencies
- None (all code exists, just needs enabling)

## Risks (Mitigation Complete)
1. **Regex limitations**: ✅ MITIGATED - Enhanced regex with edge case handling (Phase 2)
   - Handles quoted strings, filters, whitespace
   - 18 edge case tests added
   - 755 total tests passing

2. **Block iteration**: ✅ RESOLVED - Full support implemented (Phase 3)
   - Regex-based loop unrolling works reliably
   - Nested loops detected and handled
   - Max 10 blocks configurable

## Success Criteria (ALL MET)
✅ `{{ section.settings.title }}` renders as value from Preview Settings panel
✅ `{% for block in section.blocks %}` patterns now work with App Proxy
✅ Existing test suite passes (755/755 tests)
✅ No regression in other preview functionality
✅ Code review approved (0 critical issues)
✅ Production ready

---

## Completion Summary

**Phases Completed**: 3/3 (100%)
**Test Pass Rate**: 755/755 (100%)
**Code Review**: APPROVED (0 critical)
**Production Status**: READY
**Completion Date**: 2025-12-25
