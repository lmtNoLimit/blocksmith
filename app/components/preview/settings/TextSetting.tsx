import type { SchemaSetting } from '../schema/SchemaTypes';

export interface TextSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * TextSetting - Renders text inputs using Polaris Web Components
 * Supports: text, textarea, richtext, url, html types
 */
export function TextSetting({ setting, value, onChange, disabled }: TextSettingProps) {
  const isMultiline = setting.type === 'textarea' || setting.type === 'richtext' || setting.type === 'html';

  // Use native Event type for Polaris Web Components
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    onChange(target.value);
  };

  if (isMultiline) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <s-text-area
          label={setting.label}
          value={value}
          placeholder={setting.placeholder}
          disabled={disabled || undefined}
          rows={4}
          onInput={handleInput}
        />
        {setting.info && (
          <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
        )}
      </div>
    );
  }

  if (setting.type === 'url') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <s-text-field
          label={setting.label}
          value={value}
          placeholder={setting.placeholder}
          disabled={disabled || undefined}
          onInput={handleInput}
        />
        {setting.info && (
          <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <s-text-field
        label={setting.label}
        value={value}
        placeholder={setting.placeholder}
        disabled={disabled || undefined}
        details={setting.info}
        onInput={handleInput}
      />
    </div>
  );
}
