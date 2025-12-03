import { PromptInput } from "./PromptInput";
import { TemplateSuggestions } from "./TemplateSuggestions";
import { PromptExamples } from "./PromptExamples";
import { AdvancedOptions, type AdvancedOptionsState } from "./AdvancedOptions";

export interface GenerateInputColumnProps {
  prompt: string;
  onPromptChange: (value: string) => void;
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
