import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import { aiAdapter } from "../services/adapters/ai-adapter";
import { themeAdapter } from "../services/adapters/theme-adapter";
import { historyService } from "../services/history.server";
import { templateService } from "../services/template.server";
import { ServiceModeIndicator } from "../components/ServiceModeIndicator";
import { serviceConfig } from "../services/config.server";
import type { GenerateActionData, SaveActionData, Theme } from "../types";

import { GenerateLayout } from "../components/generate/GenerateLayout";
import { GenerateInputColumn } from "../components/generate/GenerateInputColumn";
import { GeneratePreviewColumn } from "../components/generate/GeneratePreviewColumn";
import { SaveTemplateModal } from "../components/generate/SaveTemplateModal";
import type { AdvancedOptionsState } from "../components/generate/AdvancedOptions";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  const themes = await themeAdapter.getThemes(request);
  return {
    themes,
    serviceMode: {
      themeMode: serviceConfig.themeMode,
      aiMode: serviceConfig.aiMode,
      showIndicator: serviceConfig.showModeInUI
    }
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "generate") {
    const prompt = formData.get("prompt") as string;
    const tone = formData.get("tone") as string | null;
    const style = formData.get("style") as string | null;

    const code = await aiAdapter.generateSection(prompt);

    // Save to generation history
    const historyEntry = await historyService.create({
      shop,
      prompt,
      code,
      tone: tone || undefined,
      style: style || undefined,
    });

    return { code, prompt, historyId: historyEntry.id } satisfies GenerateActionData;
  }

  if (actionType === "save") {
    const themeId = formData.get("themeId") as string;
    const fileName = formData.get("fileName") as string;
    const content = formData.get("content") as string;
    const historyId = formData.get("historyId") as string | null;

    try {
      const result = await themeAdapter.createSection(request, themeId, fileName, content);

      // Update history entry with save info
      if (historyId) {
        const themeName = formData.get("themeName") as string | null;
        await historyService.update(historyId, shop, {
          themeId,
          themeName: themeName || undefined,
          fileName,
          status: "saved",
        });
      }

      return {
        success: true,
        message: `Section saved successfully to ${result?.filename || fileName}!`
      } satisfies SaveActionData;
    } catch (error) {
      console.error("Failed to save section:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to save section. Please try again."
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
        templateSaved: true
      };
    } catch (error) {
      console.error("Failed to save template:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to save template. Please try again."
      };
    }
  }

  return null;
}

export default function GeneratePage() {
  const { themes, serviceMode } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [prompt, setPrompt] = useState(actionData?.prompt || "");
  const [generatedCode, setGeneratedCode] = useState(actionData?.code || "");
  const [currentHistoryId, setCurrentHistoryId] = useState(actionData?.historyId || "");

  // Advanced options state (for future AI integration)
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptionsState>({
    tone: 'professional',
    style: 'minimal',
    includeSchema: true
  });

  // Find the active (main) theme to set as default
  const activeTheme = themes.find((theme: Theme) => theme.role === "MAIN");
  const [selectedTheme, setSelectedTheme] = useState(activeTheme?.id || themes[0]?.id || "");

  const [fileName, setFileName] = useState("ai-section");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  const isLoading = navigation.state === "submitting";
  const isGenerating = isLoading && navigation.formData?.get("action") === "generate";
  const isSaving = isLoading && navigation.formData?.get("action") === "save";

  // Update state when action data changes
  useEffect(() => {
    if (actionData?.code && actionData.code !== generatedCode) {
      setGeneratedCode(actionData.code);
    }
    if (actionData?.historyId && actionData.historyId !== currentHistoryId) {
      setCurrentHistoryId(actionData.historyId);
    }
  }, [actionData?.code, actionData?.historyId, generatedCode, currentHistoryId]);

  // Get theme name for success message and save handler
  const selectedThemeName = themes.find((t: Theme) => t.id === selectedTheme)?.name || 'theme';

  // Handlers
  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const formData = new FormData();
    formData.append("action", "generate");
    formData.append("prompt", prompt);
    formData.append("tone", advancedOptions.tone);
    formData.append("style", advancedOptions.style);
    submit(formData, { method: "post" });
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("action", "save");
    formData.append("themeId", selectedTheme);
    formData.append("fileName", fileName);
    formData.append("content", generatedCode);
    formData.append("themeName", selectedThemeName);
    if (currentHistoryId) {
      formData.append("historyId", currentHistoryId);
    }
    submit(formData, { method: "post" });
  };

  const canSave = Boolean(generatedCode && fileName && selectedTheme);

  const handleSaveAsTemplate = (data: {
    title: string;
    description: string;
    category: string;
    icon: string;
    prompt: string;
  }) => {
    const formData = new FormData();
    formData.append("action", "saveAsTemplate");
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("category", data.category);
    formData.append("icon", data.icon);
    formData.append("prompt", data.prompt);
    if (generatedCode) {
      formData.append("code", generatedCode);
    }
    submit(formData, { method: "post" });
    setShowSaveTemplateModal(false);
  };

  // Close modal on successful template save
  useEffect(() => {
    if (actionData?.templateSaved) {
      setShowSaveTemplateModal(false);
    }
  }, [actionData?.templateSaved]);

  return (
    <>
      <s-page heading="Generate Section" inlineSize="large">
        <s-stack gap="large" direction="block">
          {/* Enhanced feedback banners */}

          {/* Template saved banner */}
          {actionData?.templateSaved && (
            <s-banner tone="success" dismissible>
              Template saved successfully! View your templates in the Templates Library.
            </s-banner>
          )}

          {/* Success banner after save */}
          {actionData?.success && !actionData?.templateSaved && (
            <s-banner tone="success" dismissible>
              Section saved successfully to {selectedThemeName}! Visit the Theme Editor to customize your new section.
            </s-banner>
          )}

          {/* Error banner with recovery guidance */}
          {actionData?.success === false && (
            <s-banner tone="critical">
              {actionData.message}
              {actionData.message?.toLowerCase().includes('generate') && (
                <span> Try simplifying your prompt or choose a pre-built template.</span>
              )}
              {actionData.message?.toLowerCase().includes('save') && (
                <span> Verify that the selected theme exists and you have permission to modify it.</span>
              )}
            </s-banner>
          )}

          {/* Two-column layout */}
          <GenerateLayout
            inputColumn={
              <GenerateInputColumn
                prompt={prompt}
                onPromptChange={setPrompt}
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
        </s-stack>
      </s-page>

      <ServiceModeIndicator
        themeMode={serviceMode.themeMode}
        aiMode={serviceMode.aiMode}
        showIndicator={serviceMode.showIndicator}
      />

      {/* Save as Template Modal */}
      {showSaveTemplateModal && (
        <SaveTemplateModal
          defaultPrompt={prompt}
          onSave={handleSaveAsTemplate}
          onClose={() => setShowSaveTemplateModal(false)}
        />
      )}
    </>
  );
}
