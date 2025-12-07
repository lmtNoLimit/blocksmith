import type { SchemaSetting } from '../schema/SchemaTypes';
import type { SelectedResource } from '../ResourceSelector';
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
}

/**
 * Routes setting to appropriate input component based on type
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
  onMultiResourceSelect
}: SettingFieldProps) {
  const handleChange = (newValue: string | number | boolean) => {
    onChange(setting.id, newValue);
  };

  switch (setting.type) {
    // Basic text inputs
    case 'text':
    case 'textarea':
    case 'richtext':
    case 'inline_richtext':
    case 'url':
    case 'html':
    case 'liquid':
      return (
        <TextSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Number inputs
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

    // Select dropdown (auto-converts to segmented for ≤5 options)
    case 'select':
      return (
        <SelectSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Radio button group
    case 'radio':
      return (
        <RadioSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Checkbox
    case 'checkbox':
      return (
        <CheckboxSetting
          setting={setting}
          value={Boolean(value)}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Color pickers
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

    // Image picker
    case 'image_picker':
      return (
        <ImageSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Video settings
    case 'video':
      return (
        <VideoSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'video_url':
      return (
        <VideoUrlSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Font picker
    case 'font_picker':
      return (
        <FontPickerSetting
          setting={setting}
          value={String(value || 'system-ui')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Text alignment
    case 'text_alignment':
      return (
        <TextAlignmentSetting
          setting={setting}
          value={String(value || 'left')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Single resource pickers
    case 'product':
      return (
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

    case 'collection':
      return (
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

    // Handle-based resource pickers (no App Bridge support)
    case 'article':
      return (
        <ArticleSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'blog':
      return (
        <BlogSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'page':
      return (
        <PageSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'link_list':
      return (
        <LinkListSetting
          setting={setting}
          value={String(value || '')}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    // Multi-select resource pickers
    case 'collection_list':
      return (
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

    case 'product_list':
      return (
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
