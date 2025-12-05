import type { Section } from "@prisma/client";

export interface HistoryTableProps {
  items: Section[];
  onPreview: (item: Section) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Table component for history items using Polaris s-table
 */
export function HistoryTable({
  items,
  onPreview,
  onToggleFavorite,
  onDelete
}: HistoryTableProps) {
  return (
    <s-table>
      <s-table-header-row>
        <s-table-header listSlot="primary">Prompt</s-table-header>
        <s-table-header>Status</s-table-header>
        <s-table-header>Options</s-table-header>
        <s-table-header>Date</s-table-header>
        <s-table-header>Actions</s-table-header>
      </s-table-header-row>
      <s-table-body>
        {items.map((item) => (
          <s-table-row key={item.id}>
            <s-table-cell>
              <s-stack gap="small" direction="inline" alignItems="center">
                {item.isFavorite && <s-badge tone="warning">Fav</s-badge>}
                <s-text>
                  {item.prompt.length > 80
                    ? `${item.prompt.substring(0, 80)}...`
                    : item.prompt}
                </s-text>
              </s-stack>
            </s-table-cell>
            <s-table-cell>
              {item.status === "saved" ? (
                <s-badge tone="success">Saved</s-badge>
              ) : (
                <s-badge tone="neutral">Generated</s-badge>
              )}
            </s-table-cell>
            <s-table-cell>
              <s-stack gap="small" direction="inline">
                {item.tone && <s-badge>{item.tone}</s-badge>}
                {item.style && <s-badge>{item.style}</s-badge>}
                {!item.tone && !item.style && <s-text color="subdued">-</s-text>}
              </s-stack>
            </s-table-cell>
            <s-table-cell>
              <s-text color="subdued">
                {formatDate(item.createdAt)}
              </s-text>
            </s-table-cell>
            <s-table-cell>
              <s-stack gap="small" direction="inline" alignItems="end">
                <s-button onClick={() => onPreview(item)}>Preview</s-button>
                <s-button onClick={() => onToggleFavorite(item.id)}>
                  {item.isFavorite ? "Unfav" : "Fav"}
                </s-button>
                <s-button tone="critical" onClick={() => onDelete(item.id)}>Delete</s-button>
              </s-stack>
            </s-table-cell>
          </s-table-row>
        ))}
      </s-table-body>
    </s-table>
  );
}
