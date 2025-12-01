import { useState } from 'react';
import type { DeviceSize } from './types';

export interface PreviewToolbarProps {
  deviceSize: DeviceSize;
  onDeviceSizeChange: (size: DeviceSize) => void;
  onRefresh: () => void;
  isRendering?: boolean;
  selectedPreset?: string;
  onPresetChange?: (presetId: string) => void;
  presets?: Array<{ id: string; name: string }>;
  renderedHtml?: string;
}

/**
 * Preview toolbar with device selector, data preset picker, and refresh button
 */
export function PreviewToolbar({
  deviceSize,
  onDeviceSizeChange,
  onRefresh,
  isRendering,
  selectedPreset = '',
  onPresetChange,
  presets = [],
  renderedHtml
}: PreviewToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!renderedHtml) return;
    try {
      await navigator.clipboard.writeText(renderedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Group presets by category
  const productPresets = presets.filter(p => p.id.startsWith('product'));
  const collectionPresets = presets.filter(p => p.id.startsWith('collection'));
  const cartPresets = presets.filter(p => p.id.startsWith('cart'));

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      {/* Device size selector */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <s-button
          variant={deviceSize === 'mobile' ? 'primary' : 'tertiary'}
          onClick={() => onDeviceSizeChange('mobile')}
          aria-pressed={deviceSize === 'mobile' ? 'true' : 'false'}
          aria-label="Preview on mobile device"
        >
          Mobile
        </s-button>
        <s-button
          variant={deviceSize === 'tablet' ? 'primary' : 'tertiary'}
          onClick={() => onDeviceSizeChange('tablet')}
          aria-pressed={deviceSize === 'tablet' ? 'true' : 'false'}
          aria-label="Preview on tablet device"
        >
          Tablet
        </s-button>
        <s-button
          variant={deviceSize === 'desktop' ? 'primary' : 'tertiary'}
          onClick={() => onDeviceSizeChange('desktop')}
          aria-pressed={deviceSize === 'desktop' ? 'true' : 'false'}
          aria-label="Preview on desktop device"
        >
          Desktop
        </s-button>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Data preset selector */}
        {onPresetChange && presets.length > 0 && (
          <select
            value={selectedPreset}
            onChange={(e) => onPresetChange(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #c9cccf',
              fontSize: '13px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
            aria-label="Select preview data preset"
          >
            <option value="">Default Data</option>
            {productPresets.length > 0 && (
              <optgroup label="Product">
                {productPresets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
            {collectionPresets.length > 0 && (
              <optgroup label="Collection">
                {collectionPresets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
            {cartPresets.length > 0 && (
              <optgroup label="Cart">
                {cartPresets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        )}

        {/* Copy HTML button */}
        {renderedHtml && (
          <s-button
            variant="tertiary"
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy HTML'}
          </s-button>
        )}

        {/* Refresh button */}
        <s-button
          variant="tertiary"
          onClick={onRefresh}
          loading={isRendering || undefined}
        >
          Refresh
        </s-button>
      </div>
    </div>
  );
}
