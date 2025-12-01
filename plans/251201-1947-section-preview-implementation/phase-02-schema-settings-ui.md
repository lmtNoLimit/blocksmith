# Phase 02: Schema Settings UI

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Dependencies**: [Phase 01: Preview Infrastructure](./phase-01-preview-infrastructure.md) (must complete first)
- **Related Docs**: [code-standards.md](../../docs/code-standards.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-01 |
| Description | Parse Liquid schema, build dynamic settings form, sync changes to preview |
| Priority | P1 - High |
| Implementation Status | Not Started |
| Review Status | Not Started |

## Key Insights from Research

1. **Schema block** in Liquid sections defines customizable settings
2. **Setting types**: text, textarea, richtext, number, checkbox, select, color, image_picker, url, etc.
3. **Default values** in schema provide initial state
4. **Real-time sync**: Settings changes should update preview within 150ms
5. **Polaris components** map well to Shopify schema types

## Requirements

1. Parse {% schema %} block from generated Liquid code
2. Extract settings array with types, defaults, labels
3. Build dynamic form using Polaris components based on setting types
4. Sync form state with preview rendering (debounced)
5. Support common setting types: text, textarea, number, checkbox, select, color, range
6. Handle image_picker with placeholder/URL input
7. Display settings in collapsible panel beside preview

## Architecture

### Schema Parser Flow

```
Generated Liquid Code
        │
        ▼
┌───────────────────┐
│ parseSchema()     │
│ - Extract JSON    │
│ - Validate struct │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ SchemaDefinition  │
│ - name            │
│ - settings[]      │
│ - blocks[]        │
│ - presets[]       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ buildInitialState │
│ - Map defaults    │
│ - Type coercion   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ SettingsPanel     │
│ - Render form     │
│ - Handle changes  │
└───────────────────┘
```

### Component Structure

```
app/components/preview/
├── schema/
│   ├── parseSchema.ts        # Schema JSON parser
│   ├── SchemaTypes.ts        # Type definitions
│   └── settingTypeMap.ts     # Type → Component mapping
├── settings/
│   ├── SettingsPanel.tsx     # Main settings container
│   ├── SettingField.tsx      # Individual field renderer
│   ├── TextSetting.tsx       # Text/textarea input
│   ├── NumberSetting.tsx     # Number/range input
│   ├── SelectSetting.tsx     # Select dropdown
│   ├── CheckboxSetting.tsx   # Boolean toggle
│   ├── ColorSetting.tsx      # Color picker
│   └── ImageSetting.tsx      # Image URL input
└── ... (existing files)
```

### Setting Type Mapping

| Schema Type | Polaris Component | Notes |
|-------------|-------------------|-------|
| text | `<s-text-field>` | Single line |
| textarea | `<s-text-field multiline>` | Multi line |
| richtext | `<s-text-field multiline>` | Plain text fallback |
| number | `<s-text-field type="number">` | With min/max |
| range | `<input type="range">` | Custom styled |
| checkbox | `<s-checkbox>` | Boolean |
| select | `<s-select>` | Options from schema |
| color | `<input type="color">` | Native picker |
| color_background | `<input type="color">` | Same as color |
| image_picker | `<s-text-field>` | URL input + placeholder |
| url | `<s-text-field type="url">` | URL validation |

## Related Code Files

| File | Purpose | Status |
|------|---------|--------|
| `app/components/preview/SectionPreview.tsx` | Pass settings to panel | Modify |
| `app/components/preview/schema/` | Schema parsing utilities | Create |
| `app/components/preview/settings/` | Settings UI components | Create |

## Implementation Steps

### Step 1: Create Schema Types (`app/components/preview/schema/SchemaTypes.ts`)

```typescript
// Shopify section schema types
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
  | 'link_list';

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
  // Type-specific
  options?: SelectOption[]; // select
  min?: number; // number, range
  max?: number; // number, range
  step?: number; // number, range
  unit?: string; // number, range
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
```

### Step 2: Create Schema Parser (`app/components/preview/schema/parseSchema.ts`)

```typescript
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
 * Extract settings array from schema
 */
export function extractSettings(schema: SchemaDefinition | null): SchemaSetting[] {
  if (!schema?.settings) {
    return [];
  }

  // Filter to only supported setting types
  const supportedTypes = [
    'text', 'textarea', 'richtext', 'number', 'range',
    'checkbox', 'select', 'color', 'color_background',
    'image_picker', 'url'
  ];

  return schema.settings.filter(
    setting => supportedTypes.includes(setting.type)
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
```

### Step 3: Create Individual Setting Components

**`app/components/preview/settings/TextSetting.tsx`**

```typescript
import type { SchemaSetting } from '../schema/SchemaTypes';

export interface TextSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextSetting({ setting, value, onChange, disabled }: TextSettingProps) {
  const isMultiline = setting.type === 'textarea' || setting.type === 'richtext';

  return (
    <s-text-field
      label={setting.label}
      value={value}
      placeholder={setting.placeholder}
      helpText={setting.info}
      multiline={isMultiline ? '4' : undefined}
      disabled={disabled || undefined}
      onInput={(e: Event) => onChange((e.target as HTMLInputElement).value)}
    />
  );
}
```

**`app/components/preview/settings/NumberSetting.tsx`**

```typescript
import type { SchemaSetting } from '../schema/SchemaTypes';

export interface NumberSettingProps {
  setting: SchemaSetting;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function NumberSetting({ setting, value, onChange, disabled }: NumberSettingProps) {
  const isRange = setting.type === 'range';

  if (isRange) {
    return (
      <s-stack gap="tight" direction="block">
        <s-text variant="bodyMd">{setting.label}</s-text>
        <s-stack gap="base" direction="inline" alignItems="center">
          <input
            type="range"
            min={setting.min ?? 0}
            max={setting.max ?? 100}
            step={setting.step ?? 1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <s-text variant="bodySm" tone="subdued">
            {value}{setting.unit || ''}
          </s-text>
        </s-stack>
        {setting.info && <s-text variant="bodySm" tone="subdued">{setting.info}</s-text>}
      </s-stack>
    );
  }

  return (
    <s-text-field
      type="number"
      label={setting.label}
      value={String(value)}
      placeholder={setting.placeholder}
      helpText={setting.info}
      min={setting.min}
      max={setting.max}
      step={setting.step}
      suffix={setting.unit}
      disabled={disabled || undefined}
      onInput={(e: Event) => onChange(parseFloat((e.target as HTMLInputElement).value) || 0)}
    />
  );
}
```

**`app/components/preview/settings/SelectSetting.tsx`**

```typescript
import type { SchemaSetting } from '../schema/SchemaTypes';

export interface SelectSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectSetting({ setting, value, onChange, disabled }: SelectSettingProps) {
  const options = setting.options || [];

  return (
    <s-select
      label={setting.label}
      value={value}
      helpText={setting.info}
      disabled={disabled || undefined}
      onChange={(e: Event) => onChange((e.target as HTMLSelectElement).value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </s-select>
  );
}
```

**`app/components/preview/settings/CheckboxSetting.tsx`**

```typescript
import type { SchemaSetting } from '../schema/SchemaTypes';

export interface CheckboxSettingProps {
  setting: SchemaSetting;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function CheckboxSetting({ setting, value, onChange, disabled }: CheckboxSettingProps) {
  return (
    <s-checkbox
      checked={value || undefined}
      disabled={disabled || undefined}
      onChange={(e: Event) => onChange((e.target as HTMLInputElement).checked)}
    >
      {setting.label}
      {setting.info && (
        <s-text slot="helpText" variant="bodySm" tone="subdued">
          {setting.info}
        </s-text>
      )}
    </s-checkbox>
  );
}
```

**`app/components/preview/settings/ColorSetting.tsx`**

```typescript
import type { SchemaSetting } from '../schema/SchemaTypes';

export interface ColorSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ColorSetting({ setting, value, onChange, disabled }: ColorSettingProps) {
  return (
    <s-stack gap="tight" direction="block">
      <s-text variant="bodyMd">{setting.label}</s-text>
      <s-stack gap="base" direction="inline" alignItems="center">
        <input
          type="color"
          value={value || '#000000'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '48px',
            height: '36px',
            border: '1px solid #c9cccf',
            borderRadius: '4px',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        />
        <s-text-field
          value={value}
          placeholder="#000000"
          disabled={disabled || undefined}
          onInput={(e: Event) => onChange((e.target as HTMLInputElement).value)}
          style={{ flex: 1 }}
        />
      </s-stack>
      {setting.info && <s-text variant="bodySm" tone="subdued">{setting.info}</s-text>}
    </s-stack>
  );
}
```

**`app/components/preview/settings/ImageSetting.tsx`**

```typescript
import type { SchemaSetting } from '../schema/SchemaTypes';

export interface ImageSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ImageSetting({ setting, value, onChange, disabled }: ImageSettingProps) {
  return (
    <s-stack gap="tight" direction="block">
      <s-text-field
        label={setting.label}
        value={value}
        placeholder="https://example.com/image.jpg"
        helpText={setting.info || 'Enter an image URL for preview'}
        disabled={disabled || undefined}
        onInput={(e: Event) => onChange((e.target as HTMLInputElement).value)}
      />
      {value && (
        <s-box
          padding="base"
          background="subdued"
          borderRadius="base"
          style={{ maxWidth: '120px' }}
        >
          <img
            src={value}
            alt="Preview"
            style={{ maxWidth: '100%', borderRadius: '4px' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </s-box>
      )}
    </s-stack>
  );
}
```

### Step 4: Create SettingField Router (`app/components/preview/settings/SettingField.tsx`)

```typescript
import type { SchemaSetting, SettingsState } from '../schema/SchemaTypes';
import { TextSetting } from './TextSetting';
import { NumberSetting } from './NumberSetting';
import { SelectSetting } from './SelectSetting';
import { CheckboxSetting } from './CheckboxSetting';
import { ColorSetting } from './ColorSetting';
import { ImageSetting } from './ImageSetting';

export interface SettingFieldProps {
  setting: SchemaSetting;
  value: string | number | boolean;
  onChange: (id: string, value: string | number | boolean) => void;
  disabled?: boolean;
}

export function SettingField({ setting, value, onChange, disabled }: SettingFieldProps) {
  const handleChange = (newValue: string | number | boolean) => {
    onChange(setting.id, newValue);
  };

  switch (setting.type) {
    case 'text':
    case 'textarea':
    case 'richtext':
    case 'url':
    case 'html':
      return (
        <TextSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'number':
    case 'range':
      return (
        <NumberSetting
          setting={setting}
          value={Number(value) || 0}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'select':
      return (
        <SelectSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'checkbox':
      return (
        <CheckboxSetting
          setting={setting}
          value={Boolean(value)}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'color':
    case 'color_background':
      return (
        <ColorSetting
          setting={setting}
          value={String(value || '#000000')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'image_picker':
      return (
        <ImageSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    default:
      // Fallback to text input for unsupported types
      return (
        <TextSetting
          setting={{ ...setting, type: 'text' }}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
  }
}
```

### Step 5: Create SettingsPanel (`app/components/preview/settings/SettingsPanel.tsx`)

```typescript
import { useState } from 'react';
import type { SchemaSetting, SettingsState } from '../schema/SchemaTypes';
import { SettingField } from './SettingField';

export interface SettingsPanelProps {
  settings: SchemaSetting[];
  values: SettingsState;
  onChange: (values: SettingsState) => void;
  disabled?: boolean;
}

export function SettingsPanel({
  settings,
  values,
  onChange,
  disabled
}: SettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (settings.length === 0) {
    return (
      <s-box padding="base" background="subdued" borderRadius="base">
        <s-text variant="bodySm" tone="subdued">
          No customizable settings found in section schema.
        </s-text>
      </s-box>
    );
  }

  const handleFieldChange = (id: string, value: string | number | boolean) => {
    onChange({
      ...values,
      [id]: value
    });
  };

  return (
    <s-card>
      <s-section>
        <s-stack gap="tight" direction="block">
          <s-stack
            gap="base"
            direction="inline"
            justifyContent="space-between"
            alignItems="center"
          >
            <s-text variant="headingSm" as="h3">
              Section Settings ({settings.length})
            </s-text>
            <s-button
              variant="tertiary"
              size="slim"
              icon={isExpanded ? 'chevron-up' : 'chevron-down'}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </s-button>
          </s-stack>

          {isExpanded && (
            <s-stack gap="large" direction="block">
              {settings.map((setting) => (
                <SettingField
                  key={setting.id}
                  setting={setting}
                  value={values[setting.id]}
                  onChange={handleFieldChange}
                  disabled={disabled}
                />
              ))}
            </s-stack>
          )}
        </s-stack>
      </s-section>
    </s-card>
  );
}
```

### Step 6: Update SectionPreview to Include Settings

```typescript
// In SectionPreview.tsx - add schema parsing and settings panel

import { parseSchema, extractSettings, buildInitialState } from './schema/parseSchema';
import { SettingsPanel } from './settings/SettingsPanel';

// Inside component:
const [parsedSchema, setParsedSchema] = useState<SchemaDefinition | null>(null);
const [schemaSettings, setSchemaSettings] = useState<SchemaSetting[]>([]);
const [settingsValues, setSettingsValues] = useState<SettingsState>({});

// Parse schema when code changes
useEffect(() => {
  const schema = parseSchema(liquidCode);
  setParsedSchema(schema);

  const settings = extractSettings(schema);
  setSchemaSettings(settings);

  const initialState = buildInitialState(settings);
  setSettingsValues(initialState);
}, [liquidCode]);

// In render, add SettingsPanel:
<s-stack gap="large" direction="block">
  {schemaSettings.length > 0 && (
    <SettingsPanel
      settings={schemaSettings}
      values={settingsValues}
      onChange={setSettingsValues}
      disabled={isRendering}
    />
  )}

  <PreviewToolbar ... />
  <PreviewFrame ... />
</s-stack>
```

### Step 7: Create Settings Barrel Export (`app/components/preview/settings/index.ts`)

```typescript
export { SettingsPanel } from './SettingsPanel';
export { SettingField } from './SettingField';
export { TextSetting } from './TextSetting';
export { NumberSetting } from './NumberSetting';
export { SelectSetting } from './SelectSetting';
export { CheckboxSetting } from './CheckboxSetting';
export { ColorSetting } from './ColorSetting';
export { ImageSetting } from './ImageSetting';
```

## Todo List

- [ ] Create `app/components/preview/schema/SchemaTypes.ts`
- [ ] Create `app/components/preview/schema/parseSchema.ts`
- [ ] Create `app/components/preview/settings/TextSetting.tsx`
- [ ] Create `app/components/preview/settings/NumberSetting.tsx`
- [ ] Create `app/components/preview/settings/SelectSetting.tsx`
- [ ] Create `app/components/preview/settings/CheckboxSetting.tsx`
- [ ] Create `app/components/preview/settings/ColorSetting.tsx`
- [ ] Create `app/components/preview/settings/ImageSetting.tsx`
- [ ] Create `app/components/preview/settings/SettingField.tsx`
- [ ] Create `app/components/preview/settings/SettingsPanel.tsx`
- [ ] Create `app/components/preview/settings/index.ts`
- [ ] Update SectionPreview with schema parsing
- [ ] Test with various AI-generated section schemas
- [ ] Verify settings changes update preview in real-time
- [ ] Test edge cases (empty schema, invalid JSON, missing defaults)

## Success Criteria

1. Schema parsed correctly from generated Liquid
2. Settings form renders appropriate inputs by type
3. Changes to settings reflect in preview within 150ms
4. Default values load from schema
5. Collapsible settings panel works
6. Graceful handling of missing or invalid schema

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Invalid schema JSON | Medium | Low | Try-catch with fallback to empty settings |
| Unsupported setting types | Medium | Low | Fallback to text input |
| Too many settings (UI clutter) | Low | Medium | Collapsible panel, max height scroll |
| Performance with many settings | Low | Medium | Debounce onChange calls |

## Security Considerations

1. **JSON.parse safety**: Wrapped in try-catch, no eval
2. **User input**: Only affects local preview, never sent to server
3. **XSS in settings**: LiquidJS handles escaping in render
4. **No file uploads**: Image picker only accepts URLs

## Next Steps

After completing this phase:
1. Proceed to [Phase 03: Mock Data System](./phase-03-mock-data-system.md)
2. Enhance settings with validation messages
3. Consider adding "Reset to defaults" button
