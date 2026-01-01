import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFetcher, useSearchParams } from 'react-router';
import type { Section } from '@prisma/client';
import type { Theme, UIMessage } from '../../../types';
import { useVersionState } from './useVersionState';

export type CodeSource = 'initial' | 'chat';

interface UseEditorStateOptions {
  section: Section;
  themes: Theme[];
  conversation?: {
    id: string;
    messages: UIMessage[];
  } | null;
  onAutoApply?: () => void;
  initialVersionId?: string | null;
}

/**
 * Hook for managing unified editor state
 * Coordinates section data, conversation, and save settings
 */
export function useEditorState({
  section,
  themes,
  conversation,
  onAutoApply,
  initialVersionId,
}: UseEditorStateOptions) {
  // URL search params for version persistence
  const [, setSearchParams] = useSearchParams();

  // Callback for URL update when version changes
  const handleVersionChange = useCallback((versionId: string | null) => {
    setSearchParams(prev => {
      if (versionId) {
        prev.set('v', versionId);
      } else {
        prev.delete('v');
      }
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  // Section state
  const [sectionCode, setSectionCode] = useState(section.code);
  const [sectionName, setSectionName] = useState(section.name || 'Untitled Section');

  // Track code source for UI feedback
  const [lastCodeSource, setLastCodeSource] = useState<CodeSource>('initial');

  // Save state
  const activeTheme = themes.find(t => t.role === 'MAIN');
  const [selectedTheme, setSelectedTheme] = useState(
    section.themeId || activeTheme?.id || themes[0]?.id || ''
  );
  const [fileName, setFileName] = useState(
    section.fileName?.replace('sections/', '').replace('.liquid', '') || 'ai-section'
  );

  // Live messages state - synced from ChatPanel
  const [liveMessages, setLiveMessages] = useState<UIMessage[]>(
    conversation?.messages || []
  );

  // Sync initial messages from loader
  useEffect(() => {
    if (conversation?.messages) {
      setLiveMessages(conversation.messages);
    }
  }, [conversation?.messages]);

  // Callback for ChatPanel to sync messages
  const handleMessagesChange = useCallback((messages: UIMessage[]) => {
    setLiveMessages(messages);
  }, []);

  // Track dirty state - use memo to avoid extra render
  const originalCode = section.code;
  const isDirty = useMemo(
    () => sectionCode !== originalCode,
    [sectionCode, originalCode]
  );

  // Handle code update from chat - stable ref (no deps)
  const handleCodeUpdate = useCallback((newCode: string) => {
    if (typeof newCode === 'string' && newCode.length > 0) {
      setSectionCode(newCode);
      setLastCodeSource('chat');
    }
  }, []);

  // Auto-save fetcher for silent persistence
  const autoSaveFetcher = useFetcher();

  // Auto-save handler - silently persist when AI version auto-applies
  const handleAutoSave = useCallback((code: string) => {
    const formData = new FormData();
    formData.append('action', 'saveDraft');
    formData.append('code', code);
    formData.append('name', sectionName);
    autoSaveFetcher.submit(formData, { method: 'post' });
  }, [sectionName, autoSaveFetcher]);

  // Get theme name for display
  const selectedThemeName = themes.find(t => t.id === selectedTheme)?.name || 'theme';

  // Validation
  const canPublish = Boolean(sectionCode && fileName && selectedTheme);

  // Version state for preview/history (uses live messages from ChatPanel)
  const {
    versions,
    selectedVersionId,
    selectedVersion,
    activeVersionId,
    previewCode,
    latestVersion,
    selectVersion,
    applyVersion,
  } = useVersionState({
    messages: liveMessages,
    initialCode: sectionCode,
    onCodeChange: handleCodeUpdate,
    isDirty,
    onAutoApply,
    onAutoSave: handleAutoSave,
    initialVersionId,
    onVersionChange: handleVersionChange,
  });

  return {
    // Section
    sectionId: section.id,
    sectionCode,
    setSectionCode,
    sectionName,
    setSectionName,
    handleCodeUpdate,

    // Code source tracking
    lastCodeSource,

    // Conversation
    conversationId: conversation?.id || null,
    initialMessages: liveMessages,
    handleMessagesChange,

    // Save
    selectedTheme,
    setSelectedTheme,
    selectedThemeName,
    fileName,
    setFileName,
    isDirty,
    canPublish,

    // Original section data
    section,
    themes,

    // Version state
    versions,
    selectedVersionId,
    selectedVersion,
    activeVersionId,
    previewCode,
    latestVersion,
    selectVersion,
    applyVersion,
  };
}
