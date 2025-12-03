import type { SchemaDefinition, SchemaSetting, SettingsState, SchemaBlock, BlockInstance } from './SchemaTypes';

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

  // Filter to only editable setting types (exclude headers/paragraphs)
  const supportedTypes = [
    'text', 'textarea', 'richtext', 'number', 'range',
    'checkbox', 'select', 'color', 'color_background',
    'image_picker', 'url', 'html'
  ];

  return schema.settings
    .filter(setting => supportedTypes.includes(setting.type) && setting.id)
    .map(resolveSettingLabels); // Resolve any translation keys
}

/**
 * Build initial state from schema defaults
 */
export function buildInitialState(settings: SchemaSetting[]): SettingsState {
  const state: SettingsState = {};

  for (const setting of settings) {
    if (setting.default !== undefined) {
      state[setting.id] = setting.default;
    } else {
      // Provide sensible defaults by type
      switch (setting.type) {
        case 'checkbox':
          state[setting.id] = false;
          break;
        case 'number':
        case 'range':
          state[setting.id] = setting.min ?? 0;
          break;
        case 'color':
        case 'color_background':
          state[setting.id] = '#000000';
          break;
        case 'select':
          state[setting.id] = setting.options?.[0]?.value ?? '';
          break;
        default:
          state[setting.id] = '';
      }
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
