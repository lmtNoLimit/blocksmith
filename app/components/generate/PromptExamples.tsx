import { PROMPT_EXAMPLES } from './templates/template-data';

export interface PromptExamplesProps {
  onSelectExample: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Quick prompt examples as clickable chips
 * Click to populate prompt field
 * Uses s-clickable-chip for proper Polaris styling
 */
export function PromptExamples({
  onSelectExample,
  disabled = false
}: PromptExamplesProps) {
  return (
    <s-stack gap="small" direction="inline">
      {PROMPT_EXAMPLES.map((example) => (
        <s-clickable-chip
          key={example.id}
          onClick={() => !disabled && onSelectExample(example.prompt)}
          disabled={disabled || undefined}
        >
          {example.label}
        </s-clickable-chip>
      ))}
    </s-stack>
  );
}
