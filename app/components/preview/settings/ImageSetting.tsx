import type { SchemaSetting } from '../schema/SchemaTypes';

export interface ImageSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ImageSetting({ setting, value, onChange, disabled }: ImageSettingProps) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
        {setting.label}
      </label>
      <input
        type="text"
        value={value}
        placeholder="https://example.com/image.jpg"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #c9cccf',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      />
      <p style={{ color: '#6d7175', fontSize: '13px', margin: '4px 0 0' }}>
        {setting.info || 'Enter an image URL for preview'}
      </p>
      {value && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f6f6f7',
          borderRadius: '8px',
          maxWidth: '120px'
        }}>
          <img
            src={value}
            alt="Preview"
            style={{
              maxWidth: '100%',
              borderRadius: '4px',
              display: 'block'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}
