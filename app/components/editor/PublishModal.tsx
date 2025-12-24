import { useRef, useCallback, useEffect, useState } from 'react';
import { ThemeSelector } from '../generate/ThemeSelector';
import { SectionNameInput } from '../generate/SectionNameInput';
import type { Theme } from '../../types';

interface PublishModalProps {
  themes: Theme[];
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  selectedThemeName: string;
  onPublish: () => void;
  isPublishing?: boolean;
  canPublish?: boolean;
}

/** Modal ID for commandFor reference */
export const PUBLISH_MODAL_ID = 'publish-modal';

/**
 * Modal for publish workflow with theme and filename selection
 * Use with: <s-button commandFor="publish-modal" command="--show">Publish</s-button>
 */
export function PublishModal({
  themes,
  selectedTheme,
  onThemeChange,
  fileName,
  onFileNameChange,
  selectedThemeName,
  onPublish,
  isPublishing = false,
  canPublish = true,
}: PublishModalProps) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const modalRef = useRef<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const [localFileName, setLocalFileName] = useState(fileName);
  const [localTheme, setLocalTheme] = useState(selectedTheme);

  // Sync local state with props
  useEffect(() => {
    setLocalFileName(fileName);
    setLocalTheme(selectedTheme);
  }, [fileName, selectedTheme]);

  const handleCancel = useCallback(() => {
    // Reset to original values
    setLocalFileName(fileName);
    setLocalTheme(selectedTheme);
    modalRef.current?.hideOverlay?.();
  }, [fileName, selectedTheme]);

  const handlePublish = useCallback(() => {
    // Apply local changes
    if (localTheme !== selectedTheme) {
      onThemeChange(localTheme);
    }
    if (localFileName !== fileName) {
      onFileNameChange(localFileName);
    }
    // Close modal and trigger publish
    modalRef.current?.hideOverlay?.();
    // Small delay to ensure state updates propagate
    setTimeout(() => onPublish(), 50);
  }, [localTheme, selectedTheme, localFileName, fileName, onThemeChange, onFileNameChange, onPublish]);

  const selectedThemeObj = themes.find(t => t.id === localTheme);
  const displayThemeName = selectedThemeObj?.name || selectedThemeName || 'Select theme';

  return (
    <s-modal ref={modalRef} id={PUBLISH_MODAL_ID} heading="Publish to Theme">
        <s-stack gap="large">
          {/* Info text */}
          <s-text>
            Select a theme and filename to publish your section. This will add the
            section to your theme&apos;s sections folder.
          </s-text>

          {/* Theme Selection */}
          <s-stack gap="base">
            <ThemeSelector
              themes={themes}
              selectedThemeId={localTheme}
              onChange={setLocalTheme}
              disabled={isPublishing}
            />
          </s-stack>

          {/* File Name */}
          <s-stack gap="base">
            <SectionNameInput
              value={localFileName}
              onChange={setLocalFileName}
              disabled={isPublishing}
            />
          </s-stack>

          {/* Summary */}
          {localTheme && localFileName && (
            <s-banner tone="info">
              Will publish as <strong>{localFileName}</strong> to{' '}
              <strong>{displayThemeName}</strong>
            </s-banner>
          )}
        </s-stack>

        {/* Actions */}
        <s-button
          slot="secondary-actions"
          onClick={handleCancel}
          disabled={isPublishing || undefined}
        >
          Cancel
        </s-button>
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={handlePublish}
          loading={isPublishing || undefined}
          disabled={!canPublish || isPublishing || undefined}
        >
          Publish
        </s-button>
      </s-modal>
  );
}
