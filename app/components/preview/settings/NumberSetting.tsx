import type { SchemaSetting } from '../schema/SchemaTypes';

export interface NumberSettingProps {
  setting: SchemaSetting;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function NumberSetting({ setting, value, onChange, disabled }: NumberSettingProps) {
  const isRange = setting.type === 'range';

  if (isRange) {
    return (
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          {setting.label}
        </label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <input
            type="range"
            min={setting.min ?? 0}
            max={setting.max ?? 100}
            step={setting.step ?? 1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ color: '#6d7175', fontSize: '13px' }}>
            {value}{setting.unit || ''}
          </span>
        </div>
        {setting.info && (
          <p style={{ color: '#6d7175', fontSize: '13px', margin: '4px 0 0' }}>
            {setting.info}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
        {setting.label}
      </label>
      <input
        type="number"
        value={value}
        placeholder={setting.placeholder}
        min={setting.min}
        max={setting.max}
        step={setting.step}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      />
      {setting.info && (
        <p style={{ color: '#6d7175', fontSize: '13px', margin: '4px 0 0' }}>
          {setting.info}
        </p>
      )}
    </div>
  );
}
