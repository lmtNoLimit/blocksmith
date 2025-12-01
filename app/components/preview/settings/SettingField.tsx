import type { SchemaSetting } from '../schema/SchemaTypes';
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

/**
 * Routes setting to appropriate input component based on type
 */
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
