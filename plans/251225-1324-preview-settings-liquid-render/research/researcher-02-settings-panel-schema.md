# Settings Panel & Schema Architecture - Research Report

**Date**: 2025-12-25
**Focus**: How SettingsPanel manages state and how settings flow to Liquid rendering

## SettingsPanel Component Architecture

### Location
`app/components/preview/settings/SettingsPanel.tsx` (316 lines)
`app/components/editor/PreviewSettingsPanel.tsx` (235 lines - UI-only wrapper for right sidebar)

### State Management
- **Not managed by SettingsPanel** - it's a **controlled component**
- Receives `values: SettingsState` and `onChange: (values: SettingsState) => void` as props
- Parent component (`usePreviewSettings` hook) owns state, panel just renders
- Supports two separate setting groups:
  1. **Section-level settings** (top-level schema.settings)
  2. **Block settings** (per-block schema.blocks[].settings)

### Key Props
```typescript
interface SettingsPanelProps {
  settings: SchemaSetting[];           // Parsed from schema.settings
  values: SettingsState;                // Current values { [settingId]: value }
  onChange: (values: SettingsState) => void;  // Value change callback
  blocks?: BlockInstance[];             // Block instances with their settings
  onBlockSettingChange?: (blockIndex, settingId, value) => void;
}
```

### UI Elements
- **Collapsible sections** for settings & blocks with expand/collapse toggles
- **Reset button** calls `buildInitialState(settings)` to revert defaults
- **SettingField sub-components** for each input type (text, number, color, product, etc.)
- **Info banner** reminding users this is preview-only, production uses Theme Editor

### Local State (SettingsPanel-specific)
- `isExpanded` - collapse all settings
- `expandedBlocks` - which blocks expanded
- `localMultiResourceSettings` - fallback multi-resource state if not provided

---

## Schema Parsing (`parseSchema.ts`)

### Schema Extraction Functions

#### 1. `parseSchema(liquidCode: string): SchemaDefinition | null`
- Regex extracts `{% schema %}...{% endschema %}` block
- Parses JSON inside tags
- **Returns**: Complete schema object with settings, blocks, presets, defaults

#### 2. `extractSettings(schema: SchemaDefinition): SchemaSetting[]`
- Filters schema.settings by **supported types only** (31 types)
- **Filters out**: header, paragraph (display-only)
- **Includes**: text, number, checkbox, select, color, image_picker, product, product_list, etc.
- **Side effect**: Calls `resolveSettingLabels()` to convert translation keys (t:sections.x.y) to human-readable labels

#### 3. `buildInitialState(settings: SchemaSetting[]): SettingsState`
- Creates object `{ [settingId]: defaultValue }`
- **Type-specific defaults**:
  - `checkbox` → `false`
  - `color` → `#000000`
  - `number`/`range` → setting.min ?? 0
  - `select`/`radio` → first option value
  - `image_picker` → `'placeholder'`
  - `product_list`/`collection_list` → `'[]'` (empty JSON array)
  - Text fields → `''`
- Falls back to explicit `setting.default` if provided

#### 4. `buildBlockInstancesFromPreset(schema): BlockInstance[]`
- Creates block instances from schema.presets[0].blocks or schema.default.blocks
- Each block gets:
  - Unique ID: `block-${index}`
  - Type from preset
  - Settings initialized with `buildInitialState()` + preset overrides

---

## Current Settings State Flow

### 1. Schema Parsing (usePreviewSettings hook)
```typescript
const parsedSchema = useMemo(() => parseSchema(liquidCode), [liquidCode]);
const schemaSettings = useMemo(() => extractSettings(parsedSchema), [parsedSchema]);
```

### 2. State Initialization
```typescript
const [settingsValues, setSettingsValues] = useState<SettingsState>(() =>
  buildInitialState(schemaSettings)  // Initialize on first render
);
const [blocksState, setBlocksState] = useState<BlockInstance[]>([]);
```

### 3. Passed to Preview Components
In `app.sections.$id.tsx` (line 570-572):
```typescript
<SectionPreview
  settingsValues={previewSettings.settingsValues}
  blocksState={previewSettings.blocksState}
  loadedResources={previewSettings.loadedResources}
/>
```

### 4. Then to AppProxyPreviewFrame (via SectionPreview)
In `SectionPreview.tsx`:
```typescript
<AppProxyPreviewFrame
  liquidCode={liquidCode}
  settings={settingsValues}
  blocks={blocksState}
/>
```

### 5. Finally to Server-Side Renderer
In `AppProxyPreviewFrame.tsx` (line 66-73):
```typescript
const { html, isLoading } = useNativePreviewRenderer({
  liquidCode,
  settings,      // SettingsState object
  blocks,        // BlockInstance[] array
  shopDomain,
  debounceMs: 600
});
```

---

## Server-Side Rendering (`useNativePreviewRenderer`)

### How Settings Reach Liquid
In `useNativePreviewRenderer.ts` (line 73-96):
```typescript
const buildProxyBody = useCallback(() => {
  const body: Record<string, string> = {
    shopDomain,
    code: base64Encode(liquidCode),
    settings: base64Encode(JSON.stringify(settings)),  // ← SETTINGS ENCODED
    blocks: base64Encode(JSON.stringify(blocks)),      // ← BLOCKS ENCODED
  };
  return body;
}, [liquidCode, settings, blocks]);
```

**Flow**:
1. Settings state converted to JSON
2. Base64 encoded for transport
3. POST to `/api/preview/render` endpoint
4. Server decodes and passes to Liquid renderer
5. Server returns rendered HTML with settings applied

---

## Gap Analysis: What's Working vs Missing

### WORKING
✅ Settings state stored in `usePreviewSettings` hook
✅ Settings passed through component props to `SectionPreview`
✅ Settings reach `AppProxyPreviewFrame` component
✅ Settings encoded and sent to `/api/preview/render` endpoint
✅ Block instances with settings also flow through same pipeline

### POTENTIAL GAPS/CONCERNS
⚠️ **No confirmation settings actually reach Liquid server**
⚠️ **No validation server is using settings to populate `section.settings`**
⚠️ **No evidence of `settings` becoming `Liquid.settings` variable**
⚠️ **Block settings update handler exists** but unclear if blocks mutate correctly
⚠️ **No documented server-side decoding** of base64 settings
⚠️ **Multi-resource state** has local fallback - may not flow to server properly

---

## Key Integration Points

### SettingsPanel to usePreviewSettings
- SettingsPanel is **UI only**, state owned by parent hook
- `onChange` callback updates parent: `setSettingsValues(newValues)`
- Reset button calls `buildInitialState()` to reset to defaults

### usePreviewSettings to AppProxyPreviewFrame
- Hook provides: `settingsValues`, `blocksState`, `loadedResources`
- `handleBlockSettingChange` mutates block.settings[settingId]
- Settings changes trigger `debounced` re-render (600ms)

### AppProxyPreviewFrame to Server
- Encodes settings as base64 JSON
- Server endpoint `/api/preview/render` should:
  - Base64 decode settings
  - Pass to Liquid template context
  - Render with `{{ section.settings.xxx }}`

---

## Unresolved Questions

1. Does `/api/preview/render` endpoint actually decode and use `settings` parameter?
2. How are decoded settings made available to Liquid (as `section.settings`)?
3. Are block settings also available as `section.blocks[n].settings`?
4. Does resource picker data (products/collections) integrate with settings?
5. What happens if settings JSON is invalid base64?
6. Is there server-side validation of settings types?
