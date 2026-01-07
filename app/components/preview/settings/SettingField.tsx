import type { SchemaSetting, SettingType } from '../schema/SchemaTypes';
import type { SelectedResource } from '../ResourceSelector';
import { isResourceType, isPresentationalType } from '../schema/parseSchema';
import { TextSetting } from './TextSetting';
import { NumberSetting } from './NumberSetting';
import { SelectSetting } from './SelectSetting';
import { CheckboxSetting } from './CheckboxSetting';
import { ColorSetting } from './ColorSetting';
import { ImageSetting } from './ImageSetting';
import { ProductSetting } from './ProductSetting';
import { CollectionSetting } from './CollectionSetting';
// Phase 01: Resource Pickers
import { ArticleSetting } from './ArticleSetting';
import { BlogSetting } from './BlogSetting';
import { PageSetting } from './PageSetting';
import { LinkListSetting } from './LinkListSetting';
// Phase 02: Media Settings
import { VideoUrlSetting } from './VideoUrlSetting';
import { VideoSetting } from './VideoSetting';
// Phase 03: Design Settings
import { FontPickerSetting } from './FontPickerSetting';
import { TextAlignmentSetting } from './TextAlignmentSetting';
import { RadioSetting } from './RadioSetting';
// Phase 04: Multi-Select Resources
import { CollectionListSetting } from './CollectionListSetting';
import { ProductListSetting } from './ProductListSetting';

/**
 * Info banner for settings that don't support schema defaults
 */
function ResourceSettingInfo() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '6px',
      marginTop: '6px',
      padding: '8px',
      backgroundColor: '#f6f6f7',
      borderRadius: '4px'
    }}>
      <span style={{ color: '#637381', fontSize: '14px' }}>ℹ</span>
      <span style={{ fontSize: '12px', color: '#637381', lineHeight: '1.4' }}>
        Resource settings don't support defaults. Values set per-instance in Theme Customizer.
      </span>
    </div>
  );
}

/**
 * Info banner for non-presentational block settings (preview-only)
 */
function BlockPreviewOnlyInfo() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '6px',
      marginTop: '6px',
      padding: '8px',
      backgroundColor: '#fff8e6',
      borderRadius: '4px'
    }}>
      <span style={{ color: '#8a6116', fontSize: '14px' }}>⚡</span>
      <span style={{ fontSize: '12px', color: '#8a6116', lineHeight: '1.4' }}>
        Preview only. Set in Theme Customizer for production.
      </span>
    </div>
  );
}

export interface SettingFieldProps {
  setting: SchemaSetting;
  value: string | number | boolean;
  onChange: (id: string, value: string | number | boolean) => void;
  disabled?: boolean;
  // Resource setting props (for product/collection types)
  resourceSettings?: Record<string, SelectedResource | null>;
  onResourceSelect?: (settingId: string, resourceId: string | null, resource: SelectedResource | null) => void;
  isLoadingResource?: boolean;
  // Multi-select resource props (for collection_list/product_list types)
  multiResourceSettings?: Record<string, SelectedResource[]>;
  onMultiResourceSelect?: (settingId: string, resources: SelectedResource[]) => void;
  // Block context for unique identification
  blockId?: string;
}

/**
 * Routes setting to appropriate input component based on type
 * Wraps resource settings with info banner and visual distinction
 */
