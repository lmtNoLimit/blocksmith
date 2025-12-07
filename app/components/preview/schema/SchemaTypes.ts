/**
 * Shopify section schema types
 * Supports all 31 input setting types from Shopify theme documentation
 */

export type SettingType =
  // Basic Input
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'inline_richtext'
  | 'number'
  | 'range'
  | 'checkbox'
  | 'select'
  | 'radio'
  // Color & Design
  | 'color'
  | 'color_background'
  | 'font_picker'
  | 'text_alignment'
  // Media
  | 'image_picker'
  | 'video'
  | 'video_url'
  // Rich Content
  | 'url'
  | 'html'
  | 'liquid'
  // Resource Pickers
  | 'article'
  | 'blog'
  | 'collection'
  | 'page'
  | 'product'
  | 'link_list'
  // Resource Lists
  | 'collection_list'
  | 'product_list'
  // Sidebar
  | 'header'
  | 'paragraph'
  // Advanced (deferred)
  | 'color_scheme'
  | 'color_scheme_group'
  | 'metaobject'
  | 'metaobject_list';

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
  // Video URL specific
  accept?: string[];
  // List types
  limit?: number;
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
