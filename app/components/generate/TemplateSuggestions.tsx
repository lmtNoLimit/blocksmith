import { SECTION_TEMPLATES, type SectionTemplate } from './templates/template-data';

export interface TemplateSuggestionsProps {
  onSelectTemplate: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Template gallery showing common section types
 * Click to populate prompt with pre-written description
 * Uses s-grid for proper responsive layout
 */
export function TemplateSuggestions({
  onSelectTemplate,
  disabled = false
}: TemplateSuggestionsProps) {
  const handleClick = (template: SectionTemplate) => {
    if (!disabled) {
      onSelectTemplate(template.prompt);
    }
  };

  return (
    <s-grid
      gap="base"
      gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))"
    >
      {SECTION_TEMPLATES.map((template) => (
        <s-clickable
          key={template.id}
          onClick={() => handleClick(template)}
          disabled={disabled || undefined}
          padding="base"
          borderRadius="base"
          border="base"
          borderColor="subdued"
          background="base"
        >
          <s-stack gap="small" direction="block">
            <s-text>{template.icon}</s-text>
            <s-text type="strong">{template.title}</s-text>
            <s-text color="subdued">{template.description}</s-text>
          </s-stack>
        </s-clickable>
      ))}
    </s-grid>
  );
}