export function SettingField({
  setting,
  value,
  onChange,
  disabled,
  resourceSettings,
  onResourceSelect,
  isLoadingResource,
  multiResourceSettings,
  onMultiResourceSelect,
  blockId
}: SettingFieldProps) {
  const handleChange = (newValue: string | number | boolean) => {
    onChange(setting.id, newValue);
  };

  // Generate unique identifier for settings that need instance-specific identification
  // This is critical for image picker in blocks where multiple blocks may have the same setting.id
  const uniqueId = blockId ? `${blockId}-${setting.id}` : setting.id;

  // Detect setting type characteristics
  const isResource = isResourceType(setting.type);
  const isInBlock = Boolean(blockId);
  const isPresentational = isPresentationalType(setting.type);
  // Non-presentational block settings are preview-only (text, textarea, richtext, etc.)
  const isBlockPreviewOnly = isInBlock && !isPresentational && !isResource;

  // Render the field component based on type
  let fieldComponent: React.ReactNode;

  switch (setting.type) {
    // Basic text inputs
    case 'text':
    case 'textarea':
    case 'richtext':
    case 'inline_richtext':
    case 'url':
    case 'html':
    case 'liquid':
      fieldComponent = (
        <TextSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Number inputs
    case 'number':
    case 'range':
      fieldComponent = (
        <NumberSetting
          setting={setting}
          value={Number(value) || 0}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Select dropdown (auto-converts to segmented for ≤5 options)
    case 'select':
      fieldComponent = (
        <SelectSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Radio button group
    case 'radio':
      fieldComponent = (
        <RadioSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Checkbox
    case 'checkbox':
      fieldComponent = (
        <CheckboxSetting
          setting={setting}
          value={Boolean(value)}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Color pickers
    case 'color':
    case 'color_background':
      fieldComponent = (
        <ColorSetting
          setting={setting}
          value={String(value || '#000000')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Image picker
    case 'image_picker':
      fieldComponent = (
        <ImageSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
          uniqueId={uniqueId}
        />
      );
      break;

    // Video settings
    case 'video':
      fieldComponent = (
        <VideoSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    case 'video_url':
      fieldComponent = (
        <VideoUrlSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Font picker
    case 'font_picker':
      fieldComponent = (
        <FontPickerSetting
          setting={setting}
          value={String(value || 'system-ui')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Text alignment
    case 'text_alignment':
      fieldComponent = (
        <TextAlignmentSetting
          setting={setting}
          value={String(value || 'left')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Single resource pickers
    case 'product':
      fieldComponent = (
        <ProductSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
          selectedResource={resourceSettings?.[setting.id]}
          onResourceSelect={onResourceSelect}
          loading={isLoadingResource}
        />
      );
      break;

    case 'collection':
      fieldComponent = (
        <CollectionSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
          selectedResource={resourceSettings?.[setting.id]}
          onResourceSelect={onResourceSelect}
          loading={isLoadingResource}
        />
      );
      break;

    // Handle-based resource pickers (no App Bridge support)
    case 'article':
      fieldComponent = (
        <ArticleSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    case 'blog':
      fieldComponent = (
        <BlogSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    case 'page':
      fieldComponent = (
        <PageSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    case 'link_list':
      fieldComponent = (
        <LinkListSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
      break;

    // Multi-select resource pickers
    case 'collection_list':
      fieldComponent = (
        <CollectionListSetting
          setting={setting}
          value={String(value || '[]')}
          onChange={onChange}
          disabled={disabled}
          selectedResources={multiResourceSettings?.[setting.id] || []}
          onResourcesSelect={onMultiResourceSelect}
          loading={isLoadingResource}
        />
      );
      break;

    case 'product_list':
      fieldComponent = (
        <ProductListSetting
          setting={setting}
          value={String(value || '[]')}
          onChange={onChange}
          disabled={disabled}
          selectedResources={multiResourceSettings?.[setting.id] || []}
          onResourcesSelect={onMultiResourceSelect}
          loading={isLoadingResource}
        />
      );
      break;

    default:
      // Fallback to text input for unsupported types
      fieldComponent = (
        <TextSetting
          setting={{ ...setting, type: 'text' }}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );
  }

  // Wrap with visual distinction for resource settings (not in blocks - those are already styled)
  if (isResource && !isInBlock) {
    return (
      <div style={{
        borderLeft: '3px solid #e4e5e7',
        paddingLeft: '12px'
      }}>
        {fieldComponent}
        <ResourceSettingInfo />
      </div>
    );
  }

  // Show preview-only note for non-presentational block settings
  if (isBlockPreviewOnly) {
    return (
      <div>
        {fieldComponent}
        <BlockPreviewOnlyInfo />
      </div>
    );
  }

  return <>{fieldComponent}</>;
}
