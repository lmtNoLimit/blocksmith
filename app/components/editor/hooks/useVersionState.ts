import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { UIMessage, CodeVersion } from '../../../types';

interface UseVersionStateOptions {
  messages: UIMessage[];
  initialCode: string;
  onCodeChange: (code: string) => void;
  isDirty?: boolean;
  onAutoApply?: () => void;
  onAutoSave?: (code: string) => void;
  initialVersionId?: string | null;
  onVersionChange?: (versionId: string | null) => void;
}

/**
 * Hook for managing version state derived from chat messages
 * Each message with codeSnapshot = version
 */
export function useVersionState({
  messages,
  initialCode,
  onCodeChange,
  isDirty = false,
  onAutoApply,
  onAutoSave,
  initialVersionId,
  onVersionChange,
}: UseVersionStateOptions) {
  // Derive versions from messages with codeSnapshot
  const versions = useMemo<CodeVersion[]>(() => {
    let versionNumber = 0;
    return messages
      .filter((m) => m.role === 'assistant' && m.codeSnapshot)
      .map((m) => ({
        id: m.id,
        versionNumber: ++versionNumber,
        code: m.codeSnapshot!,
        createdAt: m.createdAt,
        messageContent: m.content.slice(0, 100),
      }));
  }, [messages]);

  // Selected version for preview (null = show active/current code)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );

  // Active version (last applied to draft) - initialized from URL param
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    initialVersionId ?? null
  );

  // Get code for selected version
  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId),
    [versions, selectedVersionId]
  );

  // Preview code: selected version or initial
  const previewCode = selectedVersion?.code ?? initialCode;

  // Select version for preview only
  const selectVersion = useCallback((versionId: string | null) => {
    setSelectedVersionId(versionId);
  }, []);

  // Apply version as active draft
  const applyVersion = useCallback(
    (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (version) {
        setActiveVersionId(versionId);
        setSelectedVersionId(null); // Clear selection after apply
        onCodeChange(version.code);
        onVersionChange?.(versionId); // Update URL
      }
    },
    [versions, onCodeChange, onVersionChange]
  );

  // Latest version (most recent AI response)
  const latestVersion = versions[versions.length - 1] ?? null;

  // Check if a version is currently active (applied to draft)
  const isActiveVersion = useCallback(
    (versionId: string) => {
      return activeVersionId === versionId;
    },
    [activeVersionId]
  );

  // Track previous version count to detect new AI responses
  const prevVersionCountRef = useRef(versions.length);

  // Track if initial version restore has happened
  const initialRestoreDoneRef = useRef(false);

  // Clear selection when new AI response adds a version
  useEffect(() => {
    if (versions.length > prevVersionCountRef.current && selectedVersionId) {
      // New version added, clear selection to show latest
      setSelectedVersionId(null);
    }
    prevVersionCountRef.current = versions.length;
  }, [versions.length, selectedVersionId]);

  // Restore version from URL on mount (only runs once when versions are available)
  useEffect(() => {
    // Skip if no initialVersionId, already restored, or versions not loaded
    if (!initialVersionId || initialRestoreDoneRef.current || versions.length === 0) return;

    const version = versions.find(v => v.id === initialVersionId);
    if (version) {
      // Restore this version's code
      onCodeChange(version.code);
    } else {
      // Invalid version ID in URL - clear it
      onVersionChange?.(null);
    }
    initialRestoreDoneRef.current = true;
  }, [initialVersionId, versions, onCodeChange, onVersionChange]);

  // Auto-apply latest AI version when not dirty and no version history browsing
  useEffect(() => {
    // Skip if no versions, dirty draft, or browsing version history
    if (versions.length === 0 || isDirty || selectedVersionId) return;

    const latestVer = versions[versions.length - 1];
    if (!latestVer) return;

    // Auto-apply if: first version OR new version added
    const isFirstVersion = versions.length === 1 && !activeVersionId;
    const isNewVersion = versions.length > prevVersionCountRef.current;

    if (isFirstVersion || isNewVersion) {
      setActiveVersionId(latestVer.id);
      setSelectedVersionId(null);
      onCodeChange(latestVer.code);
      onAutoApply?.();
      onAutoSave?.(latestVer.code);
      onVersionChange?.(latestVer.id); // Update URL
    }
  }, [versions, isDirty, activeVersionId, selectedVersionId, onCodeChange, onAutoApply, onAutoSave, onVersionChange]);

  return {
    versions,
    selectedVersionId,
    selectedVersion,
    activeVersionId,
    previewCode,
    latestVersion,
    selectVersion,
    applyVersion,
    isActiveVersion,
  };
}
