/**
 * Shopify section schema types
 */

export type SettingType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'range'
  | 'checkbox'
  | 'select'
  | 'color'
  | 'color_background'
  | 'image_picker'
  | 'url'
  | 'video_url'
  | 'font_picker'
  | 'html'
  | 'article'
  | 'blog'
  | 'collection'
  | 'page'
  | 'product'
  | 'link_list'
  | 'header'
  | 'paragraph';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

export interface SchemaSetting {
  type: SettingType;
  id: string;
  label: string;
  default?: string | number | boolean;
  placeholder?: string;
  info?: string;
  // Type-specific properties
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // Header/paragraph content
  content?: string;
}

export interface SchemaBlock {
  type: string;
  name: string;
  settings?: SchemaSetting[];
  limit?: number;
}

export interface SchemaPreset {
  name: string;
  settings?: Record<string, unknown>;
  blocks?: Array<{ type: string; settings?: Record<string, unknown> }>;
}

export interface SchemaDefinition {
  name: string;
  tag?: string;
  class?: string;
  limit?: number;
  settings?: SchemaSetting[];
  blocks?: SchemaBlock[];
  presets?: SchemaPreset[];
  default?: {
    settings?: Record<string, unknown>;
    blocks?: Array<{ type: string; settings?: Record<string, unknown> }>;
  };
}

export type SettingsState = Record<string, string | number | boolean>;

/**
 * Runtime block instance with settings
 * Represents a single block in section.blocks array
 */
export interface BlockInstance {
  id: string;           // Unique identifier (auto-generated)
  type: string;         // Block type from schema
  settings: SettingsState;  // Block-specific settings with defaults
}
