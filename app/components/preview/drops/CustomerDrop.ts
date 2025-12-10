import { ShopifyDrop } from './base/ShopifyDrop';
import type { MockCustomer } from '../mockData/types';

/**
 * CustomerDrop - Logged-in customer data
 * Provides Liquid-compatible access to customer properties
 * Returns null/empty values when no customer is logged in
 */
export class CustomerDrop extends ShopifyDrop {
  private customer: MockCustomer | null;

  constructor(customer: MockCustomer | null) {
    super();
    this.customer = customer;
  }

  get id(): number | null { return this.customer?.id ?? null; }
  get email(): string { return this.customer?.email ?? ''; }
  get first_name(): string { return this.customer?.first_name ?? ''; }
  get last_name(): string { return this.customer?.last_name ?? ''; }
  get name(): string { return this.customer?.name ?? ''; }
  get orders_count(): number { return this.customer?.orders_count ?? 0; }
  get total_spent(): number { return this.customer?.total_spent ?? 0; }

  get phone(): string { return ''; }
  get default_address(): null { return null; }
  get addresses(): unknown[] { return []; }
  get orders(): unknown[] { return []; }
  get tags(): string[] { return []; }
  get tax_exempt(): boolean { return false; }
  get accepts_marketing(): boolean { return false; }
  get has_account(): boolean { return this.customer !== null; }

  /** Liquid truthy check - returns false when no customer */
  valueOf(): boolean { return this.customer !== null; }

  /** For Liquid truthiness check */
  toLiquid(): MockCustomer | null { return this.customer; }
}
