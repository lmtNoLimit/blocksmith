import type { SchemaSetting } from '../schema/SchemaTypes';

export interface CheckboxSettingProps {
  setting: SchemaSetting;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * CheckboxSetting - Renders boolean toggle using Polaris Web Components
 */
export function CheckboxSetting({ setting, value, onChange, disabled }: CheckboxSettingProps) {
  // Use native Event type for Polaris Web Components
  const handleChange = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    onChange(target.checked);
  };

  return (
    <s-checkbox
      label={setting.label}
      checked={value || undefined}
      disabled={disabled || undefined}
      details={setting.info}
      onChange={handleChange}
    />
  );
}
