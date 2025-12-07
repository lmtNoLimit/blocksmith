/**
 * PageSetting Component
 * Renders input for schema settings with type: "page"
 * Uses handle-based input (App Bridge doesn't support page picker)
 */

import type { SchemaSetting } from '../schema/SchemaTypes';

export interface PageSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PageSetting({
  setting,
  value,
  onChange,
  disabled,
}: PageSettingProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      <s-text-field
        label="Page handle"
        value={value}
        placeholder="contact-us"
        disabled={disabled || undefined}
        onInput={handleInput}
      />

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}
    </div>
  );
}
