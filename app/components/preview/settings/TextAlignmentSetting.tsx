/**
 * TextAlignmentSetting Component
 * Renders alignment button group (left/center/right)
 * Uses segmented control pattern per Shopify design
 */

import type { SchemaSetting } from '../schema/SchemaTypes';

export interface TextAlignmentSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

export function TextAlignmentSetting({ setting, value, onChange, disabled }: TextAlignmentSettingProps) {
  const handleClick = (alignValue: string) => {
    if (!disabled) {
      onChange(alignValue);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      <div style={{
        display: 'flex',
        border: '1px solid #c9cccf',
        borderRadius: '4px',
        overflow: 'hidden',
        width: 'fit-content'
      }}>
        {ALIGNMENT_OPTIONS.map((option, index) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            disabled={disabled}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRight: index < ALIGNMENT_OPTIONS.length - 1 ? '1px solid #c9cccf' : 'none',
              backgroundColor: value === option.value ? '#000' : '#fff',
              color: value === option.value ? '#fff' : '#202223',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: disabled ? 0.5 : 1,
              transition: 'background-color 0.15s, color 0.15s'
            }}
            title={option.label}
          >
            {option.label}
          </button>
        ))}
      </div>

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}
    </div>
  );
}
