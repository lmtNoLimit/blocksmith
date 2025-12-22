# Research: Polaris React IndexTable Core Documentation
**Date**: 2025-12-22 | **Topic**: IndexTable API, Selection, Basic Implementation

---

## Core API Props

### Required Props
- **`headings`** – Non-empty array of column headers with optional `id`, `alignment`, `hidden`, and tooltip
- **`resourceName`** – Object `{singular: string, plural: string}` for accessibility
- **`itemCount`** – Total number of items (integer)
- **`selectable`** – Boolean (default: true) enables row checkboxes

### Selection Management Props
- **`selectedItemsCount`** – Number selected or `"All"` for select-all state
- **`onSelectionChange`** – Callback fired on checkbox changes

### Optional Props
- **`lastColumnSticky`** – Boolean; keeps last column visible on scroll
- **`hasZebraStriping`** – Boolean; alternate row background colors
- **`pagination`** – `{hasNext: boolean, onNext: () => void}`
- **`promotedBulkActions`** – Array of primary bulk actions
- **`bulkActions`** – Array of secondary bulk actions
- **`condensed`** – Boolean; hides bulk actions on small screens
- **`emptyState`** – React node for no-data state
- **`sort`** – React node for custom sort UI

---

## Row & Cell Composition

### IndexTable.Row Props
```typescript
<IndexTable.Row
  id="unique-id"              // Required: unique identifier
  position={index}            // Required: 0-based position for shift-click
  selected={isSelected}       // Boolean
  key={row.id}                // React key
  disabled={false}            // Optional: prevent selection
  rowType="subheader"         // Optional: "subheader" for grouped rows
  selectionRange={[0, 5]}     // Optional: tuple for subheader range
>
  {/* IndexTable.Cell children */}
</IndexTable.Row>
```

### IndexTable.Cell Props
```typescript
<IndexTable.Cell>
  {content}                   // Any React node
</IndexTable.Cell>
```

**Alignment**: Use within Cell via Text component `alignment="end"` for numeric columns.

---

## useIndexResourceState Hook

**Purpose**: Manages selection state for bulk operations.

```typescript
const {
  selectedResources,        // Array<string | number> of selected IDs
  allResourcesSelected,     // Boolean: is select-all active
  handleSelectionChange     // (selected: Array | 'all' | '') => void
} = useIndexResourceState(items);
```

**Parameters**:
- `items` – Array of objects with `id` property
- Options object (optional) for filtering logic

**Integration**:
```typescript
<IndexTable
  selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
  onSelectionChange={handleSelectionChange}
  {/* ...other props */}
>
  {items.map((item, index) => (
    <IndexTable.Row
      id={item.id}
      selected={selectedResources.includes(item.id)}
      position={index}
    >
      {/* cells */}
    </IndexTable.Row>
  ))}
</IndexTable>
```

---

## Column Configuration

**Heading Type**:
```typescript
type IndexTableHeading =
  | {title: string; ...}
  | {title: React.ReactNode; ...}
```

**Options**:
- `alignment` – `'start' | 'center' | 'end'` (default: 'start')
- `hidden` – Boolean; hide column on small screens
- `tooltipContent` – Tooltip text
- `defaultSortDirection` – `'ascending' | 'descending'` (v12+)

**Sorting Props** (parent IndexTable):
- `sortable` – Array of booleans parallel to headings
- `sortColumnIndex` – Current sorted column index
- `sortDirection` – `'ascending' | 'descending'`
- `onSort` – `(headingIndex: number, direction: SortDirection) => void`

---

## Basic Usage Pattern

```typescript
import { IndexTable, useIndexResourceState, Page, Card } from '@shopify/polaris';

export function OrdersTable({orders}) {
  const {selectedResources, allResourcesSelected, handleSelectionChange} =
    useIndexResourceState(orders);

  return (
    <Page>
      <Card>
        <IndexTable
          resourceName={{singular: 'order', plural: 'orders'}}
          itemCount={orders.length}
          selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          headings={[
            {title: 'Order'},
            {title: 'Amount', alignment: 'end'},
            {title: 'Date'},
          ]}
        >
          {orders.map((order, idx) => (
            <IndexTable.Row
              id={order.id}
              key={order.id}
              selected={selectedResources.includes(order.id)}
              position={idx}
            >
              <IndexTable.Cell>{order.name}</IndexTable.Cell>
              <IndexTable.Cell>
                <Text alignment="end" numeric>${order.total}</Text>
              </IndexTable.Cell>
              <IndexTable.Cell>{order.date}</IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>
    </Page>
  );
}
```

---

## Key TypeScript Types

```typescript
export interface IndexTableProps extends IndexTableBaseProps {
  headings: NonEmptyArray<IndexTableHeading>;
  itemCount: number;
  resourceName: {singular: string; plural: string};
  selectable?: boolean;
  selectedItemsCount?: number | 'All';
  onSelectionChange?: (selected: string[] | 'all' | '') => void;
  sortable?: boolean[];
  sortColumnIndex?: number;
  sortDirection?: 'ascending' | 'descending';
  onSort?: (headingIndex: number, direction: 'ascending' | 'descending') => void;
}
```

**Required Imports**:
```typescript
import {
  IndexTable,
  useIndexResourceState,
  Card,
  Page,
  Text,
  ResourceList, // for complex layouts
} from '@shopify/polaris';
```

---

## Important Notes & Gotchas

1. **Position Prop Essential** – Required for shift+click range selection and A11y
2. **Numeric Columns** – Right-align with Text component's `alignment="end"` and `numeric` props
3. **Row ID Uniqueness** – Must be unique within table; used for selection tracking
4. **Mobile Behavior** – Bulk actions intentionally hidden on mobile; use native app instead
5. **Subheaders** – Set `rowType="subheader"`, unique cell `id`, cell `as="th"`, and `selectionRange` tuple
6. **Sort Direction Type** – `'ascending' | 'descending'` (lowercase)
7. **v12 Migration** – `status` prop → `tone`; `subdued` boolean → `tone="subdued"`
8. **Empty State** – Pass React node to `emptyState` prop, not separate component
9. **Heading Title** – Accept string OR React node for flexible headers
10. **Pagination** – Only requires `hasNext` and `onNext` callback

---

## Sources

- [Shopify Polaris React IndexTable](https://polaris-react.shopify.com/components/tables/index-table)
- [GitHub: IndexTable.tsx](https://github.com/Shopify/polaris/blob/main/polaris-react/src/components/IndexTable/IndexTable.tsx)
- [Resource Index Layout Pattern](https://polaris-react.shopify.com/patterns/resource-index-layout)
- [Migration Guide v11→v12](https://polaris-react.shopify.com/version-guides/migrating-from-v11-to-v12)
