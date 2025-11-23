// @ts-nocheck
import { useState } from "react";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import { aiService } from "../services/ai.server";
import { themeService } from "../services/theme.server";

export async function loader({ request }: { request: Request }) {
  await authenticate.admin(request);
  const themes = await themeService.getThemes(request);
  console.log("Loaded themes:", themes);
  return { themes };
}

export async function action({ request }: { request: Request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "generate") {
    const prompt = formData.get("prompt") as string;
    const code = await aiService.generateSection(prompt);
    return { code, prompt };
  }

  if (action === "save") {
    const themeId = formData.get("themeId") as string;
    const fileName = formData.get("fileName") as string;
    const content = formData.get("content") as string;
    
    try {
      const result = await themeService.createSection(request, themeId, fileName, content);
      return { 
        success: true, 
        message: `Section saved successfully to ${result?.filename || fileName}!` 
      };
    } catch (error) {
      console.error("Failed to save section:", error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to save section. Please try again." 
      };
    }
  }

  return null;
}

export default function GeneratePage() {
  const { themes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [prompt, setPrompt] = useState(actionData?.prompt || "");
  const [generatedCode, setGeneratedCode] = useState(actionData?.code || "");
  
  // Find the active (main) theme to set as default
  const activeTheme = themes.find((theme: any) => theme.role === "MAIN");
  const [selectedTheme, setSelectedTheme] = useState(activeTheme?.id || themes[0]?.id || "");
  
  const [fileName, setFileName] = useState("ai-section");

  const isLoading = navigation.state === "submitting";
  const isGenerating = isLoading && navigation.formData?.get("action") === "generate";
  const isSaving = isLoading && navigation.formData?.get("action") === "save";

  // Update state when action data changes
  if (actionData?.code && actionData.code !== generatedCode) {
    setGeneratedCode(actionData.code);
  }

  const handleGenerate = () => {
    const formData = new FormData();
    formData.append("action", "generate");
    formData.append("prompt", prompt);
    submit(formData, { method: "post" });
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("action", "save");
    formData.append("themeId", selectedTheme);
    formData.append("fileName", fileName);
    formData.append("content", generatedCode);
    submit(formData, { method: "post" });
  };

  const themeOptions = themes.map((theme: any) => ({
    label: `${theme.name} (${theme.role})`,
    value: theme.id,
  }));

  console.log("Theme options for select:", themeOptions);
  console.log("Selected theme:", selectedTheme);

  return (
    <s-page title="Generate Section">
      <s-layout>
        <s-layout-section>
          <s-card>
            <s-stack gap="400" vertical>
              <s-text variant="headingMd" as="h2">
                Describe your section
              </s-text>
              <s-text-field
                label="Prompt"
                value={prompt}
                onInput={(e: any) => setPrompt(e.target.value)}
                multiline="4"
                autoComplete="off"
                placeholder="A hero section with a background image and centered text..."
              ></s-text-field>
              <s-button 
                loading={isGenerating ? "true" : undefined} 
                onClick={handleGenerate} 
                variant="primary"
              >
                Generate Code
              </s-button>
            </s-stack>
          </s-card>
        </s-layout-section>

        {generatedCode && (
          <s-layout-section>
            <s-card>
              <s-stack gap="400" vertical>
                <s-text variant="headingMd" as="h2">
                  Preview & Save
                </s-text>
                
                {actionData?.success && (
                  <s-banner tone="success" heading="Success" dismissible>
                    {actionData.message}
                  </s-banner>
                )}
                {actionData?.success === false && (
                  <s-banner tone="critical" heading="Error">
                    {actionData.message}
                  </s-banner>
                )}

                <s-box padding="400" background="bg-surface-secondary" border-radius="200">
                  <pre style={{ overflowX: "auto" }}>{generatedCode}</pre>
                </s-box>

                <s-stack gap="400" vertical>
                  <s-select
                    label="Select Theme"
                    value={selectedTheme}
                    onChange={(e: any) => setSelectedTheme(e.target.value)}
                  >
                    {themeOptions.map((option: any) => (
                      <s-option key={option.value} value={option.value}>
                        {option.label}
                      </s-option>
                    ))}
                  </s-select>
                  <s-text-field
                    label="Section Filename"
                    value={fileName}
                    onInput={(e: any) => setFileName(e.target.value)}
                    suffix=".liquid"
                    autoComplete="off"
                  ></s-text-field>
                  <s-button 
                    loading={isSaving ? "true" : undefined} 
                    onClick={handleSave}
                  >
                    Save to Theme
                  </s-button>
                </s-stack>
              </s-stack>
            </s-card>
          </s-layout-section>
        )}
      </s-layout>
    </s-page>
  );
}
