import { CodePreview } from "./CodePreview";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ThemeSelector } from "./ThemeSelector";
import { SectionNameInput } from "./SectionNameInput";
import type { Theme } from "../../types";

export interface GeneratePreviewColumnProps {
  generatedCode: string;
  themes: Theme[];
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  onSave: () => void;
  onSaveAsTemplate?: () => void;
  isSaving: boolean;
  isGenerating?: boolean;
  canSave: boolean;
}

/**
 * Right column for generate screen
 * Contains code preview, theme selector, filename input, and save button
 * Handles loading, empty, and content states
 */
export function GeneratePreviewColumn({
  generatedCode,
  themes,
  selectedTheme,
  onThemeChange,
  fileName,
  onFileNameChange,
  onSave,
  onSaveAsTemplate,
  isSaving,
  isGenerating = false,
  canSave
}: GeneratePreviewColumnProps) {
  // Show loading state during generation
  if (isGenerating) {
    return (
      <s-card>
        <LoadingState
          message="Generating section code..."
          subMessage="This may take 10-15 seconds"
        />
      </s-card>
    );
  }

  // Show empty state if no code generated yet
  if (!generatedCode) {
    return (
      <s-card>
        <EmptyState
          heading="Preview"
          message="Generated code will appear here. Enter a prompt or choose a template to get started."
        />
      </s-card>
    );
  }

  // Show code preview and save controls
  return (
    <s-stack gap="400" vertical>
      <s-card>
        <s-stack gap="400" vertical>
          <s-text variant="headingMd" as="h2">
            Preview & Save
          </s-text>

          <CodePreview
            code={generatedCode}
            fileName={fileName}
          />

          <s-divider />

          <ThemeSelector
            themes={themes}
            selectedThemeId={selectedTheme}
            onChange={onThemeChange}
            disabled={isSaving}
          />

          <SectionNameInput
            value={fileName}
            onChange={onFileNameChange}
            disabled={isSaving}
          />

          <s-stack gap="200">
            <s-button
              variant="primary"
              onClick={onSave}
              loading={isSaving ? "true" : undefined}
              disabled={!canSave || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save to Theme'}
            </s-button>

            {onSaveAsTemplate && (
              <s-button
                variant="secondary"
                onClick={onSaveAsTemplate}
                disabled={!generatedCode || isSaving}
              >
                Save as Template
              </s-button>
            )}
          </s-stack>
        </s-stack>
      </s-card>
    </s-stack>
  );
}
