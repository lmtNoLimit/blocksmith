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
 * Secondary column for generate screen (following Details pattern)
 * Contains code preview, theme selector, filename input, and save button
 * Shows supporting information: status, metadata, summaries
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
        <s-section heading="Preview">
          <LoadingState
            message="Generating section code..."
            subMessage="This may take 10-15 seconds"
          />
        </s-section>
      </s-card>
    );
  }

  // Show empty state if no code generated yet
  if (!generatedCode) {
    return (
      <s-card>
        <s-section heading="Preview">
          <EmptyState
            heading="No code yet"
            message="Enter a prompt or choose a template to get started."
            icon="📝"
          />
        </s-section>
      </s-card>
    );
  }

  // Show code preview and save controls
  return (
    <>
      {/* Code Preview Card */}
      <s-card>
        <s-section heading="Generated Code">
          <CodePreview
            code={generatedCode}
            fileName={fileName}
          />
        </s-section>
      </s-card>

      {/* Save Options Card */}
      <s-card>
        <s-section heading="Save to Theme">
          <s-stack gap="large" direction="block">
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

            <s-stack gap="base" direction="block">
              <s-button
                variant="primary"
                onClick={onSave}
                loading={isSaving || undefined}
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
        </s-section>
      </s-card>
    </>
  );
}
