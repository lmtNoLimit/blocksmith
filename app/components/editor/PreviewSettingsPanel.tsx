import { useState } from "react";
import type {
  SchemaSetting,
  SettingsState,
  BlockInstance,
  SchemaDefinition,
} from "../preview/schema/SchemaTypes";
import type { SelectedResource } from "../preview/ResourceSelector";
import { SettingField } from "../preview/settings/SettingField";
import { buildInitialState } from "../preview/schema/parseSchema";

export interface PreviewSettingsPanelProps {
  settings: SchemaSetting[];
  values: SettingsState;
  onChange: (values: SettingsState) => void;
  disabled?: boolean;
  schema?: SchemaDefinition | null;
  blocks?: BlockInstance[];
  onBlockSettingChange?: (
    blockIndex: number,
    settingId: string,
    value: string | number | boolean,
  ) => void;
  // Resource setting props
  resourceSettings?: Record<string, SelectedResource | null>;
  onResourceSelect?: (
    settingId: string,
    resourceId: string | null,
    resource: SelectedResource | null,
  ) => void;
  isLoadingResource?: boolean;
  // Multi-select resource props
  multiResourceSettings?: Record<string, SelectedResource[]>;
  onMultiResourceSelect?: (
    settingId: string,
    resources: SelectedResource[],
  ) => void;
}

/**
 * Preview settings panel for right sidebar
 * Displays schema-based settings form for customizing preview
 */
export function PreviewSettingsPanel({
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
}: PreviewSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(
    {},
  );

  // Local multi-resource state if not provided externally
  const [localMultiResourceSettings, setLocalMultiResourceSettings] = useState<
    Record<string, SelectedResource[]>
  >({});

  // Use external state if provided, otherwise use local state
  const effectiveMultiResourceSettings =
    multiResourceSettings ?? localMultiResourceSettings;
  const handleMultiResourceSelect =
    onMultiResourceSelect ??
    ((settingId: string, resources: SelectedResource[]) => {
      setLocalMultiResourceSettings((prev) => ({
        ...prev,
        [settingId]: resources,
      }));
    });

  if (settings.length === 0 && (!blocks || blocks.length === 0)) {
    return (
      <s-stack gap="base">
        <s-heading>Preview Settings</s-heading>
        <s-banner tone="info">
          <strong>Preview Mode</strong> – These settings are for testing only.
          To customize in production, use the Shopify Theme Editor.
        </s-banner>
        <s-text color="subdued">
          No customizable settings found in section schema.
        </s-text>
      </s-stack>
    );
  }

  const toggleBlockExpanded = (blockId: string) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  const getBlockTitle = (
    block: BlockInstance,
    blockDef: { name?: string } | undefined,
  ) => {
    const settingsTitle =
      block.settings.heading || block.settings.title || block.settings.text;
    return String(settingsTitle || blockDef?.name || block.type);
  };

  const handleFieldChange = (id: string, value: string | number | boolean) => {
    onChange({
      ...values,
      [id]: value,
    });
  };

  const handleResetDefaults = () => {
    onChange(buildInitialState(settings));
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <s-box padding="base">
        <s-stack gap="large">
          <s-heading>Preview Settings</s-heading>

          {/* Info Banner */}
          <s-banner tone="info">
            <strong>Preview Mode</strong> – These settings are for testing only.
            To customize in production, use the Shopify Theme Editor.
          </s-banner>

          {/* Settings header with actions */}
          <s-stack
            direction="inline"
            justifyContent="space-between"
            alignItems="center"
          >
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              Settings ({settings.length})
            </span>
            <s-stack direction="inline" gap="small">
              <s-button
                variant="tertiary"
                onClick={handleResetDefaults}
                disabled={disabled || undefined}
              >
                Reset
              </s-button>
              <s-button
                variant="tertiary"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Collapse" : "Expand"}
              </s-button>
            </s-stack>
          </s-stack>

          {/* Settings form */}
          {isExpanded && settings.length > 0 && (
            <s-stack gap="base">
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
            </s-stack>
          )}

          {/* Block Settings */}
          {isExpanded && blocks && blocks.length > 0 && (
            <s-stack gap="base">
              {settings.length > 0 && <s-divider />}
              <span style={{ fontWeight: 600, fontSize: "14px" }}>
                Blocks ({blocks.length})
              </span>
              <s-stack gap="small">
                {blocks.map((block, blockIndex) => {
                  const blockDef = schema?.blocks?.find(
                    (b) => b.type === block.type,
                  );
                  const blockSettings = blockDef?.settings || [];

                  if (blockSettings.length === 0) return null;

                  const isBlockExpanded = expandedBlocks[block.id] ?? false;
                  const blockTitle = getBlockTitle(block, blockDef);

                  return (
                    <div
                      key={block.id}
                      style={{
                        backgroundColor: "var(--p-color-bg-surface-secondary)",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      {/* Block Header */}
                      <button
                        onClick={() => toggleBlockExpanded(block.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: 0,
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "13px" }}>
                          {blockTitle} #{blockIndex + 1}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#6d7175",
                            transform: isBlockExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            transition: "transform 0.2s",
                          }}
                        >
                          ▼
                        </span>
                      </button>

                      {/* Block Settings */}
                      {isBlockExpanded && (
                        <div style={{ marginTop: "12px" }}>
                          <s-stack gap="small">
                            {blockSettings.map((setting) => (
                              <SettingField
                                key={`${block.id}-${setting.id}`}
                                setting={setting}
                                value={block.settings[setting.id] ?? ""}
                                onChange={(_id, value) => {
                                  onBlockSettingChange?.(
                                    blockIndex,
                                    setting.id,
                                    value,
                                  );
                                }}
                                disabled={disabled}
                                multiResourceSettings={
                                  effectiveMultiResourceSettings
                                }
                                onMultiResourceSelect={
                                  handleMultiResourceSelect
                                }
                                blockId={block.id}
                              />
                            ))}
                          </s-stack>
                        </div>
                      )}
                    </div>
                  );
                })}
              </s-stack>
            </s-stack>
          )}

        </s-stack>
      </s-box>
    </div>
  );
}
