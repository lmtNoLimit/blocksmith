import { ShopifyDrop } from './base/ShopifyDrop';
import type { MockRequest } from '../mockData/types';

/**
 * RequestDrop - Request/context information
 * Provides access to request details like design_mode, page_type, path
 */
export class RequestDrop extends ShopifyDrop {
  private data: MockRequest & { host?: string; origin?: string };

  constructor(data: Partial<MockRequest> & { host?: string; origin?: string } = {}) {
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
  get design_mode(): boolean { return this.data.design_mode; }

  /** Current page type (product, collection, index, etc.) */
  get page_type(): string { return this.data.page_type; }

  /** Current request path */
  get path(): string { return this.data.path; }

  /** Request host */
  get host(): string { return this.data.host ?? 'preview.myshopify.com'; }

  /** Request origin */
  get origin(): string { return this.data.origin ?? 'https://preview.myshopify.com'; }

  /** Locale from Accept-Language */
  get locale(): { iso_code: string; primary: boolean } {
    return { iso_code: 'en', primary: true };
  }
}
