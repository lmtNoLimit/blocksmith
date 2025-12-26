import { authenticate } from "../shopify.server";
import type {
  MockProduct,
  MockProductVariant,
  MockCollection,
  MockArticle,
  MockShop,
  MockImage
} from "../components/preview/mockData/types";

/**
 * Cache entry with TTL support
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache with TTL
 */
class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// GraphQL Queries
const PRODUCT_QUERY = `#graphql
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      description
      vendor
      productType
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      compareAtPriceRange {
        minVariantCompareAtPrice { amount }
      }
      totalInventory
      featuredImage {
        url
        altText
        width
        height
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
            width
            height
          }
        }
      }
      tags
      options { name values }
      variants(first: 100) {
        edges {
          node {
            id
            title
            price
            compareAtPrice
            availableForSale
            inventoryQuantity
            sku
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

const COLLECTION_QUERY = `#graphql
  query GetCollection($id: ID!) {
    collection(id: $id) {
      id
      title
      handle
      description
      image {
        url
        altText
        width
        height
      }
      productsCount {
        count
      }
      products(first: 20) {
        edges {
          node {
            id
            title
            handle
            description
            vendor
            productType
            priceRange {
              minVariantPrice { amount }
              maxVariantPrice { amount }
            }
            compareAtPriceRange {
              minVariantCompareAtPrice { amount }
            }
            totalInventory
            featuredImage {
              url
              altText
              width
              height
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                  width
                  height
                }
              }
            }
            tags
            options { name values }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  compareAtPrice
                  availableForSale
                  inventoryQuantity
                  sku
                  selectedOptions { name value }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const ARTICLE_QUERY = `#graphql
  query GetArticle($id: ID!) {
    article(id: $id) {
      id
      title
      handle
      body
      summary
      author {
        name
      }
      publishedAt
      image {
        url
        altText
        width
        height
      }
      tags
      blog {
        id
        title
        handle
      }
    }
  }
`;

const ARTICLES_LIST_QUERY = `#graphql
  query GetArticles($first: Int!) {
    articles(first: $first) {
      edges {
        node {
          id
          title
          handle
          summary
          publishedAt
          image {
            url
            altText
            width
            height
          }
          blog {
            id
            title
            handle
          }
        }
      }
    }
  }
`;

const SHOP_QUERY = `#graphql
  query GetShop {
    shop {
      name
      email
      primaryDomain {
        host
        url
      }
      currencyCode
      description
    }
  }
`;

// Response type helpers
interface GraphQLProductResponse {
  data?: {
    product?: {
      id: string;
      title: string;
      handle: string;
      description: string;
      vendor: string;
      productType: string;
      priceRange: {
        minVariantPrice: { amount: string; currencyCode: string };
        maxVariantPrice: { amount: string; currencyCode: string };
      };
      compareAtPriceRange?: {
        minVariantCompareAtPrice?: { amount: string };
      };
      totalInventory: number;
      featuredImage?: {
        url: string;
        altText?: string;
        width: number;
        height: number;
      };
      images: {
        edges: Array<{
          node: {
            url: string;
            altText?: string;
            width: number;
            height: number;
          };
        }>;
      };
      tags: string[];
      options: Array<{ name: string; values: string[] }>;
      variants: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            price: string;
            compareAtPrice?: string;
            availableForSale: boolean;
            inventoryQuantity?: number;
            sku?: string;
            selectedOptions: Array<{ name: string; value: string }>;
          };
        }>;
      };
    };
  };
}

interface GraphQLCollectionResponse {
  data?: {
    collection?: {
      id: string;
      title: string;
      handle: string;
      description: string;
      image?: {
        url: string;
        altText?: string;
        width: number;
        height: number;
      };
      productsCount: { count: number };
      products: {
        edges: Array<{
          node: NonNullable<NonNullable<GraphQLProductResponse['data']>['product']>;
        }>;
      };
    };
  };
}

