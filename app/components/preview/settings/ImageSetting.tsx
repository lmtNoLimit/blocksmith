import { useState, useEffect } from 'react';
import type { SchemaSetting } from '../schema/SchemaTypes';
import { IMAGE_PICKER_MODAL_ID } from './ImagePickerModal';

export interface ImageSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Unique identifier for this specific setting instance (e.g., "block-123-image" for block settings) */
  uniqueId?: string;
}

/**
 * ImageSetting - Renders image picker button using Polaris Web Components
 * Uses commandFor/command pattern to open modal declaratively
 */
export function ImageSetting({ setting, value, onChange, disabled, uniqueId }: ImageSettingProps) {
  const [hasError, setHasError] = useState(false);

  // Use uniqueId if provided, otherwise fall back to setting.id
  // This is critical for block settings where multiple blocks may have the same setting.id
  const instanceId = uniqueId ?? setting.id;

  // Reset error state when value changes
  useEffect(() => {
    setHasError(false);
  }, [value]);

  // Dispatch event to tell modal which setting opened it
  const handleOpenClick = () => {
    window.dispatchEvent(new CustomEvent('image-picker-open', {
      detail: { settingId: instanceId }
    }));
  };

  // Listen for image selection events
  useEffect(() => {
    const handleImageSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ settingId: string; imageUrl: string }>;
      // Only respond if this specific instance is targeted
      if (customEvent.detail.settingId === instanceId) {
        onChange(customEvent.detail.imageUrl);
      }
    };

    window.addEventListener('image-picker-select', handleImageSelected);
    return () => {
      window.removeEventListener('image-picker-select', handleImageSelected);
    };
  }, [instanceId, onChange]);

  const handleClear = () => {
    onChange('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      {/* Image Preview (when value exists) */}
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

          <div style={{ display: 'flex', gap: '8px' }}>
            <s-button
              variant="secondary"
              commandFor={IMAGE_PICKER_MODAL_ID}
              command="--show"
              onClick={handleOpenClick}
              disabled={disabled || undefined}
            >
              Change
            </s-button>
            <s-button
              variant="tertiary"
              tone="critical"
              onClick={handleClear}
              disabled={disabled || undefined}
            >
              Remove
            </s-button>
          </div>
        </div>
      ) : (
        /* Empty State with Select Button */
        <div style={{
          border: '2px dashed #c9cccf',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f6f6f7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <s-button
            variant="secondary"
            commandFor={IMAGE_PICKER_MODAL_ID}
            command="--show"
            onClick={handleOpenClick}
            disabled={disabled || undefined}
          >
            Select
          </s-button>
        </div>
      )}

      {/* Helper text */}
      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>
          {setting.info}
        </span>
      )}
    </div>
  );
}
