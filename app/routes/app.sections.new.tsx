import { useState, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useNavigation, useSubmit, useSearchParams, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { aiAdapter } from "../services/adapters/ai-adapter";
import { themeAdapter } from "../services/adapters/theme-adapter";
import { sectionService } from "../services/section.server";
import { templateService } from "../services/template.server";
import { canGenerate, trackGeneration } from "../services/usage-tracking.server";
import type { GenerateActionData, SaveActionData, Theme } from "../types";

import { GenerateLayout } from "../components/generate/GenerateLayout";
import { GenerateInputColumn } from "../components/generate/GenerateInputColumn";
import { GeneratePreviewColumn } from "../components/generate/GeneratePreviewColumn";
import { SaveTemplateModal } from "../components/generate/SaveTemplateModal";
import type { AdvancedOptionsState } from "../components/generate/AdvancedOptions";
import type { SectionType } from "../components/generate/SectionTypeSelector";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  const themes = await themeAdapter.getThemes(request);
  return { themes };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
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

    // Return code only - section saved to DB only when user clicks Save Draft or Publish
    return {
      code,
      prompt,
      name: name || undefined,
      tone: tone || undefined,
      style: style || undefined,
      quota: quotaCheck.quota,
    } satisfies GenerateActionData;
  }

  if (actionType === "saveDraft") {
    const prompt = formData.get("prompt") as string;
    const content = formData.get("content") as string;
    const sectionName = formData.get("sectionName") as string | null;
    const tone = formData.get("tone") as string | null;
    const style = formData.get("style") as string | null;

    try {
      // Create section in DB with draft status
      const sectionEntry = await sectionService.create({
        shop,
        prompt,
        code: content,
        name: sectionName || undefined,
        tone: tone || undefined,
        style: style || undefined,
        status: "draft",
      });

      // Track usage
      trackGeneration(admin, shop, sectionEntry.id, prompt).catch((error) => {
        console.error("Failed to track generation:", error);
      });

      return {
        success: true,
        message: "Draft saved successfully!",
        sectionId: sectionEntry.id,
      } satisfies SaveActionData;
    } catch (error) {
      console.error("Failed to save draft:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to save draft. Please try again."
      } satisfies SaveActionData;
    }
  }

  if (actionType === "save") {
    const themeId = formData.get("themeId") as string;
    const fileName = formData.get("fileName") as string;
    const content = formData.get("content") as string;
    const prompt = formData.get("prompt") as string;
    const sectionName = formData.get("sectionName") as string | null;
    const themeName = formData.get("themeName") as string | null;
    const tone = formData.get("tone") as string | null;
    const style = formData.get("style") as string | null;

    try {
      // Save to theme first
      const result = await themeAdapter.createSection(request, themeId, fileName, content, sectionName || undefined);

      // Create section in DB with saved status
      const sectionEntry = await sectionService.create({
        shop,
        prompt,
        code: content,
        name: sectionName || undefined,
        tone: tone || undefined,
        style: style || undefined,
        themeId,
        themeName: themeName || undefined,
        fileName,
      });

      // Track usage
      trackGeneration(admin, shop, sectionEntry.id, prompt).catch((error) => {
        console.error("Failed to track generation:", error);
      });

      return {
        success: true,
        message: `Section published to ${result?.filename || fileName}!`,
        sectionId: sectionEntry.id,
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

export default function CreateSectionPage() {
  const { themes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get params from URL (from template navigation)
  const urlPrompt = searchParams.get("prompt") || "";
  const urlCode = searchParams.get("code") || "";
  const urlName = searchParams.get("name") || "";
  const hasAutoGenerated = useRef(false);
  const hasLoadedCode = useRef(false);

  const [prompt, setPrompt] = useState(urlPrompt || actionData?.prompt || "");
  const [sectionName, setSectionName] = useState(urlName || "");
  const [generatedCode, setGeneratedCode] = useState(urlCode || actionData?.code || "");

  // Section type state (customizable vs production-ready)
  const [sectionType, setSectionType] = useState<SectionType>('customizable');

  // Advanced options state (for future AI integration)
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptionsState>({
    tone: 'professional',
    style: 'minimal',
    includeSchema: true
  });

  // Auto-sync includeSchema with sectionType
  useEffect(() => {
    setAdvancedOptions(prev => ({
      ...prev,
      includeSchema: sectionType === 'customizable'
    }));
  }, [sectionType]);

  // Find the active (main) theme to set as default
  const activeTheme = themes.find((theme: Theme) => theme.role === "MAIN");
  const [selectedTheme, setSelectedTheme] = useState(activeTheme?.id || themes[0]?.id || "");

  const [fileName, setFileName] = useState(urlName ? urlName.toLowerCase().replace(/\s+/g, '-') : "ai-section");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  const isLoading = navigation.state === "submitting";
  const isGenerating = isLoading && navigation.formData?.get("action") === "generate";
  const isSaving = isLoading && (navigation.formData?.get("action") === "save" || navigation.formData?.get("action") === "saveDraft");
  const isSavingDraft = isLoading && navigation.formData?.get("action") === "saveDraft";
  const isPublishing = isLoading && navigation.formData?.get("action") === "save";

  // Update state when action data changes
  useEffect(() => {
    if (actionData?.code && actionData.code !== generatedCode) {
      setGeneratedCode(actionData.code);
    }
  }, [actionData?.code, generatedCode]);

  // Load pre-built code from URL (Use As-Is flow)
  useEffect(() => {
    if (urlCode && !hasLoadedCode.current) {
      hasLoadedCode.current = true;
      // Code is already set via useState initial value
      // Just clear URL params to prevent issues on reload
      setSearchParams({}, { replace: true });
    }
  }, [urlCode, setSearchParams]);

  // Auto-generate when coming from template with prompt URL param
  useEffect(() => {
    if (urlPrompt && !hasAutoGenerated.current && navigation.state === "idle" && !urlCode) {
      hasAutoGenerated.current = true;
      // Set prompt state if not already set
      if (prompt !== urlPrompt) {
        setPrompt(urlPrompt);
      }
      // Clear the URL param to prevent re-generation on reload
      setSearchParams({}, { replace: true });
      // Trigger generation
      const formData = new FormData();
      formData.append("action", "generate");
      formData.append("prompt", urlPrompt);
      formData.append("name", "");
      formData.append("tone", advancedOptions.tone);
      formData.append("style", advancedOptions.style);
      formData.append("sectionType", sectionType);
      submit(formData, { method: "post" });
    }
  }, [urlPrompt, urlCode, navigation.state, prompt, advancedOptions, sectionType, submit, setSearchParams]);

  // Get theme name for success message and save handler
  const selectedThemeName = themes.find((t: Theme) => t.id === selectedTheme)?.name || 'theme';

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

  const handleSaveDraft = () => {
    const formData = new FormData();
    formData.append("action", "saveDraft");
    formData.append("prompt", prompt);
    formData.append("content", generatedCode);
    formData.append("sectionName", sectionName);
    formData.append("tone", advancedOptions.tone);
    formData.append("style", advancedOptions.style);
    submit(formData, { method: "post" });
  };

  const handlePublish = () => {
    const formData = new FormData();
    formData.append("action", "save");
    formData.append("themeId", selectedTheme);
    formData.append("fileName", fileName);
    formData.append("content", generatedCode);
    formData.append("prompt", prompt);
    formData.append("themeName", selectedThemeName);
    formData.append("sectionName", sectionName);
    formData.append("tone", advancedOptions.tone);
    formData.append("style", advancedOptions.style);
    submit(formData, { method: "post" });
  };

  const canSave = Boolean(generatedCode);
  const canPublish = Boolean(generatedCode && fileName && selectedTheme);

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

  // Redirect to edit page after successful section save
  useEffect(() => {
    if (actionData?.success && actionData?.sectionId && !actionData?.templateSaved) {
      shopify.toast.show("Section saved");
      navigate(`/app/sections/${actionData.sectionId}`);
    }
  }, [actionData?.success, actionData?.sectionId, actionData?.templateSaved, navigate]);

  return (
    <>
      <s-page heading="Create Section" inlineSize="large">
        <s-stack gap="large" direction="block">
          {/* Enhanced feedback banners */}

          {/* Template saved banner */}
          {actionData?.templateSaved && (
            <s-banner tone="success" dismissible>
              Template saved successfully! View your templates in the Templates Library.
            </s-banner>
          )}

          {/* Note: Section save success banner removed - user is redirected to edit page */}

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
                sectionName={sectionName}
                onSectionNameChange={setSectionName}
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
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
                onSaveAsTemplate={() => setShowSaveTemplateModal(true)}
                isSavingDraft={isSavingDraft}
                isPublishing={isPublishing}
                isGenerating={isGenerating}
                canSave={canSave}
                canPublish={canPublish}
              />
            }
          />
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
    </>
  );
}