interface GraphQLArticleResponse {
  data?: {
    article?: {
      id: string;
      title: string;
      handle: string;
      body: string;
      summary?: string;
      author?: { name: string };
      publishedAt: string;
      image?: {
        url: string;
        altText?: string;
        width: number;
        height: number;
      };
      tags: string[];
      blog?: {
        id: string;
        title: string;
        handle: string;
      };
    };
  };
}

interface GraphQLShopResponse {
  data?: {
    shop?: {
      name: string;
      email: string;
      primaryDomain: {
        host: string;
        url: string;
      };
      currencyCode: string;
      description?: string;
    };
  };
}

interface GraphQLArticlesListResponse {
  data?: {
    articles?: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          handle: string;
          summary?: string;
          publishedAt: string;
          image?: {
            url: string;
            altText?: string;
            width: number;
            height: number;
          };
          blog?: {
            id: string;
            title: string;
            handle: string;
          };
        };
      }>;
    };
  };
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

/** Article list item (lighter than full MockArticle) */
export interface ArticleListItem {
  id: string;
  title: string;
  handle: string;
  blogHandle: string;
  blogTitle: string;
  excerpt: string;
  image: string | null;
  publishedAt: string;
}

// Transform functions
function transformImage(graphqlImage: { url: string; altText?: string; width: number; height: number } | undefined | null): MockImage {
  if (!graphqlImage) {
    return {
      src: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      alt: 'Placeholder image',
      width: 600,
      height: 600
    };
  }
  return {
    src: graphqlImage.url,
    alt: graphqlImage.altText || '',
    width: graphqlImage.width || 600,
    height: graphqlImage.height || 600
  };
}

function extractNumericId(gid: string): number {
  const parts = gid.split('/');
  return parseInt(parts[parts.length - 1], 10) || 0;
}

function transformVariant(graphqlVariant: NonNullable<NonNullable<GraphQLProductResponse['data']>['product']>['variants']['edges'][0]['node']): MockProductVariant {
  const options = graphqlVariant.selectedOptions || [];
  return {
    id: extractNumericId(graphqlVariant.id),
    title: graphqlVariant.title,
    price: Math.round(parseFloat(graphqlVariant.price) * 100),
    available: graphqlVariant.availableForSale,
    inventory_quantity: graphqlVariant.inventoryQuantity || 0,
    sku: graphqlVariant.sku || '',
    option1: options[0]?.value || null,
    option2: options[1]?.value || null,
    option3: options[2]?.value || null
  };
}

function transformProduct(graphqlProduct: NonNullable<GraphQLProductResponse['data']>['product']): MockProduct | null {
  if (!graphqlProduct) return null;

  const priceMin = Math.round(parseFloat(graphqlProduct.priceRange.minVariantPrice.amount) * 100);
  const priceMax = Math.round(parseFloat(graphqlProduct.priceRange.maxVariantPrice.amount) * 100);
  const compareAtPrice = graphqlProduct.compareAtPriceRange?.minVariantCompareAtPrice?.amount
    ? Math.round(parseFloat(graphqlProduct.compareAtPriceRange.minVariantCompareAtPrice.amount) * 100)
    : null;

  return {
    id: extractNumericId(graphqlProduct.id),
    title: graphqlProduct.title,
    handle: graphqlProduct.handle,
    description: graphqlProduct.description || '',
    vendor: graphqlProduct.vendor || '',
    type: graphqlProduct.productType || '',
    price: priceMin,
    price_min: priceMin,
    price_max: priceMax,
    compare_at_price: compareAtPrice,
    available: graphqlProduct.variants.edges.some(e => e.node.availableForSale),
    inventory_quantity: graphqlProduct.totalInventory || 0,
    featured_image: transformImage(graphqlProduct.featuredImage),
    images: graphqlProduct.images.edges.map(e => transformImage(e.node)),
    tags: graphqlProduct.tags || [],
    options: graphqlProduct.options.map(o => o.name),
    variants: graphqlProduct.variants.edges.map(e => transformVariant(e.node)),
    url: `/products/${graphqlProduct.handle}`
  };
}

