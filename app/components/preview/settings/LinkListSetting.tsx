/**
 * LinkListSetting Component
 * Renders input for schema settings with type: "link_list"
 * Common values: main-menu, footer, header
 */

import type { SchemaSetting } from '../schema/SchemaTypes';

export interface LinkListSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LinkListSetting({
  setting,
  value,
  onChange,
  disabled,
}: LinkListSettingProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      <s-text-field
        label="Menu handle"
        value={value}
        placeholder="main-menu"
        disabled={disabled || undefined}
        onInput={handleInput}
      />

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}

      <span style={{ fontSize: '12px', color: '#8c9196' }}>
        Common: main-menu, footer, header
      </span>
    </div>
  );
}
