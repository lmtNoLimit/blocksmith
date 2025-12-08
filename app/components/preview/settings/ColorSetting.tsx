import type { SchemaSetting } from '../schema/SchemaTypes';

export interface ColorSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * ColorSetting - Renders color picker using Polaris Web Components
 * Includes both color picker and text input for hex value
 */
export function ColorSetting({ setting, value, onChange, disabled }: ColorSettingProps) {
  // Use native Event type for Polaris Web Components
  const handleColorChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  const handleTextChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <s-color-field
          value={value || ''}
          placeholder="#000000"
          disabled={disabled || undefined}
          label={setting.label}
          onChange={handleColorChange}
          onInput={handleTextChange}
        />
      </div>
      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}
    </div>
  );
}
