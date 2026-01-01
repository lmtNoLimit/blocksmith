---
title: "Section Creation UX Refinement"
description: "Streamline section creation flow with auto-generation and version persistence"
status: in-progress
priority: P1
effort: 3h
branch: main
tags: [ux, section-creation, versioning, auto-apply]
created: 2026-01-01
updated: 2026-01-01
---

# Section Creation UX Refinement Plan

## Problem Statement

Current workflow has friction points:
1. User submits prompt → navigates to editor → must wait for AI to respond before seeing result
2. AI generates section but latest version not auto-applied (confusing)
3. "Save Draft" button exists but new workflow auto-applies versions (obsolete)
4. Page reload loses selected version state (no persistence)

## Desired Flow

```
[New Section] → [Enter Prompt] → [Submit]
       ↓
[Create section + conversation + user message]
       ↓
[Navigate to editor with ?autoGenerate=true]
       ↓
[ChatPanel auto-triggers generation on load]
       ↓
[AI generates → version created → auto-applied to preview]
       ↓
[User refines or publishes]
```

## Changes Summary

| Change | Files | Effort |
|--------|-------|--------|
| Add URL param to signal auto-generation | app.sections.new.tsx | 15m |
| Auto-save draft on version apply | useVersionState.ts | 30m |
| Remove "Save Draft" button | app.sections.$id.tsx | 15m |
| Persist active version in URL | app.sections.$id.tsx, useEditorState.ts | 45m |
| Restore version from URL on load | loader, useVersionState.ts | 45m |

**Total estimated effort: 2.5-3 hours**

## Implementation Phases

### Phase 1: Auto-Save on Version Apply (45min)
See: `phases/phase-1-auto-save.md`

When AI generates code and it's auto-applied:
- Auto-save to Section.code (persist draft)
- No explicit "Save Draft" action needed for AI-generated content
- Keep Ctrl+S shortcut for manual saves during editing

### Phase 2: Remove Save Draft Button (15min)
See: `phases/phase-2-remove-save-draft.md`

- Remove "Save Draft" button from UI
- Keep Ctrl+S keyboard shortcut (silent save)
- Update dirty indicator logic

### Phase 3: URL-Based Version Persistence (1h)
See: `phases/phase-3-version-persistence.md`

- Add `?v={versionId}` query param for active version
- Update URL when version applied
- Restore version from URL on page load/reload

### Phase 4: Clean Up Auto-Generation Flow (30min)
See: `phases/phase-4-clean-auto-generation.md`

- Add `?autoGenerate=true` param to navigation
- Ensure ChatPanel auto-trigger only fires once
- Add loading indicator during initial generation

## File Changes

### app/routes/app.sections.new.tsx
- Line 107: Add `?autoGenerate=true` to navigate URL

### app/routes/app.sections.$id.tsx
- Lines 443-450: Remove Save Draft button
- Lines 336-343: Remove handleSaveDraft keyboard shortcut (keep Ctrl+S internal)
- Add version URL param handling in loader

### app/components/editor/hooks/useVersionState.ts
- Lines 96-113: Trigger draft save on auto-apply
- Add callback for URL param update

### app/components/editor/hooks/useEditorState.ts
- Add version restoration from URL params

## Edge Cases

1. **Reload during streaming**: Version not yet created, show loading state
2. **Invalid version ID in URL**: Fall back to latest or draft
3. **Version deleted**: Handle gracefully, show current draft
4. **Race condition**: Multiple rapid generates, ensure last wins

## Testing Checklist

- [ ] Create new section → auto-generates on load
- [ ] AI response auto-applies to preview
- [ ] Auto-save persists to database
- [ ] Reload preserves active version
- [ ] Version selection updates URL
- [ ] Invalid version ID handled
- [ ] Keyboard shortcut Ctrl+S works
- [ ] No "Save Draft" button visible

## Rollback Plan

If issues arise:
1. Revert URL param changes (non-breaking)
2. Re-add Save Draft button if auto-save fails
3. Keep version state local-only if URL persistence breaks

## Validation Summary

**Validated:** 2026-01-01
**Questions asked:** 8

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Manual code edits auto-save? | No - require Ctrl+S for manual edits |
| Auto-save feedback | Silent - no toast/notification |
| Debounce during rapid AI? | Not needed - UI blocks during streaming |
| Browser history for versions? | No - use replaceState (no back/forward) |
| Reload with version URL | Restore as working draft (Bolt.new style) |
| Revert button | Remove - rely on version history |

### Action Items Based on Validation

- [x] Clarified: No debounce needed since UI blocks new prompts during streaming
- [ ] Update Phase 2: Also remove "Revert" button (not just Save Draft)
- [ ] Confirm: URL version restore applies code to draft on reload

### Design Reference

Following [Bolt.new version history pattern](https://support.bolt.new/concepts/version-history-github):
- Versions are restorable checkpoints
- Selected version becomes active working draft
- Streamlined UI without redundant save/revert actions

## Completion Status

### Phase 1: Auto-Save on Version Apply - COMPLETED (2026-01-01)

**Status**: DONE
**Completion Time**: 2026-01-01 09:37
**Effort**: 45 minutes (as planned)

**Changes Implemented**:
- Added `onAutoSave` callback to `UseVersionStateOptions` interface in `useVersionState.ts`
- Implemented auto-save trigger in version apply effect - calls `onAutoSave?.(latestVer.code)` when new version is applied
- Created `handleAutoSave` function in `useEditorState.ts` using `useFetcher()` for silent persistence
- Integrated `onAutoSave: handleAutoSave` callback in `useVersionState` hook initialization
- Auto-generated AI code now persists to database immediately upon apply without user action

**Files Modified**:
- `app/components/editor/hooks/useVersionState.ts` - Added callback support and trigger logic
- `app/components/editor/hooks/useEditorState.ts` - Implemented auto-save handler with fetcher

**Testing Verified**:
- AI-generated code auto-persists when version applied
- Silent save (no UI notifications)
- Page reload preserves persisted code
- Handles multiple rapid saves correctly (fetcher queues properly)

**Next Phase**: Phase 2 - Remove Save Draft Button (pending start)
