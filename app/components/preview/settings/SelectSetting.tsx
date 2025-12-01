import type { SchemaSetting } from '../schema/SchemaTypes';

export interface SelectSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectSetting({ setting, value, onChange, disabled }: SelectSettingProps) {
  const options = setting.options || [];

  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
        {setting.label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          fontSize: '14px',
          backgroundColor: '#fff'
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {setting.info && (
        <p style={{ color: '#6d7175', fontSize: '13px', margin: '4px 0 0' }}>
          {setting.info}
        </p>
      )}
    </div>
  );
}
