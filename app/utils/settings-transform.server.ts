/**
 * Settings Transform Utility for App Proxy
 * Generates Liquid assign statements for section settings and blocks
 *
 * App Proxy Liquid lacks parse_json filter, so we use individual assigns:
 * - settings_title, settings_columns instead of section.settings.title
 * - block_0_type, block_0_title instead of block.type, block.settings.title
 */

import type { SettingsState, BlockInstance } from '../components/preview/schema/SchemaTypes';

// Max settings payload size (4KB after encoding per plan requirements)
const MAX_SETTINGS_SIZE = 4096;

// Regex for valid Liquid variable names
const VALID_VAR_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Escape string value for Liquid assign statement
 * Handles quotes, backslashes, and newlines
 */
function escapeLiquidString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
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
      const escaped = escapeLiquidString(value);
      assigns.push(`{% assign settings_${safeKey} = '${escaped}' %}`);
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

    // Block metadata
    assigns.push(`{% assign ${prefix}_id = '${escapeLiquidString(block.id)}' %}`);
    assigns.push(`{% assign ${prefix}_type = '${escapeLiquidString(block.type)}' %}`);

    // Block settings
    if (block.settings) {
      for (const [key, value] of Object.entries(block.settings)) {
        const safeKey = sanitizeKey(key);
        if (!safeKey || !VALID_VAR_REGEX.test(safeKey)) continue;

        if (typeof value === 'string') {
          const escaped = escapeLiquidString(value);
          assigns.push(`{% assign ${prefix}_${safeKey} = '${escaped}' %}`);
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

/**
 * Rewrite section.settings.X to settings_X for App Proxy compatibility
 * WARNING: Heuristic - may break valid Liquid in edge cases
 *
 * Patterns transformed:
 * - {{ section.settings.title }} → {{ settings_title }}
 * - {% if section.settings.show %} → {% if settings_show %}
 * - {{ section.settings['title'] }} → {{ settings_title }}
 * - {{ section.settings["title"] }} → {{ settings_title }}
 *
 * @param code - Liquid template code
 * @returns Transformed code
 */
export function rewriteSectionSettings(code: string): string {
  // Handle dot notation: section.settings.property_name
  let result = code.replace(
    /section\.settings\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
    'settings_$1'
  );

  // Handle bracket notation: section.settings['property'] or section.settings["property"]
  result = result.replace(
    /section\.settings\[['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\]/g,
    'settings_$1'
  );

  return result;
}

// Re-export block iteration from separate module for backwards compatibility
export { rewriteBlocksIteration } from './blocks-iteration.server';
