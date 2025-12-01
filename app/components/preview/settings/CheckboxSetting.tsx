import type { SchemaSetting } from '../schema/SchemaTypes';

export interface CheckboxSettingProps {
  setting: SchemaSetting;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function CheckboxSetting({ setting, value, onChange, disabled }: CheckboxSettingProps) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: '18px', height: '18px' }}
        />
        <span>{setting.label}</span>
      </label>
      {setting.info && (
        <p style={{ color: '#6d7175', fontSize: '13px', margin: '4px 0 0 26px' }}>
          {setting.info}
        </p>
      )}
    </div>
  );
}
