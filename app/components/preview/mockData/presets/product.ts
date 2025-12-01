import type { MockProduct, DataPreset } from '../types';

const PLACEHOLDER_IMAGE = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png';

const baseProduct: MockProduct = {
  id: 12345678,
  title: 'Premium Cotton T-Shirt',
  handle: 'premium-cotton-t-shirt',
  description: 'A comfortable, high-quality cotton t-shirt perfect for everyday wear. Made from 100% organic cotton with a classic fit.',
  vendor: 'Demo Brand',
  type: 'Apparel',
  price: 2999,
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
          'It includes multiple sentences and paragraphs to ensure proper text wrapping and overflow handling in the preview. ' +
          'Perfect for testing edge cases in your layout design.'
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
