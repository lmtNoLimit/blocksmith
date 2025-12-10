# Phase 2: Missing Objects and Drops

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Dependencies**: Phase 1 (filter utilities)
- **Related Docs**: [research/researcher-01-liquid-objects.md](./research/researcher-01-liquid-objects.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-10 |
| Description | Implement missing Shopify objects as Drop classes |
| Priority | P0/P1 |
| Status | ✅ DONE (100% Complete) |
| Completed | 2025-12-10 14:30 UTC |
| Code Review | [code-reviewer-251210-phase2-objects.md](./reports/code-reviewer-251210-phase2-objects.md) |

## Key Insights

1. `forloop` and `tablerowloop` are critical for iteration metadata
2. `request.design_mode` essential for preview-specific rendering
3. `cart` and `customer` needed for commerce sections
4. `routes` object used heavily for URL generation
5. `paginate` needs proper drop with pagination UI data

## Requirements

### P0: Critical Objects

| Object | Usage | Status |
|--------|-------|--------|
| forloop | Loop iteration metadata (index, first, last, length) | Missing |
| request | design_mode, page_type, path detection | Missing |
| routes | URL generation (root_url, cart_url, etc.) | Missing |
| paginate | Pagination UI (pages, previous, next, items) | Stub only |

### P1: Commerce Objects

| Object | Usage | Status |
|--------|-------|--------|
| cart | Cart display sections (items, totals) | Types only |
| customer | Customer account, personalization | Types only |
| settings | Global theme settings access | Partial |
| theme | Theme metadata | Missing |

### P2: Content Objects

| Object | Usage | Status |
|--------|-------|--------|
| linklists | Navigation menus | Missing |
| pages | Static pages access | Missing |
| blogs | Blog listing | Types only |
| localization | Language/country selection | Missing |
| metaobjects | Custom structured data | Missing |

### Drop Property Enhancements

#### ProductDrop (add ~15 properties)

| Property | Type | Current |
|----------|------|---------|
| metafields | Object | Missing |
| media | MediaDrop[] | Missing |
| featured_media | MediaDrop | Missing |
| gift_card? | boolean | Missing |
| published_at | string | Missing |
| created_at | string | Missing |
| requires_selling_plan | boolean | Missing |
| selling_plan_groups | Array | Missing |
| quantity_price_breaks_configured? | boolean | Missing |
| template_suffix | string | Missing |

#### CollectionDrop (add ~8 properties)

| Property | Type | Current |
|----------|------|---------|
| featured_image | ImageDrop | Missing |
| current_vendor | string | Missing |
| current_type | string | Missing |
| filters | FilterDrop[] | Missing |
| template_suffix | string | Missing |
| metafields | Object | Missing |
| published_at | string | Missing |

#### ShopDrop (add ~20 properties)

| Property | Type | Current |
|----------|------|---------|
| brand | BrandDrop | Missing |
| metafields | Object | Missing |
| policies | PolicyDrop[] | Missing |
| refund_policy | PolicyDrop | Missing |
| privacy_policy | PolicyDrop | Missing |
| shipping_policy | PolicyDrop | Missing |
| terms_of_service | PolicyDrop | Missing |
| subscription_policy | PolicyDrop | Missing |
| published_locales | LocaleDrop[] | Missing |
| products_count | number | Missing |
| collections_count | number | Missing |
| types | string[] | Missing |
| vendors | string[] | Missing |
| permanent_domain | string | Missing |

## Related Code Files

- `app/components/preview/drops/` - Drop class implementations
- `app/components/preview/mockData/types.ts` - Type definitions
- `app/components/preview/utils/buildPreviewContext.ts` - Context builder
- `app/components/preview/hooks/useLiquidRenderer.ts` - Engine config

## Implementation Steps

### Step 1: Create ForloopDrop

Create `app/components/preview/drops/ForloopDrop.ts`:

```typescript
import { ShopifyDrop } from './base/ShopifyDrop';

/**
 * ForloopDrop - Loop iteration metadata
 * Available inside {% for %} loops as 'forloop'
 */
export class ForloopDrop extends ShopifyDrop {
  private _index: number;
  private _length: number;
  private _name: string;

  constructor(index: number, length: number, name = 'item') {
    super();
    this._index = index;
    this._length = length;
    this._name = name;
  }

  /** 1-based index */
  get index(): number { return this._index + 1; }

  /** 0-based index */
  get index0(): number { return this._index; }

  /** Reverse 1-based index */
  get rindex(): number { return this._length - this._index; }

  /** Reverse 0-based index */
  get rindex0(): number { return this._length - this._index - 1; }

  /** True if first iteration */
  get first(): boolean { return this._index === 0; }

  /** True if last iteration */
  get last(): boolean { return this._index === this._length - 1; }

  /** Total iterations */
  get length(): number { return this._length; }

  /** Parent forloop (for nested loops) */
  get parentloop(): ForloopDrop | null { return null; }

  /** Loop variable name */
  get name(): string { return this._name; }
}
```

### Step 2: Create RequestDrop

Create `app/components/preview/drops/RequestDrop.ts`:

```typescript
import { ShopifyDrop } from './base/ShopifyDrop';

interface RequestData {
  design_mode?: boolean;
  page_type?: string;
  path?: string;
  host?: string;
  origin?: string;
}

/**
 * RequestDrop - Request/context information
 */
export class RequestDrop extends ShopifyDrop {
  private data: RequestData;

  constructor(data: RequestData = {}) {
    super();
    this.data = {
      design_mode: true, // Always true in preview
      page_type: 'index',
      path: '/',
      host: 'preview.myshopify.com',
      origin: 'https://preview.myshopify.com',
      ...data
    };
  }

  /** True when in theme editor or preview */
  get design_mode(): boolean { return this.data.design_mode ?? true; }

  /** Current page type (product, collection, index, etc.) */
  get page_type(): string { return this.data.page_type ?? 'index'; }

  /** Current request path */
  get path(): string { return this.data.path ?? '/'; }

  /** Request host */
  get host(): string { return this.data.host ?? 'preview.myshopify.com'; }

  /** Request origin */
  get origin(): string { return this.data.origin ?? 'https://preview.myshopify.com'; }

  /** Locale from Accept-Language */
  get locale(): { iso_code: string; primary: boolean } {
    return { iso_code: 'en', primary: true };
  }
}
```

### Step 3: Create RoutesDrop

Create `app/components/preview/drops/RoutesDrop.ts`:

```typescript
import { ShopifyDrop } from './base/ShopifyDrop';

/**
 * RoutesDrop - URL generation helpers
 */
export class RoutesDrop extends ShopifyDrop {
  private baseUrl: string;

  constructor(baseUrl = '') {
    super();
    this.baseUrl = baseUrl;
  }

  get root_url(): string { return this.baseUrl || '/'; }
  get account_url(): string { return `${this.baseUrl}/account`; }
  get account_login_url(): string { return `${this.baseUrl}/account/login`; }
  get account_logout_url(): string { return `${this.baseUrl}/account/logout`; }
  get account_register_url(): string { return `${this.baseUrl}/account/register`; }
  get account_addresses_url(): string { return `${this.baseUrl}/account/addresses`; }
  get cart_url(): string { return `${this.baseUrl}/cart`; }
  get cart_add_url(): string { return `${this.baseUrl}/cart/add`; }
  get cart_change_url(): string { return `${this.baseUrl}/cart/change`; }
  get cart_clear_url(): string { return `${this.baseUrl}/cart/clear`; }
  get cart_update_url(): string { return `${this.baseUrl}/cart/update`; }
  get collections_url(): string { return `${this.baseUrl}/collections`; }
  get all_products_collection_url(): string { return `${this.baseUrl}/collections/all`; }
  get search_url(): string { return `${this.baseUrl}/search`; }
  get predictive_search_url(): string { return `${this.baseUrl}/search/suggest`; }
  get product_recommendations_url(): string { return `${this.baseUrl}/recommendations/products`; }
}
```

### Step 4: Create CartDrop

Create `app/components/preview/drops/CartDrop.ts`:

```typescript
import { ShopifyDrop } from './base/ShopifyDrop';
import { ImageDrop } from './ImageDrop';
import type { MockCart, MockCartItem } from '../mockData/types';

/**
 * CartItemDrop - Individual cart line item
 */
export class CartItemDrop extends ShopifyDrop {
  private item: MockCartItem;

  constructor(item: MockCartItem) {
    super();
    this.item = item;
  }

  get id(): number { return this.item.id; }
  get title(): string { return this.item.title; }
  get quantity(): number { return this.item.quantity; }
  get price(): number { return this.item.price; }
  get line_price(): number { return this.item.line_price; }
  get original_price(): number { return this.item.price; }
  get original_line_price(): number { return this.item.line_price; }
  get final_price(): number { return this.item.price; }
  get final_line_price(): number { return this.item.line_price; }
  get url(): string { return this.item.url; }

  get image(): ImageDrop {
    return new ImageDrop(this.item.image);
  }

  get product(): { title: string; url: string } {
    return { title: this.item.title, url: this.item.url };
  }

  get variant(): { title: string } {
    return { title: 'Default' };
  }

  get discounts(): unknown[] { return []; }
  get properties(): Record<string, string> { return {}; }
  get selling_plan_allocation(): null { return null; }
}

/**
 * CartDrop - Shopping cart object
 */
export class CartDrop extends ShopifyDrop {
  private cart: MockCart;
  private _items: CartItemDrop[] | null = null;

  constructor(cart: MockCart) {
    super();
    this.cart = cart;
  }

  get item_count(): number { return this.cart.item_count; }
  get total_price(): number { return this.cart.total_price; }
  get original_total_price(): number { return this.cart.total_price; }
  get total_discount(): number { return 0; }
  get total_weight(): number { return 0; }
  get currency(): { iso_code: string } { return { iso_code: this.cart.currency }; }

  get items(): CartItemDrop[] {
    if (!this._items) {
      this._items = this.cart.items.map(item => new CartItemDrop(item));
    }
    return this._items;
  }

  get items_subtotal_price(): number { return this.cart.total_price; }
  get requires_shipping(): boolean { return true; }
  get note(): string { return ''; }
  get attributes(): Record<string, string> { return {}; }
  get cart_level_discount_applications(): unknown[] { return []; }
  get discount_applications(): unknown[] { return []; }

  /** Check if cart is empty */
  get empty?(): boolean { return this.cart.item_count === 0; }
}
```

### Step 5: Create CustomerDrop

Create `app/components/preview/drops/CustomerDrop.ts`:

```typescript
import { ShopifyDrop } from './base/ShopifyDrop';
import type { MockCustomer } from '../mockData/types';

/**
 * CustomerDrop - Logged-in customer data
 */
export class CustomerDrop extends ShopifyDrop {
  private customer: MockCustomer | null;

  constructor(customer: MockCustomer | null) {
    super();
    this.customer = customer;
  }

  get id(): number | null { return this.customer?.id ?? null; }
  get email(): string { return this.customer?.email ?? ''; }
  get first_name(): string { return this.customer?.first_name ?? ''; }
  get last_name(): string { return this.customer?.last_name ?? ''; }
  get name(): string { return this.customer?.name ?? ''; }
  get orders_count(): number { return this.customer?.orders_count ?? 0; }
  get total_spent(): number { return this.customer?.total_spent ?? 0; }

  get phone(): string { return ''; }
  get default_address(): null { return null; }
  get addresses(): unknown[] { return []; }
  get orders(): unknown[] { return []; }
  get tags(): string[] { return []; }
  get tax_exempt(): boolean { return false; }
  get accepts_marketing(): boolean { return false; }
  get has_account(): boolean { return this.customer !== null; }

  /** Liquid truthy check */
  valueOf(): boolean { return this.customer !== null; }
}
```

### Step 6: Create PaginateDrop

Create `app/components/preview/drops/PaginateDrop.ts`:

```typescript
import { ShopifyDrop } from './base/ShopifyDrop';

interface PaginateData {
  current_page: number;
  page_size: number;
  total_items: number;
}

/**
 * PaginateDrop - Pagination metadata for paginated collections
 */
export class PaginateDrop extends ShopifyDrop {
  private data: PaginateData;

  constructor(data: PaginateData) {
    super();
    this.data = data;
  }

  get current_page(): number { return this.data.current_page; }
  get current_offset(): number { return (this.data.current_page - 1) * this.data.page_size; }
  get page_size(): number { return this.data.page_size; }
  get pages(): number { return Math.ceil(this.data.total_items / this.data.page_size); }
  get items(): number { return this.data.total_items; }

  get previous(): { title: string; url: string; is_link: boolean } | null {
    if (this.data.current_page <= 1) return null;
    return {
      title: 'Previous',
      url: `?page=${this.data.current_page - 1}`,
      is_link: true
    };
  }

  get next(): { title: string; url: string; is_link: boolean } | null {
    if (this.data.current_page >= this.pages) return null;
    return {
      title: 'Next',
      url: `?page=${this.data.current_page + 1}`,
      is_link: true
    };
  }

  /** Array of page parts for rendering pagination UI */
  get parts(): Array<{ title: string; url: string; is_link: boolean }> {
    const parts: Array<{ title: string; url: string; is_link: boolean }> = [];
    const totalPages = this.pages;

    for (let i = 1; i <= totalPages; i++) {
      parts.push({
        title: String(i),
        url: `?page=${i}`,
        is_link: i !== this.data.current_page
      });
    }

    return parts;
  }
}
```

### Step 7: Create ThemeDrop and SettingsDrop

Create `app/components/preview/drops/ThemeDrop.ts`:

```typescript
import { ShopifyDrop } from './base/ShopifyDrop';

/**
 * ThemeDrop - Current theme metadata
 */
export class ThemeDrop extends ShopifyDrop {
  constructor() {
    super();
  }

  get id(): number { return 1; }
  get name(): string { return 'Preview Theme'; }
  get role(): string { return 'main'; }
  get theme_store_id(): null { return null; }
}

/**
 * SettingsDrop - Global theme settings
 * Acts as a passthrough for settings values
 */
export class SettingsDrop extends ShopifyDrop {
  private settingsData: Record<string, unknown>;

  constructor(settings: Record<string, unknown> = {}) {
    super();
    this.settingsData = settings;
  }

  liquidMethodMissing(key: string): unknown {
    return this.settingsData[key];
  }
}
```

### Step 8: Update Mock Types

Update `app/components/preview/mockData/types.ts`:

```typescript
// Add to existing types

export interface MockForloop {
  index: number;
  index0: number;
  rindex: number;
  rindex0: number;
  first: boolean;
  last: boolean;
  length: number;
}

export interface MockRequest {
  design_mode: boolean;
  page_type: string;
  path: string;
  host?: string;
  origin?: string;
}

export interface MockRoutes {
  root_url: string;
  cart_url: string;
  account_url: string;
  // ... other route properties
}

export interface MockPaginate {
  current_page: number;
  page_size: number;
  total_items: number;
}
```

### Step 9: Update drops/index.ts

```typescript
export { ShopifyDrop } from './base/ShopifyDrop';
export { ImageDrop } from './ImageDrop';
export { VariantDrop } from './VariantDrop';
export { ProductDrop } from './ProductDrop';
export { CollectionDrop } from './CollectionDrop';
export { CollectionsDrop } from './CollectionsDrop';
export { ArticleDrop } from './ArticleDrop';
export { ShopDrop } from './ShopDrop';
export { BlockDrop } from './BlockDrop';
// New drops
export { ForloopDrop } from './ForloopDrop';
export { RequestDrop } from './RequestDrop';
export { RoutesDrop } from './RoutesDrop';
export { CartDrop, CartItemDrop } from './CartDrop';
export { CustomerDrop } from './CustomerDrop';
export { PaginateDrop } from './PaginateDrop';
export { ThemeDrop, SettingsDrop } from './ThemeDrop';
```

### Step 10: Update buildPreviewContext.ts

```typescript
// Add to imports
import { RequestDrop, RoutesDrop, CartDrop, CustomerDrop, ThemeDrop, SettingsDrop } from '../drops';

// Update buildPreviewContext function
export function buildPreviewContext(options: PreviewContextOptions): PreviewContext {
  // ... existing code ...

  // Always add these objects
  context.request = new RequestDrop({
    design_mode: true,
    page_type: options.product ? 'product' : options.collection ? 'collection' : 'index'
  });

  context.routes = new RoutesDrop();
  context.theme = new ThemeDrop();

  // Add cart if provided
  if (options.cart) {
    context.cart = new CartDrop(options.cart);
  }

  // Add customer if provided (null means logged out)
  context.customer = new CustomerDrop(options.customer ?? null);

  return context;
}
```

### Step 11: Enhance Existing Drops

Update `ProductDrop.ts` to add missing properties:

```typescript
// Add to ProductDrop class

get metafields(): Record<string, unknown> {
  return {}; // Placeholder - would need real metafield data
}

get media(): ImageDrop[] {
  return this.images; // Simplified - media includes images
}

get featured_media(): ImageDrop | null {
  return this.featured_image;
}

get gift_card(): boolean { return false; }
get 'gift_card?'(): boolean { return false; }

get published_at(): string {
  return new Date().toISOString();
}

get created_at(): string {
  return new Date().toISOString();
}

get requires_selling_plan(): boolean { return false; }
get selling_plan_groups(): unknown[] { return []; }
get quantity_price_breaks_configured(): boolean { return false; }
get 'quantity_price_breaks_configured?'(): boolean { return false; }

get template_suffix(): string { return ''; }
```

## Todo List

- [x] Create ForloopDrop class
- [x] Create RequestDrop class
- [x] Create RoutesDrop class
- [x] Create CartDrop and CartItemDrop classes
- [x] Create CustomerDrop class
- [x] Create PaginateDrop class
- [x] Create ThemeDrop and SettingsDrop classes
- [x] Update mock types
- [x] Update drops/index.ts exports
- [x] Update buildPreviewContext.ts
- [x] Enhance ProductDrop with missing properties
- [x] Enhance CollectionDrop with missing properties
- [x] Enhance ShopDrop with missing properties
- [x] Write unit tests for all new drops - 115 tests passing
- [x] Integration test with real section templates

## Success Criteria

1. All listed drops/objects implemented
2. `request.design_mode` correctly returns true
3. `routes` object provides all URL helpers
4. `forloop` metadata available in for loops
5. Cart sections render with CartDrop
6. Unit tests pass for all new drops

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Missing properties in production | Medium | Medium | Add liquidMethodMissing fallback |
| Type conflicts | Low | Medium | Strict TypeScript, interface alignment |
| Performance with large carts | Low | Low | Lazy initialization |

---

**Estimated Completion**: 6-8 hours
**Next Phase**: [phase-03-advanced-tags.md](./phase-03-advanced-tags.md)
