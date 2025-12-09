import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
  data,
} from "react-router";
import { authenticate } from "../shopify.server";
import { aiAdapter } from "../services/adapters/ai-adapter";
import { themeAdapter } from "../services/adapters/theme-adapter";
import { sectionService } from "../services/section.server";
import { templateService } from "../services/template.server";
import {
  canGenerate,
  trackGeneration,
} from "../services/usage-tracking.server";
import type { GenerateActionData, SaveActionData, Theme } from "../types";

import { GenerateLayout } from "../components/generate/GenerateLayout";
import { GenerateInputColumn } from "../components/generate/GenerateInputColumn";
import { GeneratePreviewColumn } from "../components/generate/GeneratePreviewColumn";
import { SaveTemplateModal } from "../components/generate/SaveTemplateModal";
import type { AdvancedOptionsState } from "../components/generate/AdvancedOptions";
import type { SectionType } from "../components/generate/SectionTypeSelector";
import { DeleteConfirmModal } from "../components/sections/DeleteConfirmModal";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const { id } = params;

  if (!id) {
    throw data({ message: "Section ID is required" }, { status: 400 });
  }

  const generation = await sectionService.getById(id, shop);

  if (!generation) {
    throw data({ message: "Section not found" }, { status: 404 });
  }

  const themes = await themeAdapter.getThemes(request);

  return { generation, themes };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const { id } = params;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "generate") {
    const prompt = formData.get("prompt") as string;
    const name = formData.get("name") as string | null;
    const tone = formData.get("tone") as string | null;
    const style = formData.get("style") as string | null;

    // Check quota before generation
    const quotaCheck = await canGenerate(shop);

    if (!quotaCheck.allowed) {
      return {
        error: quotaCheck.reason || "Generation limit reached",
        quota: quotaCheck.quota,
      };
    }

    const code = await aiAdapter.generateSection(prompt);

    // Create a NEW section entry (regenerate creates new, doesn't update old)
    const sectionEntry = await sectionService.create({
      shop,
      prompt,
      code,
      name: name || undefined,
      tone: tone || undefined,
      style: style || undefined,
    });

    // Track usage (async, don't block response)
    trackGeneration(admin, shop, sectionEntry.id, prompt).catch((error) => {
      console.error("Failed to track generation:", error);
    });

    return {
      code,
      prompt,
      historyId: sectionEntry.id,
      quota: quotaCheck.quota,
      regenerated: true,
    } satisfies GenerateActionData & { regenerated?: boolean };
  }

  if (actionType === "save") {
    const themeId = formData.get("themeId") as string;
    const fileName = formData.get("fileName") as string;
    const content = formData.get("content") as string;
    const historyId = formData.get("historyId") as string | null;
    const sectionName = formData.get("sectionName") as string | null;

    try {
      const result = await themeAdapter.createSection(
        request,
        themeId,
        fileName,
        content,
        sectionName || undefined
      );

      // Update section entry with save info
      const entryToUpdate = historyId || id;
      if (entryToUpdate) {
        const themeName = formData.get("themeName") as string | null;
        await sectionService.update(entryToUpdate, shop, {
          themeId,
          themeName: themeName || undefined,
          fileName,
          status: "saved",
        });
      }

      return {
        success: true,
        message: `Section saved successfully to ${result?.filename || fileName}!`,
      } satisfies SaveActionData;
    } catch (error) {
      console.error("Failed to save section:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save section. Please try again.",
      } satisfies SaveActionData;
    }
  }

  if (actionType === "saveAsTemplate") {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const icon = formData.get("icon") as string;
    const prompt = formData.get("prompt") as string;
    const code = formData.get("code") as string | null;

    try {
      await templateService.create({
        shop,
        title,
        description,
        category,
        icon,
        prompt,
        code: code || undefined,
      });

      return {
        success: true,
        message: "Template saved successfully!",
        templateSaved: true,
      };
    } catch (error) {
      console.error("Failed to save template:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save template. Please try again.",
      };
    }
  }

  if (actionType === "updateName") {
    const name = formData.get("name") as string;
    if (!id) {
      return { success: false, message: "Section ID is required" };
    }

    await sectionService.update(id, shop, { name });
    return {
      success: true,
      nameUpdated: true,
      message: "Section name updated",
    };
  }

  if (actionType === "delete") {
    if (!id) {
      return { success: false, message: "Section ID is required" };
    }

    const deleted = await sectionService.delete(id, shop);

    if (!deleted) {
      return { success: false, message: "Failed to delete section" };
    }

    return {
      success: true,
      deleted: true,
      message: "Section deleted successfully",
    };
  }

  return null;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SectionEditPage() {
  const { generation, themes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const navigate = useNavigate();

  // Initialize state from loaded generation
  const [prompt, setPrompt] = useState(generation.prompt);
  const [sectionName, setSectionName] = useState(generation.name || "");
  const [generatedCode, setGeneratedCode] = useState(generation.code);
  const [currentHistoryId, setCurrentHistoryId] = useState(generation.id);

  // Section type state (customizable vs production-ready) - default based on existing section
  const [sectionType, setSectionType] = useState<SectionType>('customizable');

  // Advanced options state
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptionsState>({
    tone: (generation.tone as AdvancedOptionsState["tone"]) || "professional",
    style: (generation.style as AdvancedOptionsState["style"]) || "minimal",
    includeSchema: true,
  });

  // Auto-sync includeSchema with sectionType
  useEffect(() => {
    setAdvancedOptions(prev => ({
      ...prev,
      includeSchema: sectionType === 'customizable'
    }));
  }, [sectionType]);

  // Theme selection - use original theme if available, else active theme, else first theme
  const originalTheme = themes.find((t: Theme) => t.id === generation.themeId);
  const activeTheme = themes.find((theme: Theme) => theme.role === "MAIN");
  const [selectedTheme, setSelectedTheme] = useState(
    originalTheme?.id || activeTheme?.id || themes[0]?.id || "",
  );

  const [fileName, setFileName] = useState(generation.fileName || "ai-section");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // Modal ID for commandFor pattern
  const DELETE_MODAL_ID = "delete-section-modal";

  const isLoading = navigation.state === "submitting";
  const isGenerating =
    isLoading && navigation.formData?.get("action") === "generate";
  const isSaving = isLoading && navigation.formData?.get("action") === "save";
  const isDeleting =
    isLoading && navigation.formData?.get("action") === "delete";

  // Update state when action data changes (after regeneration)
  useEffect(() => {
    if (actionData?.code && actionData.code !== generatedCode) {
      setGeneratedCode(actionData.code);
    }
    if (actionData?.historyId && actionData.historyId !== currentHistoryId) {
      setCurrentHistoryId(actionData.historyId);
    }
  }, [
    actionData?.code,
    actionData?.historyId,
    generatedCode,
    currentHistoryId,
  ]);

  // Handle delete success - show toast and navigate back to sections list
  useEffect(() => {
    if (actionData?.deleted) {
      shopify.toast.show(actionData.message || "Section deleted successfully");
      navigate("/app/sections");
    }
  }, [actionData?.deleted, actionData?.message, navigate]);

  // Close modal on successful template save
  useEffect(() => {
    if (actionData?.templateSaved) {
      setShowSaveTemplateModal(false);
    }
  }, [actionData?.templateSaved]);

  // Get theme name for success message
  const selectedThemeName =
    themes.find((t: Theme) => t.id === selectedTheme)?.name || "theme";

  // Handlers
  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const formData = new FormData();
    formData.append("action", "generate");
    formData.append("prompt", prompt);
    formData.append("name", sectionName);
    formData.append("tone", advancedOptions.tone);
    formData.append("style", advancedOptions.style);
    formData.append("sectionType", sectionType);
    submit(formData, { method: "post" });
  };

  // Save name on blur
  const handleNameBlur = () => {
    if (sectionName !== (generation.name || "")) {
      const formData = new FormData();
      formData.append("action", "updateName");
      formData.append("name", sectionName);
      submit(formData, { method: "post" });
    }
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("action", "save");
    formData.append("themeId", selectedTheme);
    formData.append("fileName", fileName);
    formData.append("content", generatedCode);
    formData.append("themeName", selectedThemeName);
    formData.append("sectionName", sectionName);
    if (currentHistoryId) {
      formData.append("historyId", currentHistoryId);
    }
    submit(formData, { method: "post" });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("action", "delete");
    submit(formData, { method: "post" });
  };

  const canSave = Boolean(generatedCode && fileName && selectedTheme);

  const handleSaveAsTemplate = (templateData: {
    title: string;
    description: string;
    category: string;
    icon: string;
    prompt: string;
  }) => {
    const formData = new FormData();
    formData.append("action", "saveAsTemplate");
    formData.append("title", templateData.title);
    formData.append("description", templateData.description);
    formData.append("category", templateData.category);
    formData.append("icon", templateData.icon);
    formData.append("prompt", templateData.prompt);
    if (generatedCode) {
      formData.append("code", generatedCode);
    }
    submit(formData, { method: "post" });
    setShowSaveTemplateModal(false);
  };

  return (
    <>
      <s-page heading="Edit Section" inlineSize="large">
        <s-stack gap="large" direction="block">
          {/* Breadcrumb */}
          <s-stack direction="inline" gap="small" alignItems="center">
            <a
              href="/app/sections"
              style={{ color: "var(--p-color-text-secondary)" }}
            >
              Sections
            </a>
            <s-text color="subdued">/</s-text>
            <s-text>
              {prompt.length > 40 ? prompt.substring(0, 40) + "..." : prompt}
            </s-text>
          </s-stack>

          {/* Section Info Banner */}
          <s-banner tone="info">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-badge
                tone={generation.status === "saved" ? "success" : "neutral"}
              >
                {generation.status === "saved" ? "Saved" : "Draft"}
              </s-badge>
              <s-text color="subdued">
                Created: {formatDate(generation.createdAt)}
              </s-text>
              {generation.themeName && (
                <s-text color="subdued">Theme: {generation.themeName}</s-text>
              )}
            </s-stack>
          </s-banner>

          {/* Regeneration info callout */}
          {actionData?.regenerated && (
            <s-banner tone="success" dismissible>
              New section created! The previous version is still available in
              your sections list.
            </s-banner>
          )}

          {/* Template saved banner */}
          {actionData?.templateSaved && (
            <s-banner tone="success" dismissible>
              Template saved successfully! View your templates in the Templates
              Library.
            </s-banner>
          )}

          {/* Success banner after save */}
          {actionData?.success &&
            !actionData?.templateSaved &&
            !actionData?.deleted && (
              <s-banner tone="success" dismissible>
                Section saved successfully to {selectedThemeName}!{" "}
                <a href="/app/sections">Back to Sections</a>
              </s-banner>
            )}

          {/* Error banner */}
          {actionData?.success === false && (
            <s-banner tone="critical">{actionData.message}</s-banner>
          )}

          {/* Two-column layout */}
          <GenerateLayout
            inputColumn={
              <GenerateInputColumn
                prompt={prompt}
                onPromptChange={setPrompt}
                sectionName={sectionName}
                onSectionNameChange={setSectionName}
                onSectionNameBlur={handleNameBlur}
                sectionType={sectionType}
                onSectionTypeChange={setSectionType}
                advancedOptions={advancedOptions}
                onAdvancedOptionsChange={setAdvancedOptions}
                disabled={isGenerating || isSaving}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            }
            previewColumn={
              <GeneratePreviewColumn
                generatedCode={generatedCode}
                themes={themes}
                selectedTheme={selectedTheme}
                onThemeChange={setSelectedTheme}
                fileName={fileName}
                onFileNameChange={setFileName}
                onSave={handleSave}
                onSaveAsTemplate={() => setShowSaveTemplateModal(true)}
                isSaving={isSaving}
                isGenerating={isGenerating}
                canSave={canSave}
              />
            }
          />

          {/* Delete button at bottom */}
          <s-stack direction="inline" justifyContent="end">
            <s-button
              tone="critical"
              command="--show"
              commandFor={DELETE_MODAL_ID}
              disabled={isDeleting}
            >
              Delete Section
            </s-button>
          </s-stack>
        </s-stack>
      </s-page>

      {/* Save as Template Modal */}
      {showSaveTemplateModal && (
        <SaveTemplateModal
          defaultPrompt={prompt}
          onSave={handleSaveAsTemplate}
          onClose={() => setShowSaveTemplateModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        id={DELETE_MODAL_ID}
        isBulk={false}
        count={1}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}

// Error boundary for 404
export function ErrorBoundary() {
  return (
    <s-page heading="Section Not Found" inlineSize="large">
      <s-stack gap="large" direction="block" alignItems="center">
        <s-section>
          <s-stack gap="base" alignItems="center">
            <s-heading>Section not found</s-heading>
            <s-paragraph>
              The section you are looking for does not exist or you do not have
              access to it.
            </s-paragraph>
            <s-button
              variant="primary"
              onClick={() => (window.location.href = "/app/sections")}
            >
              Back to Sections
            </s-button>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
