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
  total_price: 5998,
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
        items: Array(8).fill(null).map((_, i) => ({
          ...baseCart.items[0],
          id: i + 1,
          title: `Product ${i + 1}`
        }))
      }
    }
  }
];
