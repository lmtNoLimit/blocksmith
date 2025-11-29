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

  // Status display
  const isSaved = item.status === 'saved';

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'var(--p-color-bg-surface-secondary)',
        borderRadius: '8px',
      }}
    >
      <s-stack gap="base" direction="block">
        {/* Header row */}
        <s-stack gap="small" distribution="equalSpacing">
          <s-stack gap="small">
            {item.isFavorite && <span>⭐</span>}
            <s-text variant="bodySm" color="subdued">
              {formattedDate}
            </s-text>
            {isSaved ? (
              <s-text variant="bodySm" tone="success">
                ✓ Saved
              </s-text>
            ) : (
              <s-text variant="bodySm" color="subdued">
                Generated
              </s-text>
            )}
          </s-stack>

          {/* Metadata badges */}
          {(item.tone || item.style) && (
            <s-stack gap="small">
              {item.tone && (
                <s-text variant="bodySm" color="subdued">
                  {item.tone}
                </s-text>
              )}
              {item.style && (
                <s-text variant="bodySm" color="subdued">
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
          <s-text variant="bodySm" color="subdued">
            Saved to: {item.themeName} / {item.fileName}.liquid
          </s-text>
        )}

        {/* Actions */}
        <s-stack gap="small" direction="inline">
          <s-button onClick={onPreview}>
            Preview Code
          </s-button>
          <s-button
            variant="plain"
            onClick={onToggleFavorite}
          >
            {item.isFavorite ? 'Unfavorite' : 'Favorite'}
          </s-button>
          <s-button
            variant="plain"
            tone="critical"
            onClick={onDelete}
          >
            Delete
          </s-button>
        </s-stack>
      </s-stack>
    </div>
  );
}
