# IndexTable Filtering, Search & Sorting Research

**Date**: 2025-12-22
**Source**: Polaris React v13+ | https://polaris-react.shopify.com/components/tables/index-table

## 1. Architecture Overview

IndexTable uses **IndexFilters** companion component for unified control management. Data flow:
- User input → IndexFilters state → Table filtering/sorting/pagination
- Filters defined as objects, applied filters tracked separately
- Search is independent of structural filters

## 2. Filtering Pattern

### Filter Definition Structure
```tsx
const filters = [
  {
    key: 'status',           // Unique identifier
    label: 'Status',         // Display label
    filter: <ChoiceList />,  // UI component (ChoiceList, RangeSlider, etc.)
    shortcut: true,          // Show in quick-access bar
  },
];
```

### Applied Filters Handling
```tsx
const appliedFilters = [];
if (selectedStatus?.length) {
  appliedFilters.push({
    key: 'status',
    label: `Status: ${selectedStatus.join(', ')}`,
    onRemove: () => setSelectedStatus([]),  // Clear callback
  });
}
```

**Key Pattern**: Filters are *defined* separately from *applied* filters. Applied filters are computed based on state.

## 3. Search Implementation

### Basic Search with Query
```tsx
const [queryValue, setQueryValue] = useState('');

<IndexFilters
  queryValue={queryValue}
  queryPlaceholder="Search items..."
  onQueryChange={(value) => setQueryValue(value)}
  onQueryClear={() => setQueryValue('')}
/>
```

### Search-as-You-Type
```tsx
// Client-side: Filter data immediately
const filtered = data.filter(item =>
  item.name.toLowerCase().includes(queryValue.toLowerCase())
);

// Server-side: Debounce API calls
const debouncedSearch = useCallback(
  debounce((query) => fetchData({ query }), 300),
  []
);

<IndexFilters onQueryChange={debouncedSearch} />
```

**Integration**: Search query is passed separately to IndexFilters; merchants expect real-time filtering.

## 4. Sorting Configuration

### Sort Options Structure
```tsx
const sortOptions: IndexFiltersProps['sortOptions'] = [
  { label: 'Name', value: 'name asc', directionLabel: 'A-Z' },
  { label: 'Name', value: 'name desc', directionLabel: 'Z-A' },
  { label: 'Created', value: 'created asc', directionLabel: 'Newest' },
  { label: 'Created', value: 'created desc', directionLabel: 'Oldest' },
];

const [sortSelected, setSortSelected] = useState(['name asc']);

<IndexFilters
  sortOptions={sortOptions}
  sortSelected={sortSelected}
  onSort={(value) => setSortSelected(value)}
/>
```

**Pattern**: Sort value format is `{field} {direction}`. Dropdown shows label, direction shows hint.

## 5. Pagination

### Props Configuration
```tsx
<IndexTable
  resourceName={{ singular: 'order', plural: 'orders' }}
  itemCount={totalCount}
  selectedItemsCount={selectedCount === 'all' ? 'all' : selectedCount.length}
  onSelectionChange={setSelectedCount}
  pagination={{
    hasNext: offset + limit < totalCount,
    hasPrevious: offset > 0,
    onNext: () => setOffset(offset + limit),
    onPrevious: () => setOffset(offset - limit),
  }}
>
  {rows}
</IndexTable>
```

### Selection Across Pages
```tsx
// Enable "select all items" button
hasMoreItems={totalCount > itemsOnCurrentPage}
selectedItemsCount={
  selectAll ? 'all' : selectedIds.length
}
```

## 6. Complete Integration Example

```tsx
export function OrdersTable() {
  // State
  const [queryValue, setQueryValue] = useState('');
  const [sortSelected, setSortSelected] = useState(['created desc']);
  const [status, setStatus] = useState([]);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Fetch with filters
  const { data, loading } = useQuery(
    `orders?query=${queryValue}&status=${status}&sort=${sortSelected}&offset=${offset}&limit=${limit}`
  );

  // Filters definition
  const filters = [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          choices={[
            { label: 'Active', value: 'active' },
            { label: 'Archived', value: 'archived' },
          ]}
          selected={status}
          onChange={setStatus}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  // Applied filters
  const appliedFilters = status.length
    ? [{ key: 'status', label: `Status: ${status.join(', ')}`, onRemove: () => setStatus([]) }]
    : [];

  return (
    <>
      <IndexFilters
        sortOptions={[
          { label: 'Created', value: 'created asc', directionLabel: 'Oldest' },
          { label: 'Created', value: 'created desc', directionLabel: 'Newest' },
        ]}
        sortSelected={sortSelected}
        onSort={setSortSelected}
        queryValue={queryValue}
        queryPlaceholder="Search orders..."
        onQueryChange={setQueryValue}
        filters={filters}
        appliedFilters={appliedFilters}
        onClearAll={() => {
          setStatus([]);
          setQueryValue('');
        }}
      />
      <IndexTable
        resourceName={{ singular: 'order', plural: 'orders' }}
        itemCount={data?.length || 0}
        pagination={{
          hasNext: offset + limit < (data?.total || 0),
          hasPrevious: offset > 0,
          onNext: () => setOffset(offset + limit),
          onPrevious: () => setOffset(offset - limit),
        }}
        loading={loading}
      >
        {/* Table rows */}
      </IndexTable>
    </>
  );
}
```

## 7. Integration Considerations

1. **State Management**: Keep filter/sort/query in URL or state management for bookmarking
2. **Performance**: Debounce search queries (300ms recommended), paginate >50 items
3. **UX**: Show applied filters as removable chips, support clear-all action
4. **API Contract**: Build API to accept query/filter/sort/offset/limit parameters
5. **Loading States**: Show skeleton rows during data fetch, disable controls during loading
6. **Shortcuts**: Set `shortcut: true` for commonly-used filters to appear in top bar

## Key Takeaways

- **IndexFilters** is required companion; manage filter/sort/search state separately
- **Applied filters** computed from state, not hardcoded
- **Search** is query string, filters are structured selections
- **Sorting** uses `{field} {direction}` format value
- **Pagination** via offset/limit or cursor-based patterns
- All components support loading states and selection across pages