function transformCollection(graphqlCollection: NonNullable<GraphQLCollectionResponse['data']>['collection']): MockCollection | null {
  if (!graphqlCollection) return null;

  const products = graphqlCollection.products.edges
    .map(e => transformProduct(e.node))
    .filter((p): p is MockProduct => p !== null);

  return {
    id: extractNumericId(graphqlCollection.id),
    title: graphqlCollection.title,
    handle: graphqlCollection.handle,
    description: graphqlCollection.description || '',
    image: graphqlCollection.image ? transformImage(graphqlCollection.image) : null,
    products,
    products_count: graphqlCollection.productsCount?.count || products.length,
    url: `/collections/${graphqlCollection.handle}`
  };
}

function transformArticle(graphqlArticle: NonNullable<GraphQLArticleResponse['data']>['article']): MockArticle | null {
  if (!graphqlArticle) return null;

  return {
    id: extractNumericId(graphqlArticle.id),
    title: graphqlArticle.title,
    handle: graphqlArticle.handle,
    content: graphqlArticle.body || '',
    excerpt: graphqlArticle.summary || '',
    author: graphqlArticle.author?.name || 'Unknown',
    published_at: graphqlArticle.publishedAt,
    image: graphqlArticle.image ? transformImage(graphqlArticle.image) : null,
    tags: graphqlArticle.tags || [],
    url: graphqlArticle.blog
      ? `/blogs/${graphqlArticle.blog.handle}/${graphqlArticle.handle}`
      : `/blogs/news/${graphqlArticle.handle}`
  };
}

function transformShop(graphqlShop: NonNullable<GraphQLShopResponse['data']>['shop']): MockShop | null {
  if (!graphqlShop) return null;

  return {
    name: graphqlShop.name,
    email: graphqlShop.email || '',
    domain: graphqlShop.primaryDomain?.host || '',
    url: graphqlShop.primaryDomain?.url || '',
    currency: graphqlShop.currencyCode || 'USD',
    money_format: `$\${amount} ${graphqlShop.currencyCode || 'USD'}`,
    description: graphqlShop.description || ''
  };
}

/**
 * Service for fetching Shopify resource data via GraphQL
 */
export class ShopifyDataService {
  private cache = new SimpleCache();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Fetch a product by ID
   */
  async getProduct(request: Request, productId: string): Promise<MockProduct | null> {
    // Normalize product ID to GID format if needed
    const gid = productId.startsWith('gid://')
      ? productId
      : `gid://shopify/Product/${productId}`;

    const cacheKey = `product:${gid}`;
    const cached = this.cache.get<MockProduct>(cacheKey);
    if (cached) return cached;

    try {
      const { admin } = await authenticate.admin(request);
      const response = await admin.graphql(PRODUCT_QUERY, {
        variables: { id: gid }
      });

      const data = await response.json() as GraphQLProductResponse;
      if (!data.data?.product) return null;

      const product = transformProduct(data.data.product);
      if (product) {
        this.cache.set(cacheKey, product, this.CACHE_TTL);
      }

      return product;
    } catch (error) {
      console.error('[ShopifyDataService] Error fetching product:', error);
      return null;
    }
  }

  /**
   * Fetch a collection by ID
   */
  async getCollection(request: Request, collectionId: string): Promise<MockCollection | null> {
    const gid = collectionId.startsWith('gid://')
      ? collectionId
      : `gid://shopify/Collection/${collectionId}`;

    const cacheKey = `collection:${gid}`;
    const cached = this.cache.get<MockCollection>(cacheKey);
    if (cached) return cached;

    try {
      const { admin } = await authenticate.admin(request);
      const response = await admin.graphql(COLLECTION_QUERY, {
        variables: { id: gid }
      });

      const data = await response.json() as GraphQLCollectionResponse;
      if (!data.data?.collection) return null;

      const collection = transformCollection(data.data.collection);
      if (collection) {
        this.cache.set(cacheKey, collection, this.CACHE_TTL);
      }

      return collection;
    } catch (error) {
      console.error('[ShopifyDataService] Error fetching collection:', error);
      return null;
    }
  }

