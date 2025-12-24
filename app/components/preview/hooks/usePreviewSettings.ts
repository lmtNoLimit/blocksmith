import { useState, useCallback, useEffect, useMemo } from 'react';
import { parseSchema, extractSettings, buildInitialState, buildBlockInstancesFromPreset } from '../schema/parseSchema';
import { useResourceFetcher } from './useResourceFetcher';
import type { SchemaSetting, SettingsState, BlockInstance, SchemaDefinition } from '../schema/SchemaTypes';
import type { SelectedResource } from '../ResourceSelector';
import type { MockProduct, MockCollection } from '../mockData/types';

/**
 * Hook for managing preview settings state
 * Extracts schema from Liquid code and provides settings management
 */
export function usePreviewSettings(liquidCode: string) {
  const { fetchProduct, fetchCollection, error: fetchError } = useResourceFetcher();

  // Parse schema from liquid code
  const parsedSchema = useMemo<SchemaDefinition | null>(
    () => parseSchema(liquidCode),
    [liquidCode]
  );

  const schemaSettings = useMemo<SchemaSetting[]>(
    () => extractSettings(parsedSchema),
    [parsedSchema]
  );

  // Settings values state
  const [settingsValues, setSettingsValues] = useState<SettingsState>(() =>
    buildInitialState(schemaSettings)
  );

  // Block state management
  const [blocksState, setBlocksState] = useState<BlockInstance[]>([]);

  // Resource settings
  const [resourceSelections, setResourceSelections] = useState<Record<string, SelectedResource | null>>({});
  const [loadedResources, setLoadedResources] = useState<Record<string, MockProduct | MockCollection>>({});
  const [isLoadingResource, setIsLoadingResource] = useState(false);

  // Reset settings when schema changes
  useEffect(() => {
    setSettingsValues(buildInitialState(schemaSettings));
  }, [schemaSettings]);

  // Initialize blocks from schema
  useEffect(() => {
    const blocks = buildBlockInstancesFromPreset(parsedSchema);
    setBlocksState(blocks);
  }, [parsedSchema]);

  // Settings change handler
  const handleSettingsChange = useCallback((newValues: SettingsState) => {
    setSettingsValues(newValues);
  }, []);

  // Block setting change handler
  const handleBlockSettingChange = useCallback(
    (blockIndex: number, settingId: string, value: string | number | boolean) => {
      setBlocksState(prev => {
        const updated = [...prev];
        updated[blockIndex] = {
          ...updated[blockIndex],
          settings: {
            ...updated[blockIndex].settings,
            [settingId]: value
          }
        };
        return updated;
      });
    },
    []
  );

  // Resource selection handler
  const handleResourceSelect = useCallback(async (
    settingId: string,
    resourceId: string | null,
    resource: SelectedResource | null
  ) => {
    // Update selection UI state
    setResourceSelections(prev => ({
      ...prev,
      [settingId]: resource
    }));

    if (!resourceId) {
      // Clear the resource data
      setLoadedResources(prev => {
        const updated = { ...prev };
        delete updated[settingId];
        return updated;
      });
      return;
    }

    // Find the setting type to know what kind of resource to fetch
    const setting = schemaSettings.find(s => s.id === settingId);
    if (!setting) return;

    setIsLoadingResource(true);
    try {
      let data: MockProduct | MockCollection | null = null;

      if (setting.type === 'product') {
        data = await fetchProduct(resourceId);
      } else if (setting.type === 'collection') {
        data = await fetchCollection(resourceId);
      }

      if (data) {
        setLoadedResources(prev => ({
          ...prev,
          [settingId]: data
        }));
      }
    } finally {
      setIsLoadingResource(false);
    }
  }, [schemaSettings, fetchProduct, fetchCollection]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettingsValues(buildInitialState(schemaSettings));
  }, [schemaSettings]);

  return {
    // Schema data
    parsedSchema,
    schemaSettings,
    // Settings state
    settingsValues,
    setSettingsValues: handleSettingsChange,
    // Blocks state
    blocksState,
    setBlocksState,
    handleBlockSettingChange,
    // Resource state
    resourceSelections,
    loadedResources,
    handleResourceSelect,
    isLoadingResource,
    // Actions
    resetToDefaults,
    // Errors
    fetchError,
  };
}
