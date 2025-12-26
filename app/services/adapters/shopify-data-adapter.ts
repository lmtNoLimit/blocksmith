import type {
  MockProduct,
  MockCollection,
  MockArticle,
  MockShop
} from '../../components/preview/mockData/types';
import { shopifyDataService, type ArticleListItem } from '../shopify-data.server';

/**
 * Adapter interface for Shopify data fetching
 */
export interface ShopifyDataAdapterInterface {
  getProduct(request: Request, productId: string): Promise<MockProduct | null>;
  getCollection(request: Request, collectionId: string): Promise<MockCollection | null>;
  getArticle(request: Request, articleId: string): Promise<MockArticle | null>;
  getArticles(request: Request, limit?: number): Promise<ArticleListItem[]>;
  getShop(request: Request): Promise<MockShop | null>;
  clearCache(): void;
}

/**
 * Shopify Data Service Adapter
 * Provides a consistent interface to the Shopify data fetching service
 */
class ShopifyDataAdapter implements ShopifyDataAdapterInterface {
  /**
   * Fetch a product by ID
   * @param request - The current request for authentication
   * @param productId - Product ID (can be numeric or GID format)
   */
  async getProduct(request: Request, productId: string): Promise<MockProduct | null> {
    return shopifyDataService.getProduct(request, productId);
  }

  /**
   * Fetch a collection by ID
   * @param request - The current request for authentication
   * @param collectionId - Collection ID (can be numeric or GID format)
   */
  async getCollection(request: Request, collectionId: string): Promise<MockCollection | null> {
    return shopifyDataService.getCollection(request, collectionId);
  }

  /**
   * Fetch an article by ID
   * @param request - The current request for authentication
   * @param articleId - Article ID (can be numeric or GID format)
   */
  async getArticle(request: Request, articleId: string): Promise<MockArticle | null> {
    return shopifyDataService.getArticle(request, articleId);
  }

  /**
   * Fetch list of articles for dropdown selection
   * @param request - The current request for authentication
   * @param limit - Maximum number of articles to fetch (default 50)
   */
  async getArticles(request: Request, limit?: number): Promise<ArticleListItem[]> {
    return shopifyDataService.getArticles(request, limit);
  }

  /**
   * Fetch shop data
   * @param request - The current request for authentication
   */
  async getShop(request: Request): Promise<MockShop | null> {
    return shopifyDataService.getShop(request);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    shopifyDataService.clearCache();
  }
}

export const shopifyDataAdapter = new ShopifyDataAdapter();
