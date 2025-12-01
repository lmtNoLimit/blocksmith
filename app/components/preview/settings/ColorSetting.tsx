import type { SchemaSetting } from '../schema/SchemaTypes';

export interface ColorSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ColorSetting({ setting, value, onChange, disabled }: ColorSettingProps) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
        {setting.label}
      </label>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <input
          type="color"
          value={value || '#000000'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '48px',
            height: '36px',
            border: '1px solid #c9cccf',
            borderRadius: '4px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '2px'
          }}
        />
        <input
          type="text"
          value={value || ''}
          placeholder="#000000"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #c9cccf',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
      {setting.info && (
        <p style={{ color: '#6d7175', fontSize: '13px', margin: '4px 0 0' }}>
          {setting.info}
        </p>
      )}
    </div>
  );
}
