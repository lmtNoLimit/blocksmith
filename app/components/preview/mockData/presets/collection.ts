import type { MockCollection, MockProduct, DataPreset } from '../types';

const PLACEHOLDER_IMAGE = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-collection-1_large.png';
const PRODUCT_PLACEHOLDER = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png';

const createProduct = (id: number, title: string, handle: string, price: number): MockProduct => ({
  id,
  title,
  handle,
  description: `Description for ${title}`,
  vendor: 'Demo Brand',
  type: 'Apparel',
  price,
  price_min: price,
  price_max: price + 500,
  compare_at_price: price + 1000,
  available: true,
  inventory_quantity: 25,
  featured_image: {
    src: PRODUCT_PLACEHOLDER,
    alt: title,
    width: 600,
    height: 600
  },
  images: [{ src: PRODUCT_PLACEHOLDER, alt: title, width: 600, height: 600 }],
  tags: ['collection'],
  options: ['Size'],
  variants: [
    { id: id * 10 + 1, title: 'Small', price, available: true, inventory_quantity: 10, sku: `${handle}-S`, option1: 'Small', option2: null, option3: null },
    { id: id * 10 + 2, title: 'Medium', price, available: true, inventory_quantity: 10, sku: `${handle}-M`, option1: 'Medium', option2: null, option3: null }
  ],
  url: `/products/${handle}`
});

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
    createProduct(1, 'Premium Cotton T-Shirt', 'premium-cotton-t-shirt', 2999),
    createProduct(2, 'Linen Shorts', 'linen-shorts', 4999),
    createProduct(3, 'Beach Sandals', 'beach-sandals', 2499),
    createProduct(4, 'Sun Hat', 'sun-hat', 1999)
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
        products: Array(12).fill(null).map((_, i) =>
          createProduct(i + 1, `Product ${i + 1}`, `product-${i + 1}`, 2999 + (i * 500))
        )
      },
      products: Array(12).fill(null).map((_, i) =>
        createProduct(i + 1, `Product ${i + 1}`, `product-${i + 1}`, 2999 + (i * 500))
      )
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
      },
      products: []
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
      },
      products: baseCollection.products
    }
  }
];
