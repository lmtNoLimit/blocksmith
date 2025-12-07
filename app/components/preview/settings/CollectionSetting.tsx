/**
 * CollectionSetting Component
 * Renders resource picker for schema settings with type: "collection"
 * Uses Polaris Web Components for styling
 */

import type { SchemaSetting } from '../schema/SchemaTypes';
import { ResourceSelector, type SelectedResource } from '../ResourceSelector';

export interface CollectionSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (id: string, value: string) => void;
  disabled?: boolean;
  selectedResource?: SelectedResource | null;
  onResourceSelect?: (settingId: string, resourceId: string | null, resource: SelectedResource | null) => void;
  loading?: boolean;
}

/**
 * CollectionSetting - Renders App Bridge resource picker for collection type settings
 * Integrates with SettingsPanel to store resource ID in settingsValues
 */
export function CollectionSetting({
  setting,
  value,
  onChange,
  disabled,
  selectedResource,
  onResourceSelect,
  loading
}: CollectionSettingProps) {
  const handleSelect = (resourceId: string | null, resource: SelectedResource | null) => {
    // Update settings value with resource ID (for context building)
    onChange(setting.id, resourceId || '');
    // Notify parent about full resource selection (for state management)
    onResourceSelect?.(setting.id, resourceId, resource);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}

      <ResourceSelector
        resourceType="collection"
        onSelect={handleSelect}
        selectedResource={selectedResource}
        disabled={disabled}
        loading={loading}
      />
    </div>
  );
}
