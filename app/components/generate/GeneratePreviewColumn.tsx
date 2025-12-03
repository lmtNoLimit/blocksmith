import { useState } from "react";
import { CodePreview } from "./CodePreview";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ThemeSelector } from "./ThemeSelector";
import { SectionNameInput } from "./SectionNameInput";
import {
  SectionPreview,
  PreviewErrorBoundary,
} from "../preview";
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
  // Tab state for Code/Preview toggle - must be at top level
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

  // Show loading state during generation
  if (isGenerating) {
    return (
      <s-section heading="Preview">
        <LoadingState
          message="Generating section code..."
          subMessage="This may take 10-15 seconds"
        />
      </s-section>
    );
  }

  // Show empty state if no code generated yet
  if (!generatedCode) {
    return (
      <s-section heading="Preview">
        <EmptyState
          heading="No code yet"
          message="Enter a prompt or choose a template to get started."
          icon="📝"
        />
      </s-section>
    );
  }

  // Show code preview and save controls
  return (
    <>
      {/* Code/Preview Card with Tabs */}
      <s-section>
        {/* Tab buttons */}
        <s-stack gap="base" direction="block">
          <div style={{ display: 'flex', gap: '4px' }}>
            <s-button
              variant={activeTab === 'code' ? 'primary' : 'tertiary'}
              onClick={() => setActiveTab('code')}
            >
              Code
            </s-button>
            <s-button
              variant={activeTab === 'preview' ? 'primary' : 'tertiary'}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </s-button>
          </div>

          {/* Tab content */}
          {activeTab === 'code' ? (
            <CodePreview
              code={generatedCode}
              fileName={fileName}
            />
          ) : (
            <PreviewErrorBoundary onRetry={() => {}}>
              <SectionPreview liquidCode={generatedCode} />
            </PreviewErrorBoundary>
          )}
        </s-stack>
      </s-section>

      {/* Save Options */}
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
    </>
  );
}
