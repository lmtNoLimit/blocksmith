import { useState } from 'react';
import type { SchemaSetting, SettingsState, BlockInstance, SchemaDefinition } from '../schema/SchemaTypes';
import type { SelectedResource } from '../ResourceSelector';
import type { DeviceSize } from '../types';
import { SettingField } from './SettingField';
import { ImagePickerModal } from './ImagePickerModal';


export interface SettingsPanelProps {
  settings: SchemaSetting[];
  values: SettingsState;
  onChange: (values: SettingsState) => void;
  disabled?: boolean;
  schema?: SchemaDefinition | null;
  blocks?: BlockInstance[];
  onBlockSettingChange?: (blockIndex: number, settingId: string, value: string | number | boolean) => void;
  // Resource setting props
  resourceSettings?: Record<string, SelectedResource | null>;
  onResourceSelect?: (settingId: string, resourceId: string | null, resource: SelectedResource | null) => void;
  isLoadingResource?: boolean;
  // Multi-select resource props
  multiResourceSettings?: Record<string, SelectedResource[]>;
  onMultiResourceSelect?: (settingId: string, resources: SelectedResource[]) => void;
  // Preview controls (formerly in toolbar)
  deviceSize?: DeviceSize;
  onDeviceSizeChange?: (size: DeviceSize) => void;
  onRefresh?: () => void;
  isRendering?: boolean;

}

/**
 * Collapsible panel displaying schema settings form using Polaris Web Components
 */
export function SettingsPanel({
  settings,
  values,
  onChange,
  disabled,
  schema,
  blocks,
  onBlockSettingChange,
  resourceSettings,
  onResourceSelect,
  isLoadingResource,
  multiResourceSettings,
  onMultiResourceSelect,
  // Preview controls
  deviceSize = 'desktop',
  onDeviceSizeChange,
  onRefresh,
  isRendering
}: SettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  // Local multi-resource state if not provided externally
  const [localMultiResourceSettings, setLocalMultiResourceSettings] = useState<Record<string, SelectedResource[]>>({});

  // Use external state if provided, otherwise use local state
  const effectiveMultiResourceSettings = multiResourceSettings ?? localMultiResourceSettings;
  const handleMultiResourceSelect = onMultiResourceSelect ?? ((settingId: string, resources: SelectedResource[]) => {
    setLocalMultiResourceSettings(prev => ({
      ...prev,
      [settingId]: resources
    }));
  });



  // Preview controls toolbar (always shown)
  const previewControls = (
    <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e1e3e5', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Device size selector */}
        {onDeviceSizeChange && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <s-button
              variant={deviceSize === 'mobile' ? 'primary' : 'secondary'}
              onClick={() => onDeviceSizeChange('mobile')}
            >
              Mobile
            </s-button>
            <s-button
              variant={deviceSize === 'tablet' ? 'primary' : 'secondary'}
              onClick={() => onDeviceSizeChange('tablet')}
            >
              Tablet
            </s-button>
            <s-button
              variant={deviceSize === 'desktop' ? 'primary' : 'secondary'}
              onClick={() => onDeviceSizeChange('desktop')}
            >
              Desktop
            </s-button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

          {/* Refresh button */}
          {onRefresh && (
            <s-button
              variant="secondary"
              onClick={onRefresh}
              disabled={isRendering || undefined}
              loading={isRendering || undefined}
            >
              Refresh
            </s-button>
          )}
        </div>
      </div>
    </div>
  );

  if (settings.length === 0 && (!blocks || blocks.length === 0)) {
    return (
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e1e3e5',
        borderRadius: '8px',
        padding: '16px'
      }}>
        {previewControls}
        <span style={{ color: '#6d7175' }}>
          No customizable settings found in section schema.
        </span>
      </div>
    );
  }

  const toggleBlockExpanded = (blockId: string) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  const getBlockTitle = (block: BlockInstance, blockDef: { name?: string } | undefined) => {
    const settingsTitle = block.settings.heading || block.settings.title || block.settings.text;
    return String(settingsTitle || blockDef?.name || block.type);
  };

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
          case 'radio':
            defaults[setting.id] = setting.options?.[0]?.value ?? '';
            break;
          case 'font_picker':
            defaults[setting.id] = 'system-ui';
            break;
          case 'text_alignment':
            defaults[setting.id] = 'left';
            break;
          case 'collection_list':
          case 'product_list':
            defaults[setting.id] = '[]';
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
      {/* Preview controls */}
      {previewControls}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Settings header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>
            Settings ({settings.length})
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <s-button
              variant="secondary"
              onClick={handleResetDefaults}
              disabled={disabled || undefined}
            >
              Reset
            </s-button>
            <s-button
              variant="secondary"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </s-button>
          </div>
        </div>

        {/* Settings form */}
        {isExpanded && settings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {settings.map((setting) => (
              <SettingField
                key={setting.id}
                setting={setting}
                value={values[setting.id]}
                onChange={handleFieldChange}
                disabled={disabled}
                resourceSettings={resourceSettings}
                onResourceSelect={onResourceSelect}
                isLoadingResource={isLoadingResource}
                multiResourceSettings={effectiveMultiResourceSettings}
                onMultiResourceSelect={handleMultiResourceSelect}
              />
            ))}
          </div>
        )}

        {/* Block Settings */}
        {isExpanded && blocks && blocks.length > 0 && (
          <div style={{ marginTop: settings.length > 0 ? '16px' : 0 }}>
            {settings.length > 0 && (
              <div style={{ borderTop: '1px solid #e1e3e5', paddingTop: '16px' }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                Blocks ({blocks.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {blocks.map((block, blockIndex) => {
                  const blockDef = schema?.blocks?.find(b => b.type === block.type);
                  const blockSettings = blockDef?.settings || [];

                  if (blockSettings.length === 0) return null;

                  const isBlockExpanded = expandedBlocks[block.id] ?? false;
                  const blockTitle = getBlockTitle(block, blockDef);

                  return (
                    <div
                      key={block.id}
                      style={{
                        backgroundColor: '#f6f6f7',
                        border: '1px solid #e1e3e5',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Block Header */}
                      <button
                        onClick={() => toggleBlockExpanded(block.id)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#202223' }}>
                          {blockTitle} #{blockIndex + 1}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#6d7175',
                          transform: isBlockExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}>
                          ▼
                        </span>
                      </button>

                      {/* Block Settings */}
                      {isBlockExpanded && (
                        <div style={{
                          padding: '12px',
                          borderTop: '1px solid #e1e3e5',
                          backgroundColor: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          {blockSettings.map((setting) => (
                            <SettingField
                              key={`${block.id}-${setting.id}`}
                              setting={setting}
                              value={block.settings[setting.id] ?? ''}
                              onChange={(_id, value) => {
                                onBlockSettingChange?.(blockIndex, setting.id, value);
                              }}
                              disabled={disabled}
                              multiResourceSettings={effectiveMultiResourceSettings}
                              onMultiResourceSelect={handleMultiResourceSelect}
                              blockId={block.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Picker Modal - rendered once at SettingsPanel level */}
      <ImagePickerModal />
    </div>
  );
}
