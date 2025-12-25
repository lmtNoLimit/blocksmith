import { useState } from "react";
import { CodePreview } from "./CodePreview";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ThemeSelector } from "./ThemeSelector";
import { SectionNameInput } from "./SectionNameInput";
import { SectionPreview, PreviewErrorBoundary } from "../preview";
import type { Theme } from "../../types";

export interface GeneratePreviewColumnProps {
  generatedCode: string;
  themes: Theme[];
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  // For Create page - two save options
  onSaveDraft?: () => void;
  onPublish?: () => void;
  isSavingDraft?: boolean;
  isPublishing?: boolean;
  canPublish?: boolean;
  // For Edit page - single save to theme
  onSave?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  // Common
  onSaveAsTemplate?: () => void;
  isGenerating?: boolean;
  // Shop domain for native preview
  shopDomain: string;
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
  // Create page props
  onSaveDraft,
  onPublish,
  isSavingDraft = false,
  isPublishing = false,
  canPublish = false,
  // Edit page props
  onSave,
  isSaving = false,
  canSave = false,
  // Common
  onSaveAsTemplate,
  isGenerating = false,
  shopDomain,
}: GeneratePreviewColumnProps) {
  // Determine if we're in "Create" mode (has draft option) or "Edit" mode (single save)
  const isCreateMode = Boolean(onSaveDraft);
  const isAnyActionLoading = isSavingDraft || isPublishing || isSaving;
  // Tab state for Code/Preview toggle - must be at top level
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");

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
          <div style={{ display: "flex", gap: "4px" }}>
            <s-button
              variant={activeTab === "preview" ? "primary" : "tertiary"}
              onClick={() => setActiveTab("preview")}
            >
              Preview
            </s-button>
            <s-button
              variant={activeTab === "code" ? "primary" : "tertiary"}
              onClick={() => setActiveTab("code")}
            >
              Code
            </s-button>
          </div>

          {/* Tab content */}
          {activeTab === "code" ? (
            <CodePreview code={generatedCode} fileName={fileName} />
          ) : (
            <PreviewErrorBoundary onRetry={() => {}}>
              <SectionPreview liquidCode={generatedCode} shopDomain={shopDomain} />
            </PreviewErrorBoundary>
          )}
        </s-stack>
      </s-section>

      {/* Save Options */}
      <s-section heading={isCreateMode ? "Save Options" : "Save to Theme"}>
        <s-stack gap="large" direction="block">
          {/* Theme selector and file name - always shown */}
          <ThemeSelector
            themes={themes}
            selectedThemeId={selectedTheme}
            onChange={onThemeChange}
            disabled={isAnyActionLoading}
          />

          <SectionNameInput
            value={fileName}
            onChange={onFileNameChange}
            disabled={isAnyActionLoading}
          />

          {/* Create Mode: Save Draft + Publish buttons side by side */}
          {isCreateMode && (
            <s-stack gap="small-100" direction="inline">
              {onSaveDraft && (
                <s-button
                  variant="secondary"
                  onClick={onSaveDraft}
                  loading={isSavingDraft || undefined}
                  disabled={!generatedCode || isAnyActionLoading}
                >
                  Save Draft
                </s-button>
              )}
              {onPublish && (
                <s-button
                  variant="primary"
                  onClick={onPublish}
                  loading={isPublishing || undefined}
                  disabled={!canPublish || isAnyActionLoading}
                >
                  Publish to Theme
                </s-button>
              )}
            </s-stack>
          )}

          {/* Edit Mode: Single Save button */}
          {!isCreateMode && onSave && (
            <s-button
              variant="primary"
              onClick={onSave}
              loading={isSaving || undefined}
              disabled={!canSave || isAnyActionLoading}
            >
              Save to Theme
            </s-button>
          )}

          {/* Save as Template - available in both modes */}
          {onSaveAsTemplate && (
            <s-button
              variant="tertiary"
              onClick={onSaveAsTemplate}
              disabled={!generatedCode || isAnyActionLoading}
            >
              Save as Template
            </s-button>
          )}
        </s-stack>
      </s-section>
    </>
  );
}
