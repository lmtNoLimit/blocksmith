import type { GenerationHistory } from "@prisma/client";

export interface HistoryItemProps {
  item: GenerationHistory;
  onPreview: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

/**
 * Individual history item display
 * Shows prompt preview, status, timestamp, and actions
 */
export function HistoryItem({
  item,
  onPreview,
  onToggleFavorite,
  onDelete
}: HistoryItemProps) {
  // Truncate prompt for display
  const promptPreview = item.prompt.length > 100
    ? `${item.prompt.substring(0, 100)}...`
    : item.prompt;

  // Format date
  const date = new Date(item.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Status badge color
  const statusTone = item.status === 'saved' ? 'success' : 'subdued';

  return (
    <s-box padding="400" background="bg-surface-secondary" border-radius="200">
      <s-stack gap="300" vertical>
        {/* Header row */}
        <s-stack gap="200" distribution="equalSpacing">
          <s-stack gap="200">
            {item.isFavorite && <span>⭐</span>}
            <s-text variant="bodySm" tone="subdued">
              {formattedDate}
            </s-text>
            <s-text variant="bodySm" tone={statusTone}>
              {item.status === 'saved' ? '✓ Saved' : 'Generated'}
            </s-text>
          </s-stack>

          {/* Metadata badges */}
          {(item.tone || item.style) && (
            <s-stack gap="100">
              {item.tone && (
                <s-text variant="bodySm" tone="subdued">
                  {item.tone}
                </s-text>
              )}
              {item.style && (
                <s-text variant="bodySm" tone="subdued">
                  {item.style}
                </s-text>
              )}
            </s-stack>
          )}
        </s-stack>

        {/* Prompt preview */}
        <s-text variant="bodyMd">
          {promptPreview}
        </s-text>

        {/* Saved info */}
        {item.status === 'saved' && item.themeName && (
          <s-text variant="bodySm" tone="subdued">
            Saved to: {item.themeName} / {item.fileName}.liquid
          </s-text>
        )}

        {/* Actions */}
        <s-stack gap="200">
          <s-button size="slim" onClick={onPreview}>
            Preview Code
          </s-button>
          <s-button
            size="slim"
            variant="plain"
            onClick={onToggleFavorite}
          >
            {item.isFavorite ? 'Unfavorite' : 'Favorite'}
          </s-button>
          <s-button
            size="slim"
            variant="plain"
            tone="critical"
            onClick={onDelete}
          >
            Delete
          </s-button>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
