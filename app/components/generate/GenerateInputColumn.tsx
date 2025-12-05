import { PromptInput } from "./PromptInput";
import { TemplateSuggestions } from "./TemplateSuggestions";
import { PromptExamples } from "./PromptExamples";
import { AdvancedOptions, type AdvancedOptionsState } from "./AdvancedOptions";

export interface GenerateInputColumnProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  sectionName?: string;
  onSectionNameChange?: (value: string) => void;
  onSectionNameBlur?: () => void;
  advancedOptions: AdvancedOptionsState;
  onAdvancedOptionsChange: (options: AdvancedOptionsState) => void;
  disabled: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
}

/**
 * Primary column for generate screen (following Details pattern)
 * Contains prompt input, templates, examples, and advanced options
 * Uses s-section for proper grouping with headers
 */
export function GenerateInputColumn({
  prompt,
  onPromptChange,
  sectionName,
  onSectionNameChange,
  onSectionNameBlur,
  advancedOptions,
  onAdvancedOptionsChange,
  disabled,
  onGenerate,
  isGenerating,
}: GenerateInputColumnProps) {
  // Validate prompt before enabling generate button (min 10, max 2000 chars)
  const isPromptValid =
    prompt.trim().length >= 10 && prompt.trim().length <= 2000;

  return (
    <>
      {/* Main input section */}
      <s-section heading="Describe your section">
        <s-stack gap="large" direction="block">
          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            disabled={disabled}
          />

          {/* Section name input - optional, auto-generated if empty */}
          {onSectionNameChange && (
            <s-stack gap="small" direction="block">
              <s-text-field
                label="Section Name"
                value={sectionName || ""}
                onInput={(e) => onSectionNameChange((e as unknown as { currentTarget: { value: string } }).currentTarget.value)}
                onBlur={onSectionNameBlur}
                placeholder="Auto-generated from prompt if empty"
                disabled={disabled}
              />
              <s-text color="subdued">A friendly name to identify this section in your history</s-text>
            </s-stack>
          )}

          <AdvancedOptions
            value={advancedOptions}
            onChange={onAdvancedOptionsChange}
            disabled={disabled}
          />

          <s-button
            variant="primary"
            onClick={onGenerate}
            loading={isGenerating || undefined}
            disabled={disabled || !isPromptValid}
          >
            Generate Code
          </s-button>
        </s-stack>
      </s-section>

      {/* Template suggestions */}
      <s-section heading="Quick Start Templates">
        <TemplateSuggestions
          onSelectTemplate={onPromptChange}
          disabled={disabled}
        />
      </s-section>

      {/* Prompt examples */}
      <s-section heading="Example Prompts">
        <PromptExamples onSelectExample={onPromptChange} disabled={disabled} />
      </s-section>
    </>
  );
}
