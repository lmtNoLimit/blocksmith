/**
 * ProductListSetting Component
 * Renders multi-select resource picker for product_list type
 * Supports limit configuration (max 50, default 50)
 */

import type { SchemaSetting } from '../schema/SchemaTypes';
import { ResourceSelector, type SelectedResource } from '../ResourceSelector';

export interface ProductListSettingProps {
  setting: SchemaSetting;
  value: string; // JSON stringified array of IDs
  onChange: (id: string, value: string) => void;
  disabled?: boolean;
  selectedResources?: SelectedResource[];
  onResourcesSelect?: (settingId: string, resources: SelectedResource[]) => void;
  loading?: boolean;
}

export function ProductListSetting({
  setting,
  value,
  onChange,
  disabled,
  selectedResources = [],
  onResourcesSelect,
  loading
}: ProductListSettingProps) {
  const limit = setting.limit ?? 50;

  const handleSelectMultiple = (resources: SelectedResource[]) => {
    // Enforce limit
    const limitedResources = resources.slice(0, limit);

    // Update settings value with JSON array of IDs
    const ids = limitedResources.map(r => r.id);
    onChange(setting.id, JSON.stringify(ids));

    // Notify parent about full resource selection
    onResourcesSelect?.(setting.id, limitedResources);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500 }}>{setting.label}</span>
        <span style={{ fontSize: '12px', color: '#6d7175' }}>
          {selectedResources.length}/{limit} selected
        </span>
      </div>

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}

      <ResourceSelector
        resourceType="product"
        multiple={true}
        onSelect={() => {}} // Required but unused for multiple
        onSelectMultiple={handleSelectMultiple}
        selectedResources={selectedResources}
        disabled={disabled || selectedResources.length >= limit}
        loading={loading}
      />

      {selectedResources.length >= limit && (
        <span style={{ fontSize: '12px', color: '#d72c0d' }}>
          Maximum {limit} products reached
        </span>
      )}
    </div>
  );
}
