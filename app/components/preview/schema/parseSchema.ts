import type { SchemaDefinition, SchemaSetting, SettingsState, SchemaBlock, BlockInstance, SettingType } from './SchemaTypes';

/**
 * Resource types that don't support default values in Shopify schema
 * These require metafield references or dynamic content
 */
export const RESOURCE_TYPES: SettingType[] = [
  'product', 'collection', 'article', 'blog', 'page', 'link_list',
  'product_list', 'collection_list', 'metaobject', 'metaobject_list'
];

/**
 * Presentational setting types that support defaults in blocks
 * These can be synced to preset.blocks[].settings
 */
export const PRESENTATIONAL_TYPES: SettingType[] = [
  'checkbox', 'color', 'color_background', 'color_scheme',
  'font_picker', 'number', 'radio', 'range', 'select', 'text_alignment'
];

/**
 * Check if a setting type is a resource type (no default support)
 */
export function isResourceType(type: SettingType): boolean {
  return RESOURCE_TYPES.includes(type);
}

/**
 * Check if a setting type is presentational (supports block defaults)
 */
export function isPresentationalType(type: SettingType): boolean {
  return PRESENTATIONAL_TYPES.includes(type);
}

/**
 * Resolve Shopify translation key to human-readable label.
 * Handles keys like "t:sections.hero.settings.heading.label"
 *
 * @example
 * resolveTranslationKey("t:sections.hero.settings.heading.label") // "Heading"
 * resolveTranslationKey("Background Color") // "Background Color" (unchanged)
 */
export function resolveTranslationKey(value: string | undefined): string {
  if (!value) return '';

  // Check if it's a translation key (starts with "t:")
  if (!value.startsWith('t:')) {
    return value;
  }

  // Extract the last meaningful part of the key
  // "t:sections.hero.settings.heading.label" -> ["sections", "hero", "settings", "heading", "label"]
  const parts = value.slice(2).split('.');

  // Find the most meaningful part (not "label", "info", "options", "name", etc.)
  const skipWords = ['label', 'info', 'placeholder', 'options', 't', 'sections', 'blocks', 'settings', 'name'];
  let meaningfulPart = '';

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // Skip common suffixes/prefixes and options patterns (options__1, options__2, etc)
    if (!skipWords.includes(part.toLowerCase()) && !part.match(/^options__\d+$/)) {
      meaningfulPart = part;
      break;
    }
  }

  // Convert snake_case to Title Case
  if (meaningfulPart) {
    return meaningfulPart
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Fallback: return original without "t:" prefix
  return value.slice(2);
}

/**
 * Resolve all translation keys in a setting object
 */
function resolveSettingLabels(setting: SchemaSetting): SchemaSetting {
  const resolved = { ...setting };

  // Resolve main label and info
  if (resolved.label) {
    resolved.label = resolveTranslationKey(resolved.label);
  }
  if (resolved.info) {
    resolved.info = resolveTranslationKey(resolved.info);
  }
  if (resolved.placeholder) {
    resolved.placeholder = resolveTranslationKey(resolved.placeholder);
  }

  // Resolve select/radio option labels
  if (resolved.options && Array.isArray(resolved.options)) {
    resolved.options = resolved.options.map(opt => ({
      ...opt,
      label: resolveTranslationKey(opt.label)
    }));
  }

  return resolved;
}

/**
 * Extract and parse {% schema %} block from Liquid code
 */
export function parseSchema(liquidCode: string): SchemaDefinition | null {
  // Match {% schema %}...{% endschema %}
  const schemaMatch = liquidCode.match(
    /\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/
  );

  if (!schemaMatch || !schemaMatch[1]) {
    return null;
  }

  try {
    const schemaJson = schemaMatch[1].trim();
    const schema = JSON.parse(schemaJson) as SchemaDefinition;

    // Validate required fields
    if (!schema.name || typeof schema.name !== 'string') {
      console.warn('Schema missing required "name" field');
    }

    return schema;
  } catch (error) {
    console.error('Failed to parse schema JSON:', error);
    return null;
  }
}

/**
 * Extract settings array from schema, filtering to supported types
 * Also resolves any translation keys to human-readable labels
 */
