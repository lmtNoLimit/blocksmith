/**
 * Settings page - User preferences for section generation defaults
 */

import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  useLoaderData,
  useSubmit,
  useActionData,
  useNavigation,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { settingsService } from "../services/settings.server";

interface AppPreferences {
  defaultTone: string;
  defaultStyle: string;
  autoSaveEnabled: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const settings = await settingsService.get(session.shop);

  return {
    preferences: {
      defaultTone: settings?.defaultTone ?? "professional",
      defaultStyle: settings?.defaultStyle ?? "minimal",
      autoSaveEnabled: settings?.autoSaveEnabled ?? false,
    } as AppPreferences,
  };
}

// Valid enum values for preferences
const VALID_TONES = ["professional", "casual", "friendly"] as const;
const VALID_STYLES = ["minimal", "bold", "elegant"] as const;

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "savePreferences") {
    const defaultTone = formData.get("defaultTone") as string;
    const defaultStyle = formData.get("defaultStyle") as string;
    const autoSaveEnabled = formData.get("autoSaveEnabled") === "true";

    // Validate inputs against allowed values
    if (!VALID_TONES.includes(defaultTone as (typeof VALID_TONES)[number])) {
      return { success: false, error: "Invalid tone value" };
    }
    if (!VALID_STYLES.includes(defaultStyle as (typeof VALID_STYLES)[number])) {
      return { success: false, error: "Invalid style value" };
    }

    await settingsService.updatePreferences(session.shop, {
      defaultTone,
      defaultStyle,
      autoSaveEnabled,
    });

    // Mark onboarding step 3 as complete
    await settingsService.markSettingsConfigured(session.shop);

    return { success: true, message: "Settings saved!" };
  }

  return { success: false };
}

export default function SettingsPage() {
  const { preferences } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const isSubmitting = navigation.state === "submitting";

  const [tone, setTone] = useState(preferences.defaultTone);
  const [style, setStyle] = useState(preferences.defaultStyle);
  const [autoSave, setAutoSave] = useState(preferences.autoSaveEnabled);

  // Show toast on save result
  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Settings saved!");
    } else if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    }
  }, [actionData?.success, actionData?.error, shopify]);

  const handleToneChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    setTone(target.value);
  };

  const handleStyleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    setStyle(target.value);
  };

  const handleAutoSaveChange = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    setAutoSave(target.checked);
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("intent", "savePreferences");
    formData.append("defaultTone", tone);
    formData.append("defaultStyle", style);
    formData.append("autoSaveEnabled", String(autoSave));
    submit(formData, { method: "post" });
  };

  return (
    <s-page heading="Settings" inlineSize="small">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        loading={isSubmitting || undefined}
      >
        Save Settings
      </s-button>

      <s-stack gap="large" direction="block">
        {/* Generation Defaults */}
        <s-section heading="Generation Defaults">
          <s-stack gap="base" direction="block">
            <s-select
              label="Default Tone"
              value={tone}
              onChange={handleToneChange}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
            </s-select>

            <s-select
              label="Default Style"
              value={style}
              onChange={handleStyleChange}
            >
              <option value="minimal">Minimal</option>
              <option value="bold">Bold</option>
              <option value="elegant">Elegant</option>
            </s-select>
          </s-stack>
        </s-section>

        {/* Auto-Save Toggle */}
        <s-section heading="Behavior">
          <s-checkbox
            label="Auto-save sections after generation"
            checked={autoSave || undefined}
            onChange={handleAutoSaveChange}
          />
        </s-section>
      </s-stack>
    </s-page>
  );
}
