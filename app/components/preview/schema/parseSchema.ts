import type { SchemaDefinition, SchemaSetting, SettingsState } from './SchemaTypes';

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

  return schema.settings.filter(
    setting => supportedTypes.includes(setting.type) && setting.id
  );
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
