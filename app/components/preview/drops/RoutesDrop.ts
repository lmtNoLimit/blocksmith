import { ShopifyDrop } from './base/ShopifyDrop';

/**
 * RoutesDrop - URL generation helpers
 * Provides common Shopify store URLs for templates
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
