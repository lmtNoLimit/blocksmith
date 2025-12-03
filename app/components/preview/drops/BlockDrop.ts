import { ShopifyDrop } from './base/ShopifyDrop';
import type { BlockInstance } from '../schema/SchemaTypes';

/**
 * Drop class for block objects
 * Provides Liquid-compatible access to block properties
 *
 * Usage in Liquid:
 * {% for block in section.blocks %}
 *   {{ block.id }}
 *   {{ block.type }}
 *   {{ block.settings.heading }}
 *   <div {{ block.shopify_attributes }}>...</div>
 * {% endfor %}
 */
export class BlockDrop extends ShopifyDrop {
  private block: BlockInstance;
  private _settingsDrop: Record<string, unknown> | null = null;

  constructor(block: BlockInstance) {
    super();
    this.block = block;
  }

  /**
   * Unique block identifier
   */
  get id(): string {
    return this.block.id;
  }

  /**
   * Block type from schema definition
   */
  get type(): string {
    return this.block.type;
  }

  /**
   * Block settings object
   * Returns settings wrapped for Liquid access
   */
  get settings(): Record<string, unknown> {
    if (!this._settingsDrop) {
      // Wrap settings in plain object for Liquid access
      // LiquidJS can access nested properties directly
      this._settingsDrop = { ...this.block.settings };
    }
    return this._settingsDrop;
  }

  /**
   * Shopify theme editor attributes
   * Renders as HTML data attributes for block identification
   *
   * Output: data-block-id="block-0" data-block-type="feature"
   */
  get shopify_attributes(): string {
    return `data-block-id="${this.block.id}" data-block-type="${this.block.type}"`;
  }

  /**
   * Dynamic property access fallback
   * Allows access to any block instance properties
   */
  liquidMethodMissing(key: string): unknown {
    const data = this.block as unknown as Record<string, unknown>;
    return data[key];
  }

  /**
   * String representation for debugging
   */
  valueOf(): string {
    return `[Block: ${this.block.type}]`;
  }
}