export function extractSettings(schema: SchemaDefinition | null): SchemaSetting[] {
  if (!schema?.settings) {
    return [];
  }

  // All editable setting types (exclude header/paragraph display-only)
  const supportedTypes = [
    // Text inputs
    'text', 'textarea', 'richtext', 'inline_richtext', 'html', 'liquid', 'url',
    // Numbers
    'number', 'range',
    // Boolean
    'checkbox',
    // Selection
    'select', 'radio', 'text_alignment',
    // Colors
    'color', 'color_background',
    // Media
    'image_picker', 'video', 'video_url',
    // Typography
    'font_picker',
    // Single resource pickers
    'product', 'collection', 'article', 'blog', 'page', 'link_list',
    // Multi-select resources
    'product_list', 'collection_list',
    // Advanced (partial support)
    'metaobject', 'metaobject_list',
    'color_scheme', 'color_scheme_group'
  ];

  return schema.settings
    .filter(setting => supportedTypes.includes(setting.type) && setting.id)
    .map(resolveSettingLabels); // Resolve any translation keys
}

/**
 * Build initial state from schema defaults
 * Covers all 31 Shopify schema setting types
 */
export function buildInitialState(settings: SchemaSetting[]): SettingsState {
  const state: SettingsState = {};

  for (const setting of settings) {
    // Use explicit default if provided
    if (setting.default !== undefined) {
      state[setting.id] = setting.default;
      continue;
    }

    // Type-specific fallback defaults
    switch (setting.type) {
      // Boolean
      case 'checkbox':
        state[setting.id] = false;
        break;

      // Numbers
      case 'number':
      case 'range':
        state[setting.id] = setting.min ?? 0;
        break;

      // Colors
      case 'color':
      case 'color_background':
        state[setting.id] = '#000000';
        break;

      // Selection (use first option)
      case 'select':
      case 'radio':
        state[setting.id] = setting.options?.[0]?.value ?? '';
        break;

      // Text alignment
      case 'text_alignment':
        state[setting.id] = 'left';
        break;

      // Font picker
      case 'font_picker':
        state[setting.id] = 'system-ui';
        break;

      // Media pickers
      case 'image_picker':
        state[setting.id] = '';
        break;

      case 'video':
      case 'video_url':
        state[setting.id] = '';
        break;

      // Resource pickers (no defaults per Shopify spec)
      case 'product':
      case 'collection':
      case 'article':
      case 'blog':
      case 'page':
      case 'link_list':
        state[setting.id] = '';
        break;

      // Resource lists (empty array as JSON string)
      case 'product_list':
      case 'collection_list':
        state[setting.id] = '[]';
        break;

      // URL (recommend '#' for buttons)
      case 'url':
        state[setting.id] = '#';
        break;

      // Text inputs
      case 'text':
      case 'textarea':
      case 'richtext':
      case 'inline_richtext':
      case 'html':
      case 'liquid':
        state[setting.id] = '';
        break;

      // Display-only types (header, paragraph) - no value needed
      case 'header':
      case 'paragraph':
        // These don't store values, skip assignment
        break;

      // Metaobjects (advanced)
      case 'metaobject':
      case 'metaobject_list':
        state[setting.id] = '';
        break;

      // Color schemes (advanced)
      case 'color_scheme':
      case 'color_scheme_group':
        state[setting.id] = '';
        break;

      // Fallback for any unknown types
      default:
        state[setting.id] = '';
    }
  }

  return state;
}

/**
 * Coerce value to appropriate type based on setting type
 */
export function coerceValue(
  value: string | number | boolean,
  settingType: string
): string | number | boolean {
  switch (settingType) {
    case 'checkbox':
      return Boolean(value);
    case 'number':
    case 'range':
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    default:
      return String(value);
  }
}

/**
 * Extract block definitions from schema
 * Resolves translation keys in block names and settings
 */
export function extractBlocks(schema: SchemaDefinition | null): SchemaBlock[] {
  if (!schema?.blocks) return [];

  return schema.blocks
    .filter(block => block.type && block.name)
    .map(block => ({
      ...block,
      name: resolveTranslationKey(block.name),
      settings: block.settings?.map(resolveSettingLabels)
    }));
}

/**
 * Build block instances from preset configuration
 * Initializes blocks with default settings from schema
 */
export function buildBlockInstancesFromPreset(
  schema: SchemaDefinition | null
): BlockInstance[] {
  if (!schema) return [];

  // Get blocks from first preset or default
  const presetBlocks = schema.presets?.[0]?.blocks || schema.default?.blocks || [];

  return presetBlocks.map((presetBlock, index) => {
    // Find block definition in schema.blocks
    const blockDef = schema.blocks?.find(b => b.type === presetBlock.type);

    // Build settings with defaults from block definition
    const blockSettings = blockDef?.settings || [];
    const settings = buildInitialState(blockSettings);

    // Apply preset overrides if any
    if (presetBlock.settings) {
      Object.assign(settings, presetBlock.settings);
    }

    return {
      id: `block-${index}`,
      type: presetBlock.type,
      settings
    };
  });
}

