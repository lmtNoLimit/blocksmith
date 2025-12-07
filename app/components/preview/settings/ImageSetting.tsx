import { useState, useEffect } from 'react';
import type { SchemaSetting } from '../schema/SchemaTypes';

export interface ImageSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * ImageSetting - Renders image URL input using Polaris Web Components
 * Note: Full image picker not available in preview - uses URL input fallback
 */
export function ImageSetting({ setting, value, onChange, disabled }: ImageSettingProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when value changes
  useEffect(() => {
    setHasError(false);
  }, [value]);

  // Use native Event type for Polaris Web Components
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      {value ? (
        <div style={{
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          padding: '12px',
          backgroundColor: '#f6f6f7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            maxWidth: '120px',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <img
              src={value}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80px',
                borderRadius: '4px',
                display: hasError ? 'none' : 'block'
              }}
              onError={() => setHasError(true)}
              onLoad={() => setHasError(false)}
            />
          </div>

          {/* Error message when image fails to load */}
          {hasError && (
            <span style={{ fontSize: '12px', color: '#d72c0d' }}>
              Could not load image preview
            </span>
          )}

          <s-button
            variant="secondary"
            tone="critical"
            onClick={handleClear}
            disabled={disabled || undefined}
          >
            Remove
          </s-button>
        </div>
      ) : (
        <div style={{
          border: '2px dashed #c9cccf',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f6f6f7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: '#6d7175' }}>Enter image URL for preview</span>
        </div>
      )}

      <s-text-field
        label="Image URL"
        value={value}
        placeholder="https://example.com/image.jpg"
        disabled={disabled || undefined}
        onInput={handleInput}
      />

      <span style={{ fontSize: '13px', color: '#6d7175' }}>
        {setting.info || 'Enter an image URL for preview'}
      </span>
    </div>
  );
}
