import { ShopifyDrop } from './base/ShopifyDrop';
import { VariantDrop } from './VariantDrop';
import { ImageDrop } from './ImageDrop';
import type { MockProduct } from '../mockData/types';

/**
 * Drop class for product objects
 * Provides Liquid-compatible access to product properties
 */
export class ProductDrop extends ShopifyDrop {
  private product: MockProduct;
  private _variants: VariantDrop[] | null = null;
  private _images: ImageDrop[] | null = null;

  constructor(product: MockProduct) {
    super();
    this.product = product;
  }

  // Basic properties
  get id(): number {
    return this.product.id;
  }

  get title(): string {
    return this.product.title;
  }

  get handle(): string {
    return this.product.handle;
  }

  get description(): string {
    return this.product.description;
  }

  get vendor(): string {
    return this.product.vendor;
  }

  get type(): string {
    return this.product.type;
  }

  get url(): string {
    return this.product.url;
  }

  // Price properties (in cents for Shopify convention)
  get price(): number {
    return this.product.price;
  }

  get price_min(): number {
    return this.product.price_min;
  }

  get price_max(): number {
    return this.product.price_max;
  }

  get compare_at_price(): number | null {
    return this.product.compare_at_price;
  }

  get compare_at_price_min(): number | null {
    return this.product.compare_at_price;
  }

  get compare_at_price_max(): number | null {
    return this.product.compare_at_price;
  }

  // Availability
  get available(): boolean {
    return this.product.available;
  }

  get inventory_quantity(): number {
    return this.product.inventory_quantity;
  }

  // Images
  get featured_image(): ImageDrop | null {
    return this.product.featured_image
      ? new ImageDrop(this.product.featured_image)
      : null;
  }

  get images(): ImageDrop[] {
    if (!this._images) {
      this._images = this.product.images.map(img => new ImageDrop(img));
    }
    return this._images;
  }

  get first_available_image(): ImageDrop | null {
    return this.images.length > 0 ? this.images[0] : null;
  }

  // Variants
  get variants(): VariantDrop[] {
    if (!this._variants) {
      this._variants = this.product.variants.map(v => new VariantDrop(v));
    }
    return this._variants;
  }

  get selected_variant(): VariantDrop | null {
    // Default to first available variant
    const variant = this.product.variants.find(v => v.available)
      || this.product.variants[0];
    return variant ? new VariantDrop(variant) : null;
  }

  get selected_or_first_available_variant(): VariantDrop | null {
    return this.selected_variant;
  }

  get first_available_variant(): VariantDrop | null {
    const variant = this.product.variants.find(v => v.available);
    return variant ? new VariantDrop(variant) : null;
  }

  get has_only_default_variant(): boolean {
    return this.product.variants.length === 1
      && this.product.variants[0].title === 'Default Title';
  }

  // Tags and options
  get tags(): string[] {
    return this.product.tags;
  }

  get options(): string[] {
    return this.product.options;
  }

  get options_with_values(): Array<{ name: string; values: string[] }> {
    // Build options with values from variants
    const optionsMap = new Map<string, Set<string>>();

    this.product.options.forEach(optionName => {
      optionsMap.set(optionName, new Set());
    });

    this.product.variants.forEach(variant => {
      if (variant.option1 && this.product.options[0]) {
        optionsMap.get(this.product.options[0])?.add(variant.option1);
      }
      if (variant.option2 && this.product.options[1]) {
        optionsMap.get(this.product.options[1])?.add(variant.option2);
      }
      if (variant.option3 && this.product.options[2]) {
        optionsMap.get(this.product.options[2])?.add(variant.option3);
      }
    });

    return Array.from(optionsMap.entries()).map(([name, valuesSet]) => ({
      name,
      values: Array.from(valuesSet)
    }));
  }

  // Liquid helper properties
  get on_sale(): boolean {
    return this.product.compare_at_price !== null
      && this.product.compare_at_price > this.product.price;
  }

  get price_varies(): boolean {
    return this.product.price_min !== this.product.price_max;
  }

  get compare_at_price_varies(): boolean {
    // Simplified: we only have min compare price
    return false;
  }

  // Content accessor for description
  get content(): string {
    return this.product.description;
  }

  // Phase 2: Missing properties

  /** Metafields object - placeholder for custom data */
  get metafields(): Record<string, unknown> {
    return {};
  }

  /** Media array - includes images */
  get media(): ImageDrop[] {
    return this.images;
  }

  /** Featured media - same as featured image */
  get featured_media(): ImageDrop | null {
    return this.featured_image;
  }

  /** Whether product is a gift card */
  get gift_card(): boolean { return false; }
  get 'gift_card?'(): boolean { return false; }

  /** Publication date */
  get published_at(): string {
    return new Date().toISOString();
  }

  /** Creation date */
  get created_at(): string {
    return new Date().toISOString();
  }

  /** Whether product requires a selling plan */
  get requires_selling_plan(): boolean { return false; }

  /** Selling plan groups */
  get selling_plan_groups(): unknown[] { return []; }

  /** Whether product has quantity price breaks */
  get quantity_price_breaks_configured(): boolean { return false; }
  get 'quantity_price_breaks_configured?'(): boolean { return false; }

  /** Template suffix */
  get template_suffix(): string { return ''; }

  // Dynamic property access
  liquidMethodMissing(key: string): unknown {
    const data = this.product as unknown as Record<string, unknown>;
    return data[key];
  }
}
