export interface EmptyStateProps {
  heading: string;
  message: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Empty state for preview column
 * Displayed when no code generated yet
 * Follows Shopify's empty state pattern
 */
export function EmptyState({
  heading,
  message,
  icon = '📝',
  action
}: EmptyStateProps) {
  return (
    <s-box
      padding="large-200"
      background="subdued"
      borderRadius="base"
    >
      <s-stack gap="base" direction="block" alignItems="center">
        <s-text>{icon}</s-text>
        <s-heading>{heading}</s-heading>
        <s-paragraph color="subdued">{message}</s-paragraph>
        {action && (
          <s-button onClick={action.onClick} variant="secondary">
            {action.label}
          </s-button>
        )}
      </s-stack>
    </s-box>
  );
}
