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

- **Phase 1**: Single line change - add `transformSectionSettings: true` to wrapLiquidForProxy call
- **Phase 2**: Extend `rewriteSectionSettings()` for edge cases (filters, assign statements, whitespace)
- **Phase 3**: Optional - Add `rewriteBlocksIteration()` for `for block in section.blocks` syntax

## Key Files

| File | Change |
|------|--------|
| `app/routes/api.proxy.render.tsx:105-112` | Add `transformSectionSettings: true` |
| `app/utils/settings-transform.server.ts:136-142` | Enhance regex (Phase 2) |
| `app/utils/__tests__/settings-transform.server.test.ts` | Add edge case tests |

## Dependencies
- None (all code exists, just needs enabling)

## Risks
1. **Regex limitations**: `rewriteSectionSettings()` uses simple regex; may break with complex Liquid patterns (nested quotes, assign chaining)
2. **Block iteration**: `for block in section.blocks` remains unsupported; templates must use `block_N_X` pattern directly

## Success Criteria
- `{{ section.settings.title }}` renders as value from Preview Settings panel
- Existing test suite passes
- No regression in other preview functionality