/**
 * Update schema setting defaults in Liquid code
 * Modifies only the `default` attribute of each setting in {% schema %}
 * Skips resource-based settings that don't support defaults
 */
export function updateSchemaDefaults(
  liquidCode: string,
  newDefaults: SettingsState
): string {
  const schemaMatch = liquidCode.match(
    /(\{%\s*schema\s*%\})([\s\S]*?)(\{%\s*endschema\s*%\})/
  );
  if (!schemaMatch) return liquidCode;

  const [fullMatch, openTag, schemaJson, closeTag] = schemaMatch;

  try {
    const schema = JSON.parse(schemaJson.trim()) as SchemaDefinition;

    if (schema.settings) {
      schema.settings = schema.settings.map(setting => {
        if (!setting.id || newDefaults[setting.id] === undefined) {
          return setting;
        }
        if (RESOURCE_TYPES.includes(setting.type)) {
          return setting;
        }
        return { ...setting, default: newDefaults[setting.id] };
      });
    }

    const updatedSchema = JSON.stringify(schema, null, 2);
    return liquidCode.replace(fullMatch, `${openTag}\n${updatedSchema}\n${closeTag}`);
  } catch {
    console.error('Failed to update schema defaults');
    return liquidCode;
  }
}

/**
 * Result of schema defaults update with tracking
 */
export interface SettingsSyncResult {
  code: string;
  unsupportedSettings: string[]; // IDs of resource settings that couldn't be synced
}

/**
 * Update schema defaults with detailed report of skipped settings
 * Returns both updated code and list of unsupported settings
 */
export function updateSchemaDefaultsWithReport(
  liquidCode: string,
  newDefaults: SettingsState
): SettingsSyncResult {
  const unsupportedSettings: string[] = [];

  const schemaMatch = liquidCode.match(
    /(\{%\s*schema\s*%\})([\s\S]*?)(\{%\s*endschema\s*%\})/
  );
  if (!schemaMatch) return { code: liquidCode, unsupportedSettings };

  const [fullMatch, openTag, schemaJson, closeTag] = schemaMatch;

  try {
    const schema = JSON.parse(schemaJson.trim()) as SchemaDefinition;

    if (schema.settings) {
      schema.settings = schema.settings.map(setting => {
        if (!setting.id || newDefaults[setting.id] === undefined) {
          return setting;
        }
        if (RESOURCE_TYPES.includes(setting.type)) {
          unsupportedSettings.push(setting.id);
          return setting;
        }
        return { ...setting, default: newDefaults[setting.id] };
      });
    }

    const updatedSchema = JSON.stringify(schema, null, 2);
    const code = liquidCode.replace(fullMatch, `${openTag}\n${updatedSchema}\n${closeTag}`);
    return { code, unsupportedSettings };
  } catch {
    console.error('Failed to update schema defaults');
    return { code: liquidCode, unsupportedSettings };
  }
}

/**
 * Build default value for a setting type
 * Used when setting has no explicit default
 */
function buildDefaultForType(setting: SchemaSetting): string | number | boolean {
  switch (setting.type) {
    case 'checkbox':
      return false;
    case 'number':
    case 'range':
      return setting.min ?? 0;
    case 'color':
    case 'color_background':
      return '#000000';
    case 'select':
    case 'radio':
      return setting.options?.[0]?.value ?? '';
    case 'text_alignment':
      return 'left';
    case 'font_picker':
      return 'system-ui';
    case 'url':
      return '#';
    default:
      return '';
  }
}

/**
 * Compare current schema defaults with new settings
 * Returns only changed settings for efficient updates
 */
export function getSettingsDiff(
  schema: SchemaDefinition | null,
  newValues: SettingsState
): Partial<SettingsState> {
  if (!schema?.settings) return {};

  const diff: Partial<SettingsState> = {};
  for (const setting of schema.settings) {
    if (!setting.id) continue;
    const oldValue = setting.default ?? buildDefaultForType(setting);
    const newValue = newValues[setting.id];
    if (newValue !== undefined && oldValue !== newValue) {
      diff[setting.id] = newValue;
    }
  }
  return diff;
}
