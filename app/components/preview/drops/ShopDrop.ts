import { ShopifyDrop } from './base/ShopifyDrop';
import type { MockShop } from '../mockData/types';

/**
 * Drop class for shop objects
 * Provides Liquid-compatible access to shop properties
 */
export class ShopDrop extends ShopifyDrop {
  private shop: MockShop;

  constructor(shop: MockShop) {
    super();
    this.shop = shop;
  }

  get name(): string {
    return this.shop.name;
  }

  get email(): string {
    return this.shop.email;
  }

  get domain(): string {
    return this.shop.domain;
  }

  get url(): string {
    return this.shop.url;
  }

  get secure_url(): string {
    return this.shop.url.startsWith('https://') ? this.shop.url : `https://${this.shop.url}`;
  }

  get currency(): string {
    return this.shop.currency;
  }

  get money_format(): string {
    return this.shop.money_format;
  }

  get money_with_currency_format(): string {
    return `${this.shop.money_format} ${this.shop.currency}`;
  }

  get description(): string {
    return this.shop.description;
  }

  /**
   * Whether prices include taxes
   */
  get taxes_included(): boolean {
    return false;
  }

  /**
   * Whether customer accounts are enabled
   */
  get customer_accounts_enabled(): boolean {
    return true;
  }

  /**
   * Whether customer accounts are optional
   */
  get customer_accounts_optional(): boolean {
    return true;
  }

  /**
   * Shop address (placeholder)
   */
  get address(): {
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  } {
    return {
      address1: '',
      address2: '',
      city: '',
      province: '',
      country: '',
      zip: ''
    };
  }

  /**
   * Shop phone (placeholder)
   */
  get phone(): string {
    return '';
  }

  /**
   * Enabled payment types (placeholder)
   */
  get enabled_payment_types(): string[] {
    return ['visa', 'mastercard', 'american_express', 'paypal'];
  }

  /**
   * Shop locale
   */
  get locale(): string {
    return 'en';
  }

  // Phase 2: Missing properties

  /** Shop brand (placeholder) */
  get brand(): { logo: null; colors: Record<string, unknown>; short_description: string } {
    return {
      logo: null,
      colors: {},
      short_description: this.shop.description
    };
  }

  /** Metafields object - placeholder for custom data */
  get metafields(): Record<string, unknown> {
    return {};
  }

  /** Shop policies */
  get policies(): Array<{ title: string; body: string; url: string }> {
    return [];
  }

  /** Refund policy */
  get refund_policy(): { title: string; body: string; url: string } | null {
    return null;
  }

  /** Privacy policy */
  get privacy_policy(): { title: string; body: string; url: string } | null {
    return null;
  }

  /** Shipping policy */
  get shipping_policy(): { title: string; body: string; url: string } | null {
    return null;
  }

  /** Terms of service */
  get terms_of_service(): { title: string; body: string; url: string } | null {
    return null;
  }

  /** Subscription policy */
  get subscription_policy(): { title: string; body: string; url: string } | null {
    return null;
  }

  /** Published locales */
  get published_locales(): Array<{ iso_code: string; primary: boolean }> {
    return [{ iso_code: 'en', primary: true }];
  }

  /** Total products count (placeholder) */
  get products_count(): number {
    return 0;
  }

  /** Total collections count (placeholder) */
  get collections_count(): number {
    return 0;
  }

  /** Available product types */
  get types(): string[] {
    return [];
  }

  /** Available vendors */
  get vendors(): string[] {
    return [];
  }

  /** Permanent domain */
  get permanent_domain(): string {
    return this.shop.domain;
  }

  liquidMethodMissing(key: string): unknown {
    const data = this.shop as unknown as Record<string, unknown>;
    return data[key];
  }
}
