/**
 * Preview Context Builder
 * Builds Liquid template context with Drop classes for Shopify data
 */

import {
  ProductDrop,
  CollectionDrop,
  CollectionsDrop,
  ArticleDrop,
  ShopDrop,
  RequestDrop,
  RoutesDrop,
  CartDrop,
  CustomerDrop,
  ThemeDrop
} from '../drops';
import type { MockProduct, MockCollection, MockArticle, MockShop, MockCart, MockCustomer } from '../mockData/types';

/**
 * Default shop data for preview (used when no real shop data is available)
 */
const defaultShop: MockShop = {
  name: 'Demo Store',
  email: 'hello@demo-store.com',
  domain: 'demo-store.myshopify.com',
  url: 'https://demo-store.myshopify.com',
  currency: 'USD',
  money_format: '${{amount}}',
  description: 'Your one-stop shop for amazing products.'
};

export interface PreviewContextOptions {
  product?: MockProduct | null;
  products?: MockProduct[];
  collection?: MockCollection | null;
  article?: MockArticle | null;
  shop?: MockShop;
  cart?: MockCart | null;
  customer?: MockCustomer | null;
  // Settings-based resources (from schema settings with type: product/collection)
  settingsResources?: Record<string, MockProduct | MockCollection>;
}

export interface PreviewContext {
  product?: ProductDrop;
  collection?: CollectionDrop;
  collections?: CollectionsDrop;
  article?: ArticleDrop;
  shop: ShopDrop;
  request: RequestDrop;
  routes: RoutesDrop;
  theme: ThemeDrop;
  cart?: CartDrop;
  customer: CustomerDrop;
  settingsResourceDrops?: Record<string, ProductDrop | CollectionDrop>;
  [key: string]: unknown;
}

/**
 * Build Drop classes for settings-based resources
 * Wraps MockProduct/MockCollection in appropriate Drop classes
 */
function buildSettingsResourceDrops(
  settingsResources: Record<string, MockProduct | MockCollection>
): Record<string, ProductDrop | CollectionDrop> {
  const drops: Record<string, ProductDrop | CollectionDrop> = {};

  for (const [settingId, resource] of Object.entries(settingsResources)) {
    // Determine if resource is product or collection based on shape
    if ('variants' in resource || 'vendor' in resource || 'product_type' in resource) {
      // It's a product
      drops[settingId] = new ProductDrop(resource as MockProduct);
    } else {
      // It's a collection
      drops[settingId] = new CollectionDrop(resource as MockCollection);
    }
  }

  return drops;
}

/**
 * Build preview context with Drop classes
 * Drop classes provide controlled access to object properties in Liquid templates
 */
export function buildPreviewContext(options: PreviewContextOptions): PreviewContext {
  const { product, products = [], collection, article, shop, cart, customer, settingsResources = {} } = options;

  // Build settings resource drops
  const settingsResourceDrops = Object.keys(settingsResources).length > 0
    ? buildSettingsResourceDrops(settingsResources)
    : undefined;

  // Determine page type for request context
  const pageType = product ? 'product' : collection ? 'collection' : article ? 'article' : 'index';

  // Build context with Drop classes
  const context: PreviewContext = {
    shop: shop ? new ShopDrop(shop) : new ShopDrop(defaultShop),
    request: new RequestDrop({
      design_mode: true,
      page_type: pageType,
      path: '/'
    }),
    routes: new RoutesDrop(),
    theme: new ThemeDrop(),
    customer: new CustomerDrop(customer ?? null)
  };

  // Add cart if provided
  if (cart) {
    context.cart = new CartDrop(cart);
  }

  // Add product if provided
  if (product) {
    context.product = new ProductDrop(product);
  } else if (products.length > 0) {
    // Use first product from multiple selection as the "product" context
    context.product = new ProductDrop(products[0]);
  }

  // Handle collection and collections global
  let collectionData: MockCollection | null = null;

  if (collection) {
    // If we have selected products, merge them into the collection
    if (products.length > 0) {
      collectionData = {
        ...collection,
        products: products,
        products_count: products.length
      };
    } else {
      collectionData = collection;
    }
  } else if (products.length > 0) {
    // Create a synthetic collection from selected products
    collectionData = {
      id: 1,
      title: 'Selected Products',
      handle: 'selected-products',
      description: 'Products selected for preview',
      url: '/collections/selected-products',
      products_count: products.length,
      products: products,
      image: null
    };
  }

  if (collectionData) {
    context.collection = new CollectionDrop(collectionData);
    // Provide collections global for templates using collections['handle'] syntax
    context.collections = new CollectionsDrop(collectionData);
  }

  if (article) {
    context.article = new ArticleDrop(article);
  }

  // Settings-based resources are always included
  if (settingsResourceDrops) {
    context.settingsResourceDrops = settingsResourceDrops;
  }

  return context;
}

/**
 * Extract resource summary for UI display
 */
export function getContextResourceSummary(context: PreviewContext): string {
  const resources: string[] = [];

  if (context.product) {
    resources.push(`Product: ${context.product.title}`);
  }
  if (context.collection) {
    resources.push(`Collection: ${context.collection.title}`);
  }
  if (context.article) {
    resources.push(`Article: ${context.article.title}`);
  }

  return resources.length > 0
    ? resources.join(', ')
    : 'Using default shop data';
}

/**
 * Check if context has any selected resources
 */
export function hasSelectedResources(context: PreviewContext): boolean {
  return !!(context.product || context.collection || context.article);
}
