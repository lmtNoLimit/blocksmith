import type { SchemaSetting } from '../schema/SchemaTypes';

export interface TextSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextSetting({ setting, value, onChange, disabled }: TextSettingProps) {
  const isMultiline = setting.type === 'textarea' || setting.type === 'richtext' || setting.type === 'html';

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #c9cccf',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit'
  };

  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
        {setting.label}
      </label>
      {isMultiline ? (
        <textarea
          value={value}
          placeholder={setting.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={setting.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      )}
      {setting.info && (
        <p style={{ color: '#6d7175', fontSize: '13px', margin: '4px 0 0' }}>
          {setting.info}
        </p>
      )}
    </div>
  );
}
