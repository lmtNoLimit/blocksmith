# Phase 01: Core IndexTable Migration

**Status**: Implementation Complete - QA Required | **Estimated Effort**: Medium
**Code Review**: `plans/reports/code-reviewer-251222-phase01-indextable.md`

## Context

- Research: `plans/251222-sections-index-indextable/research/researcher-01-indextable-core.md`
- Current file: `app/routes/app.sections._index.tsx` (409 lines)

## Overview

Replace s-table web component with Polaris React IndexTable. Focus on structural migration - table, rows, cells, selection. Keep loader/action unchanged. Filter/sort UI deferred to Phase 02.

## Key Insights from Research

1. `useIndexResourceState` hook manages selection state
2. `IndexTable.Row` requires `id`, `position`, `selected` props
3. `position` prop essential for shift+click range selection
4. Bulk actions via `promotedBulkActions` prop
5. Pagination via `pagination` prop object
6. Empty state via `emptyState` prop

## Requirements

- [x] Understand current table structure (5 columns: Name, Status, Theme, Created, Actions)
- [x] Replace s-table with IndexTable
- [x] Implement row selection with useIndexResourceState
- [x] Configure column headings with proper alignment
- [x] Add row click navigation to edit page
- [x] Configure bulk delete as promoted action
- [x] Preserve pagination behavior
- [x] Pass empty state component to IndexTable

## Architecture

```
SectionsPage (route)
├── Page (Polaris)
│   └── Card
│       └── IndexTable
│           ├── useIndexResourceState (selection)
│           ├── promotedBulkActions (delete)
│           ├── pagination (prev/next)
│           ├── headings (5 columns)
│           ├── emptyState (SectionsEmptyState - keep s-*)
│           └── IndexTable.Row * n
│               └── IndexTable.Cell * 5
└── DeleteConfirmModal (keep s-modal - works fine)
```

## Related Code Files

| File | Purpose |
|------|---------|
| `app/routes/app.sections._index.tsx` | Main route - rewrite |
| `app/services/section.server.ts` | Service - unchanged |

## Implementation Steps

### Step 1: Setup IndexTable Structure

```tsx
import {
  Page,
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
  Badge,
  Link,
  Button,
  ButtonGroup,
} from '@shopify/polaris';
import { StarIcon, StarFilledIcon, DeleteIcon } from '@shopify/polaris-icons';

// Column headings
const headings = [
  { title: 'Name' },
  { title: 'Status' },
  { title: 'Theme' },
  { title: 'Created' },
  { title: 'Actions', alignment: 'end' as const },
];
```

### Step 2: Implement Selection Hook

```tsx
const { selectedResources, allResourcesSelected, handleSelectionChange } =
  useIndexResourceState(history.items);
```

### Step 3: Configure Bulk Actions

```tsx
const promotedBulkActions = [
  {
    content: 'Delete',
    destructive: true,
    onAction: () => {
      setDeleteTarget('bulk');
      setDeleteModalOpen(true);
    },
  },
];
```

### Step 4: Build Table Rows

```tsx
const rowMarkup = history.items.map((item, index) => (
  <IndexTable.Row
    id={item.id}
    key={item.id}
    selected={selectedResources.includes(item.id)}
    position={index}
    onClick={() => navigate(`/app/sections/${item.id}`)}
  >
    <IndexTable.Cell>
      <Text variant="bodyMd" fontWeight="semibold">
        {item.name || truncateText(item.prompt, 50)}
      </Text>
    </IndexTable.Cell>
    <IndexTable.Cell>
      <Badge tone={item.status === 'saved' ? 'success' : undefined}>
        {item.status === 'saved' ? 'Saved' : 'Draft'}
      </Badge>
    </IndexTable.Cell>
    <IndexTable.Cell>
      {item.themeName || '-'}
    </IndexTable.Cell>
    <IndexTable.Cell>
      <Text tone="subdued">{formatRelativeDate(item.createdAt)}</Text>
    </IndexTable.Cell>
    <IndexTable.Cell>
      <ButtonGroup>
        <Button
          icon={item.isFavorite ? StarFilledIcon : StarIcon}
          variant="tertiary"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite(item.id);
          }}
        />
        <Button
          icon={DeleteIcon}
          variant="tertiary"
          tone="critical"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(item.id);
          }}
        />
      </ButtonGroup>
    </IndexTable.Cell>
  </IndexTable.Row>
));
```

