# Redirect to Edit Screen After Section Save

## Overview

Update section creation workflow to redirect users to `/sections/:id` (Edit Section screen) after saving, improving UX by providing immediate access to edit saved sections.

## Current State

- **Create flow** (`app.sections.new.tsx`): User generates section, saves to theme, stays on same page with success banner
- **Edit flow** (`app.sections.$id.tsx`): Full editing capabilities with section metadata display
- **Section model**: Already captures `id`, `shop`, `prompt`, `code`, `themeId`, `status`, etc.

## Proposed Change

After "Save to theme" or "Save draft" actions:
1. Save section to database (already happening)
2. Return section ID in action response
3. Redirect to `/sections/:id` to continue editing

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 01](./phase-01-backend-response.md) | Update action response to return sectionId for redirect | ✅ DONE |
| [Phase 02](./phase-02-frontend-redirect.md) | Implement frontend redirect after successful save | ✅ DONE |

## Files Impacted

- `app/routes/app.sections.new.tsx` - Add redirect logic after save
- `app/types/index.ts` - Update `SaveActionData` type to include `sectionId`

## Success Criteria

- [x] Save action returns section ID
- [x] Frontend redirects to `/sections/:id` after successful save
- [x] User can immediately continue editing saved section
- [x] Error cases remain on current page with error message

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Navigation breaks embedded app | Medium | Use `navigate` from react-router, not `redirect` |
| Loss of unsaved state | Low | Save happens before redirect, state persisted in DB |
| UX confusion on redirect | Low | Clear redirect behavior, edit page shows saved status |

## Dependencies

- None (self-contained change)

## Estimated Complexity

**Low** - Minor changes to 2 files, well-defined behavior

## Implementation Details

### New Save Flow Architecture

The implementation expanded the save workflow to support two distinct save paths:

1. **Generate Flow** (No Database Save)
   - User generates section preview via Liquid template
   - Section exists only in-memory
   - No database persistence at this stage

2. **Save Draft / Publish to Theme Flow**
   - Save Draft: Persists section to database with `status: "draft"`
   - Publish to Theme: Persists section and publishes to Shopify theme with `status: "published"`

### Updated Workflow

**Create Page (`app.sections.new.tsx`)**
- Action response returns `{ success: true, sectionId: string }`
- Frontend redirects to `/sections/{sectionId}` for edit page
- Edit page displays full section details with success status

**Edit Page (`app.sections.$id.tsx`)**
- Full editing capabilities maintained
- Save Draft button: Saves changes, shows "Section saved" toast
- Publish button: Publishes to theme, shows "Section saved" toast
- Both actions persist changes to database

### UI/UX Enhancements

- Toast notification: "Section saved" appears on successful save
- Both create and edit pages have consistent Save Draft + Publish buttons
- Redirect on create ensures immediate context switching to edit mode
- Error cases remain on current page with error messages

## Completion Status

✅ Phase 01 - DONE
- Backend response returns section ID
- Proper error handling for failed saves
- Database persistence working correctly

✅ Phase 02 - DONE
- Frontend redirect implemented after save
- Toast notifications configured
- Navigation works correctly in Shopify embedded app context

✅ All Success Criteria - COMPLETED
- Save action returns section ID ✓
- Frontend redirects to `/sections/:id` after successful save ✓
- User can immediately continue editing saved section ✓
- Error cases remain on current page with error message ✓
