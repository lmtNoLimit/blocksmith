/**
 * Settings Transform Utility for App Proxy
 * Generates Liquid assign statements for section settings and blocks
 *
 * App Proxy Liquid lacks parse_json filter, so we use individual assigns:
 * - settings_title, settings_columns instead of section.settings.title
 * - block_0_type, block_0_title instead of block.type, block.settings.title
 */

import type { SettingsState, BlockInstance, SchemaDefinition } from '../components/preview/schema/SchemaTypes';

// Max settings payload size (4KB after encoding per plan requirements)
const MAX_SETTINGS_SIZE = 4096;

// Regex for valid Liquid variable names
const VALID_VAR_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Escape string value for Liquid capture blocks
 * Only escapes Liquid syntax to prevent injection, preserves quotes as-is
 */
function escapeLiquidCapture(value: string): string {
  // Escape Liquid delimiters to prevent code injection
  // Replace {{ with { { and {% with { % (space breaks Liquid parsing)
  return value
    .replace(/\{\{/g, '{ {')
    .replace(/\}\}/g, '} }')
    .replace(/\{%/g, '{ %')
    .replace(/%\}/g, '% }');
}

/**
 * Generate Liquid string assignment
 * Uses capture blocks for strings with quotes, simple assign for plain strings
 * Capture blocks don't require quote escaping - content is literal
 */
function generateStringAssign(varName: string, value: string): string {
  const hasSingleQuote = value.includes("'");
  const hasDoubleQuote = value.includes('"');

  // Simple case: no quotes - use single-quoted assign (fastest)
  if (!hasSingleQuote && !hasDoubleQuote) {
    return `{% assign ${varName} = '${value}' %}`;
  }

  // Has single quotes but no double quotes - use double-quoted assign
  if (hasSingleQuote && !hasDoubleQuote) {
    return `{% assign ${varName} = "${value}" %}`;
  }

  // Has double quotes but no single quotes - use single-quoted assign
  if (!hasSingleQuote && hasDoubleQuote) {
    return `{% assign ${varName} = '${value}' %}`;
  }

  // Has both quote types - use capture block (safest, handles any content)
  const escaped = escapeLiquidCapture(value);
  return `{% capture ${varName} %}${escaped}{% endcapture %}`;
}

/**
 * Sanitize setting key to valid Liquid variable name
 * Returns null if key cannot be made valid
 */
