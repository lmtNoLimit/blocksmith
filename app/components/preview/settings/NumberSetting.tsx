import type { SchemaSetting } from '../schema/SchemaTypes';

export interface NumberSettingProps {
  setting: SchemaSetting;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * NumberSetting - Renders number inputs using Polaris Web Components
 * Supports: number (input field), range (styled slider)
 */
export function NumberSetting({ setting, value, onChange, disabled }: NumberSettingProps) {
  const isRange = setting.type === 'range';

  // Use native Event type for Polaris Web Components
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(parseFloat(target.value) || 0);
  };

  if (isRange) {
    const minVal = setting.min ?? 0;
    const maxVal = setting.max ?? 100;
    const percentage = ((value - minVal) / (maxVal - minVal)) * 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{setting.label}</span>
          <span style={{
            backgroundColor: '#f6f6f7',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 500
          }}>
            {value}{setting.unit || ''}
          </span>
        </div>

        {/* Styled range container */}
        <div style={{ position: 'relative', padding: '8px 0' }}>
          <input
            type="range"
            min={minVal}
            max={maxVal}
            step={setting.step ?? 1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              background: `linear-gradient(to right, #000 0%, #000 ${percentage}%, #e1e3e5 ${percentage}%, #e1e3e5 100%)`,
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #000;
              cursor: pointer;
              border: 2px solid #fff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }
            input[type="range"]::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #000;
              cursor: pointer;
              border: 2px solid #fff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }
            input[type="range"]:disabled::-webkit-slider-thumb {
              cursor: not-allowed;
            }
            input[type="range"]:disabled::-moz-range-thumb {
              cursor: not-allowed;
            }
          `}</style>
        </div>

        {/* Min/Max labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6d7175' }}>
          <span>{minVal}{setting.unit || ''}</span>
          <span>{maxVal}{setting.unit || ''}</span>
        </div>

        {setting.info && (
          <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <s-number-field
        label={setting.label}
        value={String(value)}
        min={setting.min}
        max={setting.max}
        step={setting.step ?? 1}
        disabled={disabled || undefined}
        onInput={handleInput}
      />
      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}
    </div>
  );
}
