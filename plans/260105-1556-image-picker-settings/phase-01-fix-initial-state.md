# Phase 1: Fix Initial State for image_picker

## Context Links

- [Scout Report](./scout/scout-codebase-report.md)
- [Shopify Docs Research](./research/researcher-01-shopify-docs.md)
- [parseSchema.ts](../../app/components/preview/schema/parseSchema.ts)

## Overview

**Priority:** P1
**Status:** Pending
**Effort:** 30m

Change `buildInitialState()` to return empty string `''` for `image_picker` type instead of `'placeholder'` string. This aligns with Shopify's nil behavior.

## Key Insights

- Shopify `image_picker` returns `nil` when no image selected (no default support)
- Current code returns `'placeholder'` which breaks Liquid `image_url` filter
- Empty string `''` is truthy-false in Liquid, matches expected nil behavior

## Requirements

**Functional:**
- `buildInitialState()` returns `''` for image_picker settings
- Settings panel correctly shows empty state UI

**Non-Functional:**
- No breaking changes to existing saved sections
- TypeScript types remain compatible

## Related Code Files

**Modify:**
- `app/components/preview/schema/parseSchema.ts` (line 194-196)

**Verify:**
- `app/components/preview/settings/ImageSetting.tsx` - already handles empty value
- `app/components/preview/settings/SettingsPanel.tsx` - passes value correctly

## Implementation Steps

1. Open `app/components/preview/schema/parseSchema.ts`
2. Locate `buildInitialState()` function (line 148)
3. Find `case 'image_picker':` block (line 194-196)
4. Change:
   ```typescript
   // FROM:
   case 'image_picker':
     state[setting.id] = 'placeholder';
     break;

   // TO:
   case 'image_picker':
     state[setting.id] = '';
     break;
   ```
5. Run TypeScript check: `npx tsc --noEmit`
6. Test in dev: generate section with image_picker, verify empty state

## Todo List

- [ ] Update `buildInitialState()` to return `''` for image_picker
- [ ] Verify TypeScript compilation
- [ ] Test ImageSetting component shows "Select" button
- [ ] Test preview shows placeholder (after Phase 3)

## Success Criteria

- `buildInitialState()` returns `''` for image_picker settings
- ImageSetting shows dashed border + "Select" button for empty value
- No TypeScript errors

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaks existing sections | Existing sections have actual URLs stored, unaffected |
| ImageSetting doesn't handle empty | Already handles empty (shows "Select" UI) |

## Security Considerations

None - internal state change only.

## Next Steps

Proceed to Phase 2: Update AI Prompt to generate conditional image rendering.
