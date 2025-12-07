/**
 * FontPickerSetting Component
 * Renders font selection for typography settings
 * Shopify provides system + Google fonts - we offer common web-safe fonts
 */

import type { SchemaSetting } from '../schema/SchemaTypes';

export interface FontPickerSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Common web-safe fonts that approximate Shopify's font picker
const FONT_OPTIONS = [
  { value: 'system-ui', label: 'System UI', stack: 'system-ui, sans-serif' },
  { value: 'arial', label: 'Arial', stack: 'Arial, sans-serif' },
  { value: 'helvetica', label: 'Helvetica', stack: 'Helvetica, Arial, sans-serif' },
  { value: 'georgia', label: 'Georgia', stack: 'Georgia, serif' },
  { value: 'times', label: 'Times New Roman', stack: '"Times New Roman", serif' },
  { value: 'courier', label: 'Courier New', stack: '"Courier New", monospace' },
  { value: 'verdana', label: 'Verdana', stack: 'Verdana, sans-serif' },
  { value: 'trebuchet', label: 'Trebuchet MS', stack: '"Trebuchet MS", sans-serif' },
  { value: 'tahoma', label: 'Tahoma', stack: 'Tahoma, sans-serif' },
  { value: 'palatino', label: 'Palatino', stack: '"Palatino Linotype", Palatino, serif' },
];

export function FontPickerSetting({ setting, value, onChange, disabled }: FontPickerSettingProps) {
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    onChange(target.value);
  };

  const selectedFont = FONT_OPTIONS.find(f => f.value === value) || FONT_OPTIONS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      <s-select
        label="Font family"
        value={value || 'system-ui'}
        disabled={disabled || undefined}
        onChange={handleChange}
      >
        {FONT_OPTIONS.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </s-select>

      {/* Font preview */}
      <div style={{
        padding: '12px',
        backgroundColor: '#f6f6f7',
        borderRadius: '4px',
        fontFamily: selectedFont.stack,
        fontSize: '16px'
      }}>
        The quick brown fox jumps over the lazy dog
      </div>

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}

      <span style={{ fontSize: '12px', color: '#8c9196' }}>
        In Shopify, this opens the full font picker with Google Fonts
      </span>
    </div>
  );
}
