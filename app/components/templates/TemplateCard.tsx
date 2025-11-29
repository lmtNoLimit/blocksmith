import type { SectionTemplate } from "@prisma/client";

export interface TemplateCardProps {
  template: SectionTemplate;
  onUse: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/**
 * Card component displaying a single template
 */
export function TemplateCard({
  template,
  onUse,
  onEdit,
  onToggleFavorite,
  onDuplicate,
  onDelete
}: TemplateCardProps) {
  return (
    <s-card>
      <s-stack gap="300" vertical>
        {/* Header with icon and favorite */}
        <s-stack gap="200" distribution="equalSpacing">
          <s-stack gap="200">
            <span style={{ fontSize: '24px' }}>{template.icon}</span>
            <s-text variant="headingSm">{template.title}</s-text>
          </s-stack>
          <s-button
            variant="tertiary"
            size="slim"
            onClick={onToggleFavorite}
            accessibilityLabel={template.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {template.isFavorite ? "★" : "☆"}
          </s-button>
        </s-stack>

        {/* Description */}
        <s-text tone="subdued">{template.description}</s-text>

        {/* Category badge */}
        <s-badge>{template.category}</s-badge>

        {/* Prompt preview */}
        <div
          style={{
            padding: '8px',
            backgroundColor: 'var(--p-color-bg-surface-secondary)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--p-color-text-subdued)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {template.prompt}
        </div>

        {/* Actions */}
        <s-stack gap="200">
          <s-button variant="primary" size="slim" onClick={onUse}>
            Use Template
          </s-button>
          <s-button variant="secondary" size="slim" onClick={onEdit}>
            Edit
          </s-button>
          <s-button variant="tertiary" size="slim" onClick={onDuplicate}>
            Duplicate
          </s-button>
          <s-button variant="tertiary" size="slim" tone="critical" onClick={onDelete}>
            Delete
          </s-button>
        </s-stack>
      </s-stack>
    </s-card>
  );
}
