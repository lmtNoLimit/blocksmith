import { ShopifyDrop } from './base/ShopifyDrop';
import { ProductDrop } from './ProductDrop';
import { ImageDrop } from './ImageDrop';
import type { MockCollection } from '../mockData/types';

/**
 * Drop class for collection objects
 * Provides Liquid-compatible access to collection properties
 */
export class CollectionDrop extends ShopifyDrop {
  private collection: MockCollection;
  private _products: ProductDrop[] | null = null;

  constructor(collection: MockCollection) {
    super();
    this.collection = collection;
  }

  get id(): number {
    return this.collection.id;
  }

  get title(): string {
    return this.collection.title;
  }

  get handle(): string {
    return this.collection.handle;
  }

  get description(): string {
    return this.collection.description;
  }

  get url(): string {
    return this.collection.url;
  }

  get products_count(): number {
    return this.collection.products_count;
  }

  get image(): ImageDrop | null {
    return this.collection.image
      ? new ImageDrop(this.collection.image)
      : null;
  }

  get products(): ProductDrop[] {
    if (!this._products) {
      this._products = this.collection.products.map(p => new ProductDrop(p));
    }
    return this._products;
  }

  /**
   * Get all unique tags from products in this collection
   */
  get all_tags(): string[] {
    const tagSet = new Set<string>();
    this.collection.products.forEach(p => {
      p.tags.forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }

  /**
   * Get all unique product types
   */
  get all_types(): string[] {
    const typeSet = new Set<string>();
    this.collection.products.forEach(p => {
      if (p.type) typeSet.add(p.type);
    });
    return Array.from(typeSet).sort();
  }

  /**
   * Get all unique vendors
   */
  get all_vendors(): string[] {
    const vendorSet = new Set<string>();
    this.collection.products.forEach(p => {
      if (p.vendor) vendorSet.add(p.vendor);
    });
    return Array.from(vendorSet).sort();
  }

  /**
   * Default sort order
   */
  get default_sort_by(): string {
    return 'best-selling';
  }

  /**
   * Current sort option
   */
  get sort_by(): string {
    return this.default_sort_by;
  }

  /**
   * Available sort options
   */
  get sort_options(): Array<{ name: string; value: string }> {
    return [
      { name: 'Best Selling', value: 'best-selling' },
      { name: 'Alphabetically, A-Z', value: 'title-ascending' },
      { name: 'Alphabetically, Z-A', value: 'title-descending' },
      { name: 'Price, low to high', value: 'price-ascending' },
      { name: 'Price, high to low', value: 'price-descending' },
      { name: 'Date, old to new', value: 'created-ascending' },
      { name: 'Date, new to old', value: 'created-descending' }
    ];
  }

  // Phase 2: Missing properties

  /** Featured image - alias for image */
  get featured_image(): ImageDrop | null {
    return this.image;
  }

  /** Current vendor filter */
  get current_vendor(): string { return ''; }

  /** Current type filter */
  get current_type(): string { return ''; }

  /** Collection filters - placeholder */
  get filters(): unknown[] { return []; }

  /** Template suffix */
  get template_suffix(): string { return ''; }

  /** Metafields object - placeholder for custom data */
  get metafields(): Record<string, unknown> {
    return {};
  }

  /** Publication date */
  get published_at(): string {
    return new Date().toISOString();
  }

  liquidMethodMissing(key: string): unknown {
    const data = this.collection as unknown as Record<string, unknown>;
    return data[key];
  }
}