function sanitizeKey(key: string): string | null {
  // Key must start with letter or underscore (no numbers as first char)
  if (!/^[a-zA-Z_]/.test(key)) {
    return null;
  }
  // Replace non-alphanumeric (except underscore) with underscore
  return key.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Generate Liquid assign statements for section settings
 * Outputs: {% assign settings_title = 'value' %}
 *
 * @param settings - Key-value map of settings
 * @returns Array of Liquid assign statements
 */
export function generateSettingsAssigns(settings: SettingsState): string[] {
  const assigns: string[] = [];

  // Check payload size (rough estimate)
  const settingsJson = JSON.stringify(settings);
  if (settingsJson.length > MAX_SETTINGS_SIZE) {
    console.warn(`[settings-transform] Settings exceed ${MAX_SETTINGS_SIZE} bytes, may impact performance`);
  }

  for (const [key, value] of Object.entries(settings)) {
    const safeKey = sanitizeKey(key);

    // Skip keys that cannot be made valid
    if (!safeKey || !VALID_VAR_REGEX.test(safeKey)) continue;

    if (value === null || value === undefined) {
      assigns.push(`{% assign settings_${safeKey} = nil %}`);
    } else if (typeof value === 'string') {
      // Empty strings should be nil so Liquid conditionals work correctly
      // This is especially important for image_picker where empty = no image
      if (value === '') {
        assigns.push(`{% assign settings_${safeKey} = nil %}`);
      } else {
        assigns.push(generateStringAssign(`settings_${safeKey}`, value));
      }
    } else if (typeof value === 'number') {
      assigns.push(`{% assign settings_${safeKey} = ${value} %}`);
    } else if (typeof value === 'boolean') {
      assigns.push(`{% assign settings_${safeKey} = ${value} %}`);
    }
    // Skip arrays/objects - Liquid assigns don't support complex types
  }

  return assigns;
}

/**
 * Generate Liquid assign statements for blocks
 * Creates numbered block variables: block_0_type, block_0_title, etc.
 * Also creates blocks_count for iteration
 *
 * @param blocks - Array of block instances
 * @returns Array of Liquid assign statements
 */
export function generateBlocksAssigns(blocks: BlockInstance[]): string[] {
  if (blocks.length === 0) {
    return ['{% assign blocks_count = 0 %}'];
  }

  const assigns: string[] = [];

  blocks.forEach((block, index) => {
    const prefix = `block_${index}`;

    // Block metadata (IDs and types are typically safe alphanumeric strings)
    assigns.push(generateStringAssign(`${prefix}_id`, block.id));
    assigns.push(generateStringAssign(`${prefix}_type`, block.type));

    // Block settings
    if (block.settings) {
      for (const [key, value] of Object.entries(block.settings)) {
        const safeKey = sanitizeKey(key);
        if (!safeKey || !VALID_VAR_REGEX.test(safeKey)) continue;

        if (typeof value === 'string') {
          // Empty strings should be nil for proper Liquid conditionals
          if (value === '') {
            assigns.push(`{% assign ${prefix}_${safeKey} = nil %}`);
          } else {
            assigns.push(generateStringAssign(`${prefix}_${safeKey}`, value));
          }
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          assigns.push(`{% assign ${prefix}_${safeKey} = ${value} %}`);
        }
      }
    }
  });

  // Total count for iteration
  assigns.push(`{% assign blocks_count = ${blocks.length} %}`);

  return assigns;
}

// Resource picker setting types that return objects (not scalar values)
// These are injected as top-level variables by the wrapper, not as settings_X
const RESOURCE_PICKER_TYPES = ['product', 'collection', 'article', 'blog', 'page'];

// Legacy fallback: IDs that match type names exactly (for backward compat)
const RESOURCE_PICKER_IDS = ['product', 'collection', 'article', 'blog', 'page'];

/**
 * Build a map of setting IDs to their resource types from schema
 * This allows schema-aware transform that works with any setting ID
 *
 * @param schema - Parsed schema definition (optional)
 * @returns Map of settingId → resource type (e.g., 'selected_collection' → 'collection')
 */
function buildResourcePickerMap(schema?: SchemaDefinition | null): Map<string, string> {
  const map = new Map<string, string>();

  if (schema?.settings) {
    for (const setting of schema.settings) {
      if (RESOURCE_PICKER_TYPES.includes(setting.type)) {
        map.set(setting.id, setting.type);
      }
    }
  }

  // Also check block settings for resource pickers
  if (schema?.blocks) {
    for (const block of schema.blocks) {
      if (block.settings) {
        for (const setting of block.settings) {
          if (RESOURCE_PICKER_TYPES.includes(setting.type)) {
            // Block settings use block-prefixed variables, handled separately
            // But we still track them for reference
            map.set(`block_${setting.id}`, setting.type);
          }
        }
      }
    }
  }

  return map;
}

/**
 * Rewrite section.settings.X to settings_X for App Proxy compatibility
 * Now schema-aware: detects resource pickers by type, not hardcoded IDs
 *
 * Patterns transformed:
 * - {{ section.settings.title }} → {{ settings_title }}
 * - {% if section.settings.show %} → {% if settings_show %}
 * - {{ section.settings['title'] }} → {{ settings_title }}
 * - {{ section.settings["title"] }} → {{ settings_title }}
 *
 * EXCEPTION: Resource pickers (detected by type in schema)
 * These are injected as top-level objects, so:
 * - section.settings.selected_collection → collection (if type: "collection")
 * - section.settings.featured_product → product (if type: "product")
 *
 * @param code - Liquid template code
 * @param schema - Optional parsed schema for type-aware detection
 * @returns Transformed code
 */
export function rewriteSectionSettings(code: string, schema?: SchemaDefinition | null): string {
  // Build schema-aware resource picker map
  const resourcePickerMap = buildResourcePickerMap(schema);

  // Handle dot notation: section.settings.property_name
  let result = code.replace(
    /section\.settings\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
    (match, settingId) => {
      // First, check schema-based detection (preferred)
      if (resourcePickerMap.has(settingId)) {
        return resourcePickerMap.get(settingId)!; // Return type name: 'collection', 'product', etc.
      }
      // Fallback: legacy ID-based detection for backward compatibility
      if (RESOURCE_PICKER_IDS.includes(settingId)) {
        return settingId; // product, collection, etc.
      }
      return `settings_${settingId}`;
    }
  );

  // Handle bracket notation: section.settings['property'] or section.settings["property"]
  result = result.replace(
    /section\.settings\[['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\]/g,
    (match, settingId) => {
      if (resourcePickerMap.has(settingId)) {
        return resourcePickerMap.get(settingId)!;
      }
      if (RESOURCE_PICKER_IDS.includes(settingId)) {
        return settingId;
      }
      return `settings_${settingId}`;
    }
  );

  // Strip image_url/img_url filters from settings variables
  // Our image picker stores raw CDN URLs, but Shopify's image_url filter
  // expects image objects (MediaImage). This causes "invalid url input" errors.
  // Solution: Remove the filter since settings values are already URLs.
  result = stripImageUrlFilters(result);

  return result;
}

/**
 * Transform image filters for settings variables.
 * Our app stores raw CDN URLs from image picker, but Shopify's native
 * image_url filter expects MediaImage objects, not URL strings.
 *
 * Two transformation modes:
 * 1. When image_tag is present: Generate <img> tag with the URL
 *    {{ settings_X | image_url | image_tag }} → <img src="{{ settings_X }}" alt="" loading="lazy">
 *
 * 2. When only image_url/img_url (used in CSS): Just output the URL
 *    {{ settings_X | image_url: width: 1920 }} → {{ settings_X }}
 */
export function stripImageUrlFilters(code: string): string {
  // First pass: Handle chains with image_tag - convert to <img> element
  // Match: {{ var | image_url... | image_tag... }}
  // Output: <img src="{{ var }}" alt="" loading="lazy">
  const imageTagChainRegex = /\{\{\s*(settings_[a-zA-Z0-9_]+|block_\d+_[a-zA-Z0-9_]+)\s*\|\s*(?:image_url|img_url)(?:\s*:\s*[^|}]+)?\s*\|\s*image_tag(?:\s*:\s*[^|}]+)?\s*\}\}/g;

  let result = code.replace(imageTagChainRegex, '<img src="{{ $1 }}" alt="" loading="lazy">');

  // Second pass: Handle chains without image_tag (used in CSS background-image, etc.)
  // Match: {{ var | image_url... }} (no image_tag)
  // Output: {{ var }}
  const imageUrlOnlyRegex = /(settings_[a-zA-Z0-9_]+|block_\d+_[a-zA-Z0-9_]+)\s*\|\s*(?:image_url|img_url)(?:\s*:\s*[^|}]+)?(?!\s*\|\s*image_tag)/g;

  result = result.replace(imageUrlOnlyRegex, '$1');

  return result;
}

// Re-export block iteration from separate module for backwards compatibility
export { rewriteBlocksIteration } from './blocks-iteration.server';