  /**
   * Fetch an article by ID
   */
  async getArticle(request: Request, articleId: string): Promise<MockArticle | null> {
    const gid = articleId.startsWith('gid://')
      ? articleId
      : `gid://shopify/Article/${articleId}`;

    const cacheKey = `article:${gid}`;
    const cached = this.cache.get<MockArticle>(cacheKey);
    if (cached) return cached;

    try {
      const { admin } = await authenticate.admin(request);
      const response = await admin.graphql(ARTICLE_QUERY, {
        variables: { id: gid }
      });

      const data = await response.json() as GraphQLArticleResponse;
      if (!data.data?.article) return null;

      const article = transformArticle(data.data.article);
      if (article) {
        this.cache.set(cacheKey, article, this.CACHE_TTL);
      }

      return article;
    } catch (error) {
      console.error('[ShopifyDataService] Error fetching article:', error);
      return null;
    }
  }

  /**
   * Fetch list of articles for dropdown selection
   */
  async getArticles(request: Request, limit: number = 50): Promise<ArticleListItem[]> {
    const cacheKey = `articles:list:${limit}`;
    const cached = this.cache.get<ArticleListItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const { admin } = await authenticate.admin(request);
      const response = await admin.graphql(ARTICLES_LIST_QUERY, {
        variables: { first: limit }
      });

      const data = await response.json() as GraphQLArticlesListResponse;

      // Check for GraphQL-level errors (e.g., missing scopes)
      if (data.errors?.length) {
        const errorMessages = data.errors.map(e => e.message).join(', ');
        console.error('[ShopifyDataService] GraphQL errors fetching articles:', errorMessages);
        throw new Error(`GraphQL error: ${errorMessages}`);
      }

      if (!data.data?.articles?.edges) {
        console.warn('[ShopifyDataService] No articles data in response');
        return [];
      }

      const articles: ArticleListItem[] = data.data.articles.edges.map(({ node }) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        blogHandle: node.blog?.handle || 'news',
        blogTitle: node.blog?.title || 'News',
        excerpt: node.summary || '',
        image: node.image?.url || null,
        publishedAt: node.publishedAt
      }));

      this.cache.set(cacheKey, articles, this.CACHE_TTL);
      return articles;
    } catch (error) {
      console.error('[ShopifyDataService] Error fetching articles:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Fetch shop data
   */
  async getShop(request: Request): Promise<MockShop | null> {
    const cacheKey = 'shop';
    const cached = this.cache.get<MockShop>(cacheKey);
    if (cached) return cached;

    try {
      const { admin } = await authenticate.admin(request);
      const response = await admin.graphql(SHOP_QUERY);

      const data = await response.json() as GraphQLShopResponse;
      if (!data.data?.shop) return null;

      const shop = transformShop(data.data.shop);
      if (shop) {
        this.cache.set(cacheKey, shop, this.CACHE_TTL);
      }

      return shop;
    } catch (error) {
      console.error('[ShopifyDataService] Error fetching shop:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  invalidateCache(type: 'product' | 'collection' | 'article' | 'shop', id?: string): void {
    if (type === 'shop') {
      this.cache.delete('shop');
    } else if (id) {
      const gid = id.startsWith('gid://') ? id : `gid://shopify/${type.charAt(0).toUpperCase() + type.slice(1)}/${id}`;
      this.cache.delete(`${type}:${gid}`);
    }
  }
}

export const shopifyDataService = new ShopifyDataService();
