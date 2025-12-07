/**
 * RadioSetting Component
 * Renders radio button group for small option sets
 * Alternative to select dropdown (per Shopify docs: use when ≤5 options)
 */

import type { SchemaSetting } from '../schema/SchemaTypes';

export interface RadioSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RadioSetting({ setting, value, onChange, disabled }: RadioSettingProps) {
  const options = setting.options || [];

  const handleChange = (optionValue: string) => {
    if (!disabled) {
      onChange(optionValue);
    }
  };

  // Generate unique name for radio group
  const groupName = `radio-${setting.id}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px 0'
      }}>
        {options.map((option) => (
          <label
            key={option.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={value === option.value}
              onChange={() => handleChange(option.value)}
              disabled={disabled}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#000',
              }}
            />
            <span style={{ fontSize: '14px', color: '#202223' }}>
              {option.label}
            </span>
          </label>
        ))}
      </div>

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}
    </div>
  );
}
