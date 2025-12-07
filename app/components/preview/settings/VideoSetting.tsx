/**
 * VideoSetting Component
 * Renders input for Shopify-hosted video (file_reference metafield)
 * In preview mode, accepts URL input for demonstration
 */

import type { SchemaSetting } from '../schema/SchemaTypes';

export interface VideoSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VideoSetting({ setting, value, onChange, disabled }: VideoSettingProps) {
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
          gap: '8px'
        }}>
          {/* Video preview */}
          <video
            src={value}
            style={{
              maxWidth: '100%',
              maxHeight: '120px',
              borderRadius: '4px'
            }}
            controls
            muted
            onError={(e) => {
              (e.target as HTMLVideoElement).style.display = 'none';
            }}
          />
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
          <span style={{ color: '#6d7175' }}>Enter video URL for preview</span>
        </div>
      )}

      <s-text-field
        label="Video URL"
        value={value}
        placeholder="https://cdn.shopify.com/videos/..."
        disabled={disabled || undefined}
        onInput={handleInput}
      />

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}

      <span style={{ fontSize: '12px', color: '#8c9196' }}>
        In Shopify, this uses the video upload picker. Enter URL for preview.
      </span>
    </div>
  );
}
