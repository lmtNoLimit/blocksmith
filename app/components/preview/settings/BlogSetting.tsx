/**
 * BlogSetting Component
 * Renders input for schema settings with type: "blog"
 * App Bridge doesn't support blog picker - uses handle input
 */

import type { SchemaSetting } from '../schema/SchemaTypes';

export interface BlogSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function BlogSetting({
  setting,
  value,
  onChange,
  disabled,
}: BlogSettingProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      <s-text-field
        label="Blog handle"
        value={value}
        placeholder="news"
        disabled={disabled || undefined}
        onInput={handleInput}
      />

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}
    </div>
  );
}
