# Phase 03: Mock Data System

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Dependencies**: [Phase 01](./phase-01-preview-infrastructure.md), [Phase 02](./phase-02-schema-settings-ui.md)
- **Related Docs**: [code-standards.md](../../docs/code-standards.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-01 |
| Description | Mock data registry for Shopify objects (product, collection, etc.), preset selection, custom data input |
| Priority | P1 - High |
| Implementation Status | Not Started |
| Review Status | Not Started |

## Key Insights from Research

1. **Liquid objects** like `product`, `collection`, `cart` need mock data for preview
2. **Static presets** (e.g., "Low Inventory", "Long Product Name") test edge cases
3. **Dynamic data** with Faker-style generation creates realistic previews
4. **Multiple datasets** let merchants test different scenarios
5. **Custom JSON input** gives power users full control

## Requirements

1. Create mock data registry for common Shopify Liquid objects
2. Provide 3-5 preset data scenarios per object type
3. Support product, collection, article, blog, shop objects
4. Allow preset selection via dropdown in preview toolbar
5. Support custom JSON input for advanced users
6. Inject mock data into LiquidJS render context
7. Register Shopify-specific filter stubs (img_url, money, etc.)

## Architecture

### Mock Data Registry Structure

```
app/components/preview/mockData/
├── registry.ts           # Central mock data registry
├── types.ts              # Mock data type definitions
├── presets/
│   ├── product.ts        # Product object presets
│   ├── collection.ts     # Collection object presets
│   ├── article.ts        # Article/blog presets
│   └── shop.ts           # Shop object presets
├── filters/
│   └── shopifyFilters.ts # Shopify filter implementations
└── generators/
    └── randomData.ts     # Random data generators
```

### Data Flow

```
┌─────────────────────┐
│ MockDataSelector    │  ← User picks preset
│ (in PreviewToolbar) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Mock Data Registry  │  ← Returns data object
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ LiquidJS Context    │  ← Merged into render context
│ {                   │
│   product: {...},   │
│   collection: {...},│
│   section: {...},   │
│   settings: {...}   │
│ }                   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Rendered Preview    │
└─────────────────────┘
```

## Related Code Files

| File | Purpose | Status |
|------|---------|--------|
| `app/components/preview/hooks/useLiquidRenderer.ts` | Inject mock data | Modify |
| `app/components/preview/PreviewToolbar.tsx` | Add data selector | Modify |
| `app/components/preview/mockData/` | New mock data system | Create |

## Implementation Steps

### Step 1: Create Mock Data Types (`app/components/preview/mockData/types.ts`)

```typescript
// Shopify object type definitions for mock data

export interface MockImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface MockPrice {
  amount: number;
  currency_code: string;
}

export interface MockProduct {
  id: number;
  title: string;
  handle: string;
  description: string;
  vendor: string;
  type: string;
  price: number;
  price_min: number;
  price_max: number;
  compare_at_price: number | null;
  available: boolean;
  inventory_quantity: number;
  featured_image: MockImage;
  images: MockImage[];
  tags: string[];
  options: string[];
  variants: MockProductVariant[];
  url: string;
}

export interface MockProductVariant {
  id: number;
  title: string;
  price: number;
  available: boolean;
  inventory_quantity: number;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

export interface MockCollection {
  id: number;
  title: string;
  handle: string;
  description: string;
  image: MockImage | null;
  products: MockProduct[];
  products_count: number;
  url: string;
}

export interface MockArticle {
  id: number;
  title: string;
  handle: string;
  content: string;
  excerpt: string;
  author: string;
  published_at: string;
  image: MockImage | null;
  tags: string[];
  url: string;
}

export interface MockBlog {
  id: number;
  title: string;
  handle: string;
  articles: MockArticle[];
  articles_count: number;
  url: string;
}

export interface MockShop {
  name: string;
  email: string;
  domain: string;
  url: string;
  currency: string;
  money_format: string;
  description: string;
}

export interface MockCart {
  item_count: number;
  total_price: number;
  items: MockCartItem[];
  currency: string;
}

export interface MockCartItem {
  id: number;
  title: string;
  quantity: number;
  price: number;
  line_price: number;
  image: MockImage;
  url: string;
}

export interface MockDataContext {
  product?: MockProduct;
  products?: MockProduct[];
  collection?: MockCollection;
  collections?: MockCollection[];
  article?: MockArticle;
  articles?: MockArticle[];
  blog?: MockBlog;
  shop: MockShop;
  cart?: MockCart;
  customer?: MockCustomer | null;
  request?: MockRequest;
}

export interface MockCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  orders_count: number;
  total_spent: number;
}

export interface MockRequest {
  design_mode: boolean;
  page_type: string;
  path: string;
}

export interface DataPreset {
  id: string;
  name: string;
  description: string;
  data: Partial<MockDataContext>;
}
```

### Step 2: Create Product Presets (`app/components/preview/mockData/presets/product.ts`)

```typescript
import type { MockProduct, DataPreset } from '../types';

const PLACEHOLDER_IMAGE = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png';

const baseProduct: MockProduct = {
  id: 12345678,
  title: 'Premium Cotton T-Shirt',
  handle: 'premium-cotton-t-shirt',
  description: 'A comfortable, high-quality cotton t-shirt perfect for everyday wear. Made from 100% organic cotton.',
  vendor: 'Demo Brand',
  type: 'Apparel',
  price: 2999, // cents
  price_min: 2999,
  price_max: 3499,
  compare_at_price: 3999,
  available: true,
  inventory_quantity: 50,
  featured_image: {
    src: PLACEHOLDER_IMAGE,
    alt: 'Premium Cotton T-Shirt',
    width: 600,
    height: 600
  },
  images: [
    { src: PLACEHOLDER_IMAGE, alt: 'Front view', width: 600, height: 600 },
    { src: PLACEHOLDER_IMAGE, alt: 'Back view', width: 600, height: 600 }
  ],
  tags: ['cotton', 'summer', 'casual'],
  options: ['Size', 'Color'],
  variants: [
    { id: 1, title: 'Small / White', price: 2999, available: true, inventory_quantity: 20, sku: 'TSHIRT-S-W', option1: 'Small', option2: 'White', option3: null },
    { id: 2, title: 'Medium / White', price: 2999, available: true, inventory_quantity: 15, sku: 'TSHIRT-M-W', option1: 'Medium', option2: 'White', option3: null },
    { id: 3, title: 'Large / White', price: 2999, available: false, inventory_quantity: 0, sku: 'TSHIRT-L-W', option1: 'Large', option2: 'White', option3: null }
  ],
  url: '/products/premium-cotton-t-shirt'
};

export const productPresets: DataPreset[] = [
  {
    id: 'product-standard',
    name: 'Standard Product',
    description: 'Typical product with variants and compare price',
    data: { product: baseProduct }
  },
  {
    id: 'product-low-stock',
    name: 'Low Stock Product',
    description: 'Product with only 3 items remaining',
    data: {
      product: {
        ...baseProduct,
        inventory_quantity: 3,
        variants: baseProduct.variants.map(v => ({
          ...v,
          inventory_quantity: v.available ? 1 : 0
        }))
      }
    }
  },
  {
    id: 'product-sold-out',
    name: 'Sold Out Product',
    description: 'Product with no available inventory',
    data: {
      product: {
        ...baseProduct,
        available: false,
        inventory_quantity: 0,
        variants: baseProduct.variants.map(v => ({
          ...v,
          available: false,
          inventory_quantity: 0
        }))
      }
    }
  },
  {
    id: 'product-long-title',
    name: 'Long Title Product',
    description: 'Product with very long title and description',
    data: {
      product: {
        ...baseProduct,
        title: 'Extra Premium Deluxe Cotton T-Shirt with Extended Features and Special Edition Materials',
        description: 'This is an exceptionally detailed product description that goes on for quite a while to test how the section handles long text content. ' +
          'It includes multiple sentences and paragraphs to ensure proper text wrapping and overflow handling in the preview.'
      }
    }
  },
  {
    id: 'product-no-compare',
    name: 'No Compare Price',
    description: 'Product without a compare-at price (no sale)',
    data: {
      product: {
        ...baseProduct,
        compare_at_price: null
      }
    }
  }
];
```

### Step 3: Create Collection Presets (`app/components/preview/mockData/presets/collection.ts`)

```typescript
import type { MockCollection, DataPreset } from '../types';
import { productPresets } from './product';

const PLACEHOLDER_IMAGE = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-collection-1_large.png';

// Get base product for collection products
const baseProducts = productPresets[0].data.product
  ? [productPresets[0].data.product]
  : [];

const baseCollection: MockCollection = {
  id: 98765432,
  title: 'Summer Collection',
  handle: 'summer-collection',
  description: 'Our latest summer styles featuring lightweight fabrics and vibrant colors.',
  image: {
    src: PLACEHOLDER_IMAGE,
    alt: 'Summer Collection',
    width: 1200,
    height: 600
  },
  products: [
    ...baseProducts,
    { ...baseProducts[0]!, id: 2, title: 'Linen Shorts', handle: 'linen-shorts', price: 4999 },
    { ...baseProducts[0]!, id: 3, title: 'Beach Sandals', handle: 'beach-sandals', price: 2499 },
    { ...baseProducts[0]!, id: 4, title: 'Sun Hat', handle: 'sun-hat', price: 1999 }
  ],
  products_count: 4,
  url: '/collections/summer-collection'
};

export const collectionPresets: DataPreset[] = [
  {
    id: 'collection-standard',
    name: 'Standard Collection',
    description: 'Collection with 4 products and image',
    data: { collection: baseCollection, products: baseCollection.products }
  },
  {
    id: 'collection-large',
    name: 'Large Collection',
    description: 'Collection with 12 products',
    data: {
      collection: {
        ...baseCollection,
        products_count: 12,
        products: Array(12).fill(null).map((_, i) => ({
          ...baseProducts[0]!,
          id: i + 1,
          title: `Product ${i + 1}`,
          handle: `product-${i + 1}`
        }))
      }
    }
  },
  {
    id: 'collection-empty',
    name: 'Empty Collection',
    description: 'Collection with no products',
    data: {
      collection: {
        ...baseCollection,
        products: [],
        products_count: 0
      }
    }
  },
  {
    id: 'collection-no-image',
    name: 'No Image Collection',
    description: 'Collection without a featured image',
    data: {
      collection: {
        ...baseCollection,
        image: null
      }
    }
  }
];
```

### Step 4: Create Shop Preset (`app/components/preview/mockData/presets/shop.ts`)

```typescript
import type { MockShop, MockCart, DataPreset } from '../types';

export const defaultShop: MockShop = {
  name: 'Demo Store',
  email: 'hello@demo-store.com',
  domain: 'demo-store.myshopify.com',
  url: 'https://demo-store.myshopify.com',
  currency: 'USD',
  money_format: '${{amount}}',
  description: 'Your one-stop shop for amazing products.'
};

const baseCart: MockCart = {
  item_count: 2,
  total_price: 5998, // cents
  currency: 'USD',
  items: [
    {
      id: 1,
      title: 'Premium Cotton T-Shirt - Small / White',
      quantity: 1,
      price: 2999,
      line_price: 2999,
      image: {
        src: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
        alt: 'T-Shirt',
        width: 100,
        height: 100
      },
      url: '/products/premium-cotton-t-shirt'
    },
    {
      id: 2,
      title: 'Linen Shorts - Medium',
      quantity: 1,
      price: 2999,
      line_price: 2999,
      image: {
        src: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
        alt: 'Shorts',
        width: 100,
        height: 100
      },
      url: '/products/linen-shorts'
    }
  ]
};

export const shopPresets: DataPreset[] = [
  {
    id: 'shop-default',
    name: 'Default Shop',
    description: 'Standard shop configuration',
    data: { shop: defaultShop }
  }
];

export const cartPresets: DataPreset[] = [
  {
    id: 'cart-standard',
    name: 'Cart with Items',
    description: 'Cart with 2 items',
    data: { cart: baseCart }
  },
  {
    id: 'cart-empty',
    name: 'Empty Cart',
    description: 'Cart with no items',
    data: {
      cart: {
        ...baseCart,
        item_count: 0,
        total_price: 0,
        items: []
      }
    }
  },
  {
    id: 'cart-large',
    name: 'Large Cart',
    description: 'Cart with many items',
    data: {
      cart: {
        ...baseCart,
        item_count: 8,
        total_price: 24992,
        items: Array(8).fill(baseCart.items[0])
      }
    }
  }
];
```

### Step 5: Create Mock Data Registry (`app/components/preview/mockData/registry.ts`)

```typescript
import type { MockDataContext, DataPreset } from './types';
import { productPresets } from './presets/product';
import { collectionPresets } from './presets/collection';
import { defaultShop, cartPresets } from './presets/shop';

// Combine all presets into categories
export const presetCategories = {
  product: productPresets,
  collection: collectionPresets,
  cart: cartPresets
} as const;

export type PresetCategory = keyof typeof presetCategories;

// Get all presets as flat array
export function getAllPresets(): DataPreset[] {
  return [
    ...productPresets,
    ...collectionPresets,
    ...cartPresets
  ];
}

// Get preset by ID
export function getPresetById(id: string): DataPreset | undefined {
  return getAllPresets().find(p => p.id === id);
}

// Get default context (always includes shop)
export function getDefaultContext(): MockDataContext {
  return {
    shop: defaultShop,
    request: {
      design_mode: true,
      page_type: 'product',
      path: '/products/demo'
    },
    customer: null
  };
}

// Build full context from preset
export function buildContextFromPreset(presetId: string): MockDataContext {
  const preset = getPresetById(presetId);
  const defaultContext = getDefaultContext();

  if (!preset) {
    return defaultContext;
  }

  return {
    ...defaultContext,
    ...preset.data
  };
}

// Merge custom data into context
export function mergeCustomData(
  baseContext: MockDataContext,
  customJson: string
): MockDataContext {
  try {
    const customData = JSON.parse(customJson);
    return {
      ...baseContext,
      ...customData
    };
  } catch (error) {
    console.warn('Failed to parse custom JSON data:', error);
    return baseContext;
  }
}
```

### Step 6: Create Shopify Filters (`app/components/preview/mockData/filters/shopifyFilters.ts`)

```typescript
import type { Liquid } from 'liquidjs';

/**
 * Register Shopify-specific Liquid filters
 * These are stubs that approximate real Shopify filter behavior
 */
export function registerShopifyFilters(engine: Liquid): void {
  // Money formatting
  engine.registerFilter('money', (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    return `$${amount}`;
  });

  engine.registerFilter('money_with_currency', (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    return `$${amount} USD`;
  });

  engine.registerFilter('money_without_currency', (cents: number) => {
    return (cents / 100).toFixed(2);
  });

  engine.registerFilter('money_without_trailing_zeros', (cents: number) => {
    const amount = cents / 100;
    return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
  });

  // Image URL filters
  engine.registerFilter('img_url', (image: string | { src: string } | null, size?: string) => {
    if (!image) return 'https://via.placeholder.com/300';
    const src = typeof image === 'string' ? image : image.src;
    // In real Shopify, size modifies the URL - we just return as-is
    return src || 'https://via.placeholder.com/300';
  });

  engine.registerFilter('image_url', (image: string | { src: string } | null, params?: string) => {
    if (!image) return 'https://via.placeholder.com/300';
    return typeof image === 'string' ? image : image.src;
  });

  engine.registerFilter('img_tag', (url: string, alt?: string) => {
    return `<img src="${url}" alt="${alt || ''}" />`;
  });

  // Asset URLs
  engine.registerFilter('asset_url', (filename: string) => {
    return `/assets/${filename}`;
  });

  engine.registerFilter('asset_img_url', (filename: string, size?: string) => {
    return `/assets/${filename}`;
  });

  engine.registerFilter('file_url', (filename: string) => {
    return `/files/${filename}`;
  });

  engine.registerFilter('file_img_url', (filename: string) => {
    return `/files/${filename}`;
  });

  // URL filters
  engine.registerFilter('product_url', (product: { url?: string; handle?: string }) => {
    return product?.url || `/products/${product?.handle || 'product'}`;
  });

  engine.registerFilter('collection_url', (collection: { url?: string; handle?: string }) => {
    return collection?.url || `/collections/${collection?.handle || 'collection'}`;
  });

  engine.registerFilter('link_to', (url: string, title: string) => {
    return `<a href="${url}">${title}</a>`;
  });

  engine.registerFilter('url_for_type', (type: string) => {
    return `/collections/types?q=${encodeURIComponent(type)}`;
  });

  engine.registerFilter('url_for_vendor', (vendor: string) => {
    return `/collections/vendors?q=${encodeURIComponent(vendor)}`;
  });

  // String filters
  engine.registerFilter('handle', (str: string) => {
    return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });

  engine.registerFilter('handleize', (str: string) => {
    return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });

  engine.registerFilter('pluralize', (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  });

  engine.registerFilter('json', (value: unknown) => {
    return JSON.stringify(value);
  });

  // Translation stub
  engine.registerFilter('t', (key: string) => {
    // Return key as-is since we don't have translation files
    return key;
  });

  // Date filters
  engine.registerFilter('date', (dateStr: string, format?: string) => {
    try {
      const date = new Date(dateStr);
      // Simplified date formatting
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  });

  // Array filters
  engine.registerFilter('where', (array: unknown[], key: string, value: unknown) => {
    if (!Array.isArray(array)) return [];
    return array.filter((item: Record<string, unknown>) => item[key] === value);
  });

  // Math filters
  engine.registerFilter('times', (a: number, b: number) => a * b);
  engine.registerFilter('divided_by', (a: number, b: number) => Math.floor(a / b));
  engine.registerFilter('modulo', (a: number, b: number) => a % b);

  // Color filters (stubs)
  engine.registerFilter('color_to_rgb', (color: string) => color);
  engine.registerFilter('color_to_hsl', (color: string) => color);
  engine.registerFilter('color_modify', (color: string, _prop: string, _val: number) => color);
  engine.registerFilter('color_lighten', (color: string, _amount: number) => color);
  engine.registerFilter('color_darken', (color: string, _amount: number) => color);
}
```

### Step 7: Update useLiquidRenderer Hook

```typescript
// In useLiquidRenderer.ts - update to use mock data and filters

import { registerShopifyFilters } from '../mockData/filters/shopifyFilters';
import type { MockDataContext } from '../mockData/types';

// Initialize engine with Shopify filters
useEffect(() => {
  engineRef.current = new Liquid({
    strictFilters: false,
    strictVariables: false
  });

  // Register all Shopify filters
  registerShopifyFilters(engineRef.current);
}, []);

// Update render function signature
const render = useCallback(async (
  template: string,
  settings: PreviewSettings,
  mockData: MockDataContext
): Promise<{ html: string; css: string }> => {
  // Build context with mock data
  const context = {
    ...mockData,
    section: {
      id: 'preview-section',
      settings
    },
    settings
  };

  // ... rest of render logic
}, []);
```

### Step 8: Add Mock Data Selector to PreviewToolbar

```typescript
// In PreviewToolbar.tsx - add data preset selector

import { getAllPresets } from '../mockData/registry';

export interface PreviewToolbarProps {
  // ... existing props
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
  onCustomDataClick: () => void;
}

// In component:
const presets = getAllPresets();

<s-stack gap="base" direction="inline" alignItems="center" wrap>
  {/* Device selector ... */}

  {/* Data preset selector */}
  <s-select
    label="Preview Data"
    labelHidden
    value={selectedPreset}
    onChange={(e: Event) => onPresetChange((e.target as HTMLSelectElement).value)}
  >
    <option value="">Default Data</option>
    <optgroup label="Product">
      {presets.filter(p => p.id.startsWith('product')).map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </optgroup>
    <optgroup label="Collection">
      {presets.filter(p => p.id.startsWith('collection')).map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </optgroup>
    <optgroup label="Cart">
      {presets.filter(p => p.id.startsWith('cart')).map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </optgroup>
  </s-select>

  {/* Custom data button */}
  <s-button
    variant="tertiary"
    size="slim"
    icon="code"
    onClick={onCustomDataClick}
  >
    Custom JSON
  </s-button>

  {/* Refresh ... */}
</s-stack>
```

### Step 9: Create Custom Data Modal (`app/components/preview/CustomDataModal.tsx`)

```typescript
import { useState } from 'react';

export interface CustomDataModalProps {
  initialData: string;
  onSave: (json: string) => void;
  onClose: () => void;
}

export function CustomDataModal({ initialData, onSave, onClose }: CustomDataModalProps) {
  const [jsonData, setJsonData] = useState(initialData || '{\n  \n}');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      JSON.parse(jsonData);
      setError(null);
      onSave(jsonData);
      onClose();
    } catch (e) {
      setError('Invalid JSON: ' + (e instanceof Error ? e.message : 'Parse error'));
    }
  };

  return (
    <s-modal open onClose={onClose}>
      <s-text slot="header" variant="headingLg">Custom Preview Data</s-text>

      <s-stack gap="large" direction="block">
        <s-text variant="bodySm" tone="subdued">
          Enter custom JSON to inject into the Liquid template context.
          Available objects: product, collection, cart, shop, customer.
        </s-text>

        {error && (
          <s-banner tone="critical">{error}</s-banner>
        )}

        <textarea
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          style={{
            width: '100%',
            minHeight: '300px',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '12px',
            border: '1px solid #c9cccf',
            borderRadius: '8px',
            resize: 'vertical'
          }}
          placeholder={'{\n  "product": {\n    "title": "Custom Product"\n  }\n}'}
        />

        <s-text variant="bodySm" tone="subdued">
          Tip: Start with a preset and modify it to test specific scenarios.
        </s-text>
      </s-stack>

      <div slot="footer">
        <s-stack gap="base" direction="inline" justifyContent="end">
          <s-button variant="secondary" onClick={onClose}>Cancel</s-button>
          <s-button variant="primary" onClick={handleSave}>Apply</s-button>
        </s-stack>
      </div>
    </s-modal>
  );
}
```

### Step 10: Create Barrel Exports

```typescript
// app/components/preview/mockData/index.ts
export * from './types';
export * from './registry';
export { registerShopifyFilters } from './filters/shopifyFilters';
export { productPresets } from './presets/product';
export { collectionPresets } from './presets/collection';
export { shopPresets, cartPresets } from './presets/shop';
```

## Todo List

- [ ] Create `app/components/preview/mockData/types.ts`
- [ ] Create `app/components/preview/mockData/presets/product.ts`
- [ ] Create `app/components/preview/mockData/presets/collection.ts`
- [ ] Create `app/components/preview/mockData/presets/shop.ts`
- [ ] Create `app/components/preview/mockData/registry.ts`
- [ ] Create `app/components/preview/mockData/filters/shopifyFilters.ts`
- [ ] Create `app/components/preview/mockData/index.ts`
- [ ] Update `useLiquidRenderer.ts` with filters and mock data
- [ ] Update `PreviewToolbar.tsx` with preset selector
- [ ] Create `CustomDataModal.tsx` for custom JSON input
- [ ] Update `SectionPreview.tsx` to manage mock data state
- [ ] Test with product-focused generated sections
- [ ] Test with collection-focused generated sections
- [ ] Test custom JSON data input
- [ ] Verify Shopify filters work correctly

## Success Criteria

1. Data preset dropdown shows categorized options
2. Selecting preset updates preview with new data
3. Custom JSON modal validates input
4. Shopify filters (money, img_url, etc.) work correctly
5. Preview renders product/collection data accurately
6. Edge case presets (sold out, empty, long title) render correctly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing Shopify filters | High | Medium | Add stub filters that return sensible defaults |
| Complex filter chains fail | Medium | Low | Log warnings, return input unchanged |
| Large mock datasets slow render | Low | Medium | Keep presets small (max 12 products) |
| Custom JSON injection attack | Low | High | JSON.parse only, no eval, LiquidJS safe mode |

## Security Considerations

1. **JSON.parse only**: Never use eval() or Function() on user input
2. **LiquidJS safe mode**: Prevents arbitrary code execution in templates
3. **No server-side execution**: All rendering happens in browser
4. **Sanitized output**: LiquidJS auto-escapes HTML in output

## Next Steps

After completing this phase:
1. Proceed to [Phase 04: Polish & Integration](./phase-04-polish-integration.md)
2. Add more Shopify filter implementations as needed
3. Consider adding article/blog presets if commonly generated
4. Document common filter gaps for user reference
