import { useState } from 'react';
import type { SchemaSetting, SettingsState } from '../schema/SchemaTypes';
import { SettingField } from './SettingField';

export interface SettingsPanelProps {
  settings: SchemaSetting[];
  values: SettingsState;
  onChange: (values: SettingsState) => void;
  disabled?: boolean;
}

/**
 * Collapsible panel displaying schema settings form
 */
export function SettingsPanel({
  settings,
  values,
  onChange,
  disabled
}: SettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (settings.length === 0) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f6f6f7',
        borderRadius: '8px'
      }}>
        <p style={{ color: '#6d7175', fontSize: '14px', margin: 0 }}>
          No customizable settings found in section schema.
        </p>
      </div>
    );
  }

  const handleFieldChange = (id: string, value: string | number | boolean) => {
    onChange({
      ...values,
      [id]: value
    });
  };

  const handleResetDefaults = () => {
    const defaults: SettingsState = {};
    for (const setting of settings) {
      if (setting.default !== undefined) {
        defaults[setting.id] = setting.default;
      } else {
        switch (setting.type) {
          case 'checkbox':
            defaults[setting.id] = false;
            break;
          case 'number':
          case 'range':
            defaults[setting.id] = setting.min ?? 0;
            break;
          case 'color':
          case 'color_background':
            defaults[setting.id] = '#000000';
            break;
          case 'select':
            defaults[setting.id] = setting.options?.[0]?.value ?? '';
            break;
          default:
            defaults[setting.id] = '';
        }
      }
    }
    onChange(defaults);
  };

  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e1e3e5',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
            Settings ({settings.length})
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleResetDefaults}
              disabled={disabled}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                opacity: disabled ? 0.5 : 1
              }}
            >
              Reset
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {settings.map((setting) => (
              <SettingField
                key={setting.id}
                setting={setting}
                value={values[setting.id]}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
