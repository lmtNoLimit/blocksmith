import { ShopifyDrop } from './base/ShopifyDrop';

/**
 * ThemeDrop - Current theme metadata
 * Provides Liquid-compatible access to theme properties
 */
export class ThemeDrop extends ShopifyDrop {
  constructor() {
    super();
  }

  get id(): number { return 1; }
  get name(): string { return 'Preview Theme'; }
  get role(): string { return 'main'; }
  get theme_store_id(): null { return null; }
}

/**
 * SettingsDrop - Global theme settings
 * Acts as a passthrough for settings values
 */
export class SettingsDrop extends ShopifyDrop {
  private settingsData: Record<string, unknown>;

  constructor(settings: Record<string, unknown> = {}) {
    super();
    this.settingsData = settings;
  }

  liquidMethodMissing(key: string): unknown {
    return this.settingsData[key];
  }

  /** Get a setting by key */
  get(key: string): unknown {
    return this.settingsData[key];
  }

  /** Check if a setting exists */
  has(key: string): boolean {
    return key in this.settingsData;
  }
}
