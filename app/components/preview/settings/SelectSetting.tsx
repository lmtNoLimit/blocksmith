import type { SchemaSetting } from '../schema/SchemaTypes';

export interface SelectSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * SelectSetting - Renders dropdown or segmented control based on options
 * Per Shopify: Use SegmentedControl for ≤5 ungrouped options, Dropdown otherwise
 */
export function SelectSetting({ setting, value, onChange, disabled }: SelectSettingProps) {
  const options = setting.options || [];

  // Check if any options have groups
  const hasGroups = options.some(opt => opt.group);

  // Use segmented control for ≤5 ungrouped options
  const useSegmented = options.length <= 5 && options.length > 1 && !hasGroups;

  if (useSegmented) {
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
          {options.map((opt, index) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => !disabled && onChange(opt.value)}
              disabled={disabled}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRight: index < options.length - 1 ? '1px solid #c9cccf' : 'none',
                backgroundColor: value === opt.value ? '#000' : '#fff',
                color: value === opt.value ? '#fff' : '#202223',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '13px',
                opacity: disabled ? 0.5 : 1,
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {setting.info && (
          <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
        )}
      </div>
    );
  }

  // Default: dropdown select
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    onChange(target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <s-select
        label={setting.label}
        value={value}
        disabled={disabled || undefined}
        onChange={handleChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </s-select>
      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}
    </div>
  );
}