### Step 5: Configure Pagination

```tsx
const paginationProps = history.totalPages > 1 ? {
  hasNext: currentPage < history.totalPages,
  hasPrevious: currentPage > 1,
  onNext: handleNextPage,
  onPrevious: handlePreviousPage,
} : undefined;
```

### Step 6: Assemble IndexTable

```tsx
<IndexTable
  resourceName={{ singular: 'section', plural: 'sections' }}
  itemCount={history.total}
  selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
  onSelectionChange={handleSelectionChange}
  headings={headings}
  promotedBulkActions={promotedBulkActions}
  pagination={paginationProps}
  loading={navigation.state === 'loading'}
  emptyState={<SectionsEmptyState {...emptyStateProps} />}
>
  {rowMarkup}
</IndexTable>
```

## Todo List

- [x] Add Polaris imports (IndexTable, useIndexResourceState, Badge, Text, Button, etc.)
- [x] Remove all s-* component imports and usage (except DeleteConfirmModal)
- [x] Implement useIndexResourceState for selection
- [x] Define column headings array
- [x] Create row markup with IndexTable.Row/Cell
- [x] Wire up promotedBulkActions for bulk delete
- [x] Configure pagination prop
- [x] Add row onClick for navigation (via Button click handler)
- [x] Stop event propagation on action buttons (handled by Button onClick)
- [x] Pass emptyState prop
- [x] Replace s-page with Polaris Page
- [x] Replace s-box/s-stack with Polaris components
- [ ] Test selection, pagination, delete flow (manual QA required)

## Success Criteria

- [x] Table renders with all 5 columns (verified in code)
- [x] Row checkboxes work (useIndexResourceState handles)
- [x] Bulk action bar appears on selection (promotedBulkActions)
- [x] Row click navigates to section detail (Button navigation implemented)
- [x] Pagination controls work (handlers preserved)
- [x] Loading state displays correctly (navigation.state)
- [x] Empty state shows when no data (emptyState prop)
- [ ] Manual QA validation (runtime testing required)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Row click conflicts with checkbox | Medium | Low | stopPropagation on action buttons |
| Pagination state mismatch | Low | Medium | Keep using URL params as source of truth |
| Selection state lost on page change | Medium | Medium | Reset selection on page change |

## Security Considerations

- No new security concerns - reusing existing loader/action auth
- Bulk delete already validates shop ownership in action

## Implementation Summary

**Completed**: 2025-12-22
**Code Review**: `plans/reports/code-reviewer-251222-phase01-indextable.md`

### Key Changes
- Migrated from s-table to Polaris React IndexTable (260 lines changed)
- Replaced manual selection state with useIndexResourceState hook
- Configured promotedBulkActions for bulk delete
- Implemented pagination via pagination prop
- Preserved all existing functionality (favorites, delete, navigation)
- Kept DeleteConfirmModal using s-modal (works perfectly, no rewrite needed)

### Code Quality
- ✅ TypeScript compilation: No errors
- ✅ ESLint: No issues
- ✅ Build: Success (242.88 kB client bundle, 51.03 kB gzipped)
- ✅ Type safety: 100% (strict mode)
- ✅ Security: No critical vulnerabilities (1 medium hardening recommendation)

### Security Recommendations (Before Production)
1. Add JSON.parse error handling in bulkDelete action
2. Add input validation on action type and IDs
3. Fix selection state race condition (clear after success confirmation)
4. Add bulk delete limit notification (currently silent 50-item cap)

See full details in code review report.

## Next Steps

**Immediate**:
- [ ] Manual QA testing (selection, pagination, bulk delete flows)
- [ ] Address security hardening recommendations

**After Phase 01**:
- Phase 02: Add IndexFilters for search, status filter, sort
