import { ShopifyDrop } from './base/ShopifyDrop';
import { ImageDrop } from './ImageDrop';
import type { MockCart, MockCartItem } from '../mockData/types';

/**
 * CartItemDrop - Individual cart line item
 * Provides Liquid-compatible access to cart item properties
 */
export class CartItemDrop extends ShopifyDrop {
  private item: MockCartItem;

  constructor(item: MockCartItem) {
    super();
    this.item = item;
  }

  get id(): number { return this.item.id; }
  get title(): string { return this.item.title; }
  get quantity(): number { return this.item.quantity; }
  get price(): number { return this.item.price; }
  get line_price(): number { return this.item.line_price; }
  get original_price(): number { return this.item.price; }
  get original_line_price(): number { return this.item.line_price; }
  get final_price(): number { return this.item.price; }
  get final_line_price(): number { return this.item.line_price; }
  get url(): string { return this.item.url; }

  get image(): ImageDrop {
    return new ImageDrop(this.item.image);
  }

  get product(): { title: string; url: string } {
    return { title: this.item.title, url: this.item.url };
  }

  get variant(): { title: string } {
    return { title: 'Default' };
  }

  get discounts(): unknown[] { return []; }
  get properties(): Record<string, string> { return {}; }
  get selling_plan_allocation(): null { return null; }
}

/**
 * CartDrop - Shopping cart object
 * Provides Liquid-compatible access to cart properties
 */
export class CartDrop extends ShopifyDrop {
  private cart: MockCart;
  private _items: CartItemDrop[] | null = null;

  constructor(cart: MockCart) {
    super();
    this.cart = cart;
  }

  get item_count(): number { return this.cart.item_count; }
  get total_price(): number { return this.cart.total_price; }
  get original_total_price(): number { return this.cart.total_price; }
  get total_discount(): number { return 0; }
  get total_weight(): number { return 0; }
  get currency(): { iso_code: string } { return { iso_code: this.cart.currency }; }

  get items(): CartItemDrop[] {
    if (!this._items) {
      this._items = this.cart.items.map(item => new CartItemDrop(item));
    }
    return this._items;
  }

  get items_subtotal_price(): number { return this.cart.total_price; }
  get requires_shipping(): boolean { return true; }
  get note(): string { return ''; }
  get attributes(): Record<string, string> { return {}; }
  get cart_level_discount_applications(): unknown[] { return []; }
  get discount_applications(): unknown[] { return []; }

  /** Check if cart is empty */
  get empty(): boolean { return this.cart.item_count === 0; }
}
