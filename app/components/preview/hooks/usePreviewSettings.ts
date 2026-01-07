import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { parseSchema, extractSettings, buildInitialState, buildBlockInstancesFromPreset } from '../schema/parseSchema';
import { useResourceFetcher } from './useResourceFetcher';
import type { SchemaSetting, SettingsState, BlockInstance, SchemaDefinition } from '../schema/SchemaTypes';
import type { SelectedResource } from '../ResourceSelector';
import type { MockProduct, MockCollection } from '../mockData/types';

/**
 * Options for usePreviewSettings hook
 */
export interface UsePreviewSettingsOptions {
  /** Callback when settings change (debounced) */
  onSettingsChange?: (settings: SettingsState, hasChanges: boolean) => void;
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number;
}

/**
 * Hook for managing preview settings state
 * Extracts schema from Liquid code and provides settings management
 * Supports bidirectional sync with optional callback
 */
export function usePreviewSettings(
  liquidCode: string,
  options: UsePreviewSettingsOptions = {}
) {
  const { onSettingsChange, debounceMs = 2000 } = options;
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

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  const initialStateRef = useRef<SettingsState>(buildInitialState(schemaSettings));

  // Refs for stable forceSync callback
  const settingsRef = useRef<SettingsState>(settingsValues);
  const isDirtyRef = useRef<boolean>(isDirty);

  // Keep refs in sync with state
  useEffect(() => {
    settingsRef.current = settingsValues;
    isDirtyRef.current = isDirty;
  }, [settingsValues, isDirty]);

  // Reset settings when schema changes
  useEffect(() => {
    const defaults = buildInitialState(schemaSettings);
    setSettingsValues(defaults);
    initialStateRef.current = defaults;
    setIsDirty(false);
  }, [schemaSettings]);

  // Initialize blocks from schema
  useEffect(() => {
    const blocks = buildBlockInstancesFromPreset(parsedSchema);
    setBlocksState(blocks);
  }, [parsedSchema]);

  // Debounced callback for auto-save
  const debouncedSync = useDebouncedCallback(
    (settings: SettingsState, hasChanges: boolean) => {
      onSettingsChange?.(settings, hasChanges);
    },
    debounceMs
  );

  // Cleanup debounced callback on unmount
  useEffect(() => {
    return () => {
      debouncedSync.cancel();
    };
  }, [debouncedSync]);

  // Settings change handler with dirty tracking and debounced sync
  const handleSettingsChange = useCallback((newValues: SettingsState) => {
    setSettingsValues(newValues);
    const hasChanges = JSON.stringify(newValues) !== JSON.stringify(initialStateRef.current);
    setIsDirty(hasChanges);
    debouncedSync(newValues, hasChanges);
  }, [debouncedSync]);

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

  // Reset to current schema defaults
  const resetToSchemaDefaults = useCallback(() => {
    const defaults = buildInitialState(schemaSettings);
    setSettingsValues(defaults);
    initialStateRef.current = defaults;
    setIsDirty(false);
    onSettingsChange?.(defaults, false); // Notify without dirty flag
  }, [schemaSettings, onSettingsChange]);

  // Force sync current state to parent (uses refs for stable callback)
  const forceSync = useCallback(() => {
    onSettingsChange?.(settingsRef.current, isDirtyRef.current);
  }, [onSettingsChange]);

  return {
    // Schema data
    parsedSchema,
    schemaSettings,
    // Settings state
    settingsValues,
    setSettingsValues: handleSettingsChange,
    isDirty,
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
    resetToSchemaDefaults,
    forceSync,
    // Errors
    fetchError,
  };
}
