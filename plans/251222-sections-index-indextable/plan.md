# Plan: Migrate Sections Index to Polaris React IndexTable

**Created**: 2025-12-22 | **Status**: Planning

## Summary

Migrate `app.sections._index.tsx` from Shopify s-table web components to Polaris React IndexTable + IndexFilters. Current 409-line file uses s-* components that have issues; target state uses battle-tested Polaris React patterns with proper filtering, search, sorting, and bulk actions.

## Current State

- `app/routes/app.sections._index.tsx` - 409 lines, s-table based
- `app/components/sections/SectionsEmptyState.tsx` - 79 lines, s-* components
- `app/components/sections/DeleteConfirmModal.tsx` - 56 lines, s-modal
- Loader/action already support: pagination, search, status, favorites, sort

## Target State

- IndexTable with row selection via `useIndexResourceState`
- IndexFilters with search, status filter, sort dropdown
- Keep s-modal for delete confirmation (works fine)
- Keep s-* EmptyState component (works fine)
- URL param persistence for filter/sort state

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Core IndexTable migration - replace s-table with IndexTable | Pending |
| 02 | IndexFilters integration - search, filters, sort | Pending |

## Key Dependencies

- `@shopify/polaris` v13.9.5 (installed)
- Existing service layer supports all query params
- Loader/action functions preserved as-is

## Architecture Decision

- Keep route file as orchestrator (~150 lines target)
- Extract table row rendering to separate component if needed
- Reuse existing service API contract
- URL params for state persistence (already implemented in loader)

## Files to Modify

1. `app/routes/app.sections._index.tsx` - Replace s-table with IndexTable + IndexFilters

## Success Criteria

- [ ] IndexTable renders sections with selection checkboxes
- [ ] Search filters by name/prompt
- [ ] Status filter works (saved/draft)
- [ ] Sort by newest/oldest
- [ ] Pagination preserved
- [ ] Bulk delete via promoted action
- [ ] Row click navigates to edit page
- [ ] All URL params persist state
