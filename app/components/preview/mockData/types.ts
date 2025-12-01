/**
 * Mock data types for Shopify Liquid objects
 */

export interface MockImage {
  src: string;
  alt: string;
  width: number;
  height: number;
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

export interface DataPreset {
  id: string;
  name: string;
  description: string;
  data: Partial<MockDataContext>;
}
