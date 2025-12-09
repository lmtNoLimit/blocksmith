import type { SectionTemplate } from "@prisma/client";

export interface TemplateCardProps {
  template: SectionTemplate;
  onUseAsIs: () => void;      // Use pre-built code (instant)
  onCustomize: () => void;    // Use prompt for AI generation
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/**
 * Card component displaying a single template with Polaris patterns
 * Shows "Use As-Is" for templates with code, "Customize" for AI generation
 */
export function TemplateCard({
  template,
  onUseAsIs,
  onCustomize,
  onEdit: _onEdit,           // Reserved for future user templates
  onToggleFavorite,
  onDuplicate: _onDuplicate, // Reserved for future user templates
  onDelete: _onDelete        // Reserved for future user templates
}: TemplateCardProps) {
  const hasCode = Boolean(template.code);

  return (
    <s-box
      padding="base"
      borderRadius="base"
      border="base"
      background="base"
    >
      <s-stack gap="base" direction="block">
        {/* Header with icon, title, and badges */}
        <s-stack gap="small" justifyContent="space-between" alignItems="start" direction="inline">
          <s-stack gap="small" direction="inline" alignItems="center">
            <span style={{ fontSize: '28px', lineHeight: 1 }}>{template.icon}</span>
            <s-stack gap="none" direction="block">
              <s-text type="strong">{template.title}</s-text>
              <s-stack gap="small" direction="inline">
                <s-badge tone="neutral">{template.category}</s-badge>
                {hasCode ? (
                  <s-badge tone="success">Ready to Use</s-badge>
                ) : (
                  <s-badge tone="info">AI Only</s-badge>
                )}
              </s-stack>
            </s-stack>
          </s-stack>
          <s-button
            variant="tertiary"
            onClick={onToggleFavorite}
            accessibilityLabel={template.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <span style={{ fontSize: '16px' }}>{template.isFavorite ? '⭐' : '☆'}</span>
          </s-button>
        </s-stack>

        {/* Description */}
        <s-text color="subdued">{template.description}</s-text>

        {/* Code preview or prompt preview */}
        <s-box
          padding="small"
          background="subdued"
          borderRadius="base"
        >
          {hasCode ? (
            <s-stack gap="small" direction="block">
              <s-text color="subdued" type="strong">Preview:</s-text>
              <s-text color="subdued">
                {template.code!.substring(0, 100).replace(/\s+/g, ' ')}...
              </s-text>
            </s-stack>
          ) : (
            <s-text color="subdued">
              {template.prompt.length > 80
                ? `${template.prompt.substring(0, 80)}...`
                : template.prompt}
            </s-text>
          )}
        </s-box>

        {/* Primary Actions - Use/Customize only (system templates) */}
        {/* Note: Edit/Duplicate/Delete actions reserved for future user templates */}
        <s-stack gap="small" direction="inline">
          {hasCode && (
            <s-button variant="primary" onClick={onUseAsIs}>
              Use As-Is
            </s-button>
          )}
          <s-button
            variant={hasCode ? "secondary" : "primary"}
            onClick={onCustomize}
          >
            {hasCode ? "Customize with AI" : "Generate with AI"}
          </s-button>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
