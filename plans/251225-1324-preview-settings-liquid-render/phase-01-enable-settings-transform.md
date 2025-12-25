# Phase 1: Enable Settings Transform Flag

## Objective
Enable the existing `transformSectionSettings` option to rewrite `section.settings.X` references in Liquid code.

## Change Summary
**Single line change** in `api.proxy.render.tsx`

## Implementation

### File: `app/routes/api.proxy.render.tsx`
**Lines 105-112** - Add `transformSectionSettings: true`

**Before:**
```typescript
const wrappedCode = wrapLiquidForProxy({
  liquidCode: code,
  sectionId: sectionId ?? undefined,
  productHandle: productHandle ?? undefined,
  collectionHandle: collectionHandle ?? undefined,
  settings: settings ?? undefined,
  blocks: blocks ?? undefined,
});
```

**After:**
```typescript
const wrappedCode = wrapLiquidForProxy({
  liquidCode: code,
  sectionId: sectionId ?? undefined,
  productHandle: productHandle ?? undefined,
  collectionHandle: collectionHandle ?? undefined,
  settings: settings ?? undefined,
  blocks: blocks ?? undefined,
  transformSectionSettings: true,
});
```

## Verification Steps
1. Run existing tests: `npm test -- settings-transform`
2. Run liquid-wrapper tests: `npm test -- liquid-wrapper`
3. Manual test: Create section with `{{ section.settings.title }}`, verify preview shows value from settings panel

## Testing Commands
```bash
npm test -- app/utils/__tests__/settings-transform.server.test.ts
npm test -- app/utils/__tests__/liquid-wrapper.server.test.ts
```

## Rollback
Remove `transformSectionSettings: true` line if issues arise.

## Effort
- Development: 5 minutes
- Testing: 15 minutes

## Status
**Status**: ✅ COMPLETE
**Completion Date**: 2025-12-25
**Timestamp**: 2025-12-25T13:36:00Z
**Notes**: Phase 1 implementation complete. Single-line change applied to api.proxy.render.tsx enabling transformSectionSettings flag. All tests passing.
