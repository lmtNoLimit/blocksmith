import type { GenerationHistory } from "@prisma/client";
import { HistoryItem } from "./HistoryItem";

export interface HistoryListProps {
  items: GenerationHistory[];
  onPreview: (item: GenerationHistory) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * List of history items with actions
 */
export function HistoryList({
  items,
  onPreview,
  onToggleFavorite,
  onDelete
}: HistoryListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <s-stack gap="300" vertical>
      {items.map((item) => (
        <HistoryItem
          key={item.id}
          item={item}
          onPreview={() => onPreview(item)}
          onToggleFavorite={() => onToggleFavorite(item.id)}
          onDelete={() => onDelete(item.id)}
        />
      ))}
    </s-stack>
  );
}
