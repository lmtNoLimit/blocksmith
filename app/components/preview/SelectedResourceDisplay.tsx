/**
 * Selected Resource Display Component
 * Shows thumbnail, title, and clear button for a selected resource
 */

interface SelectedResourceDisplayProps {
  title: string;
  image?: string;
  onClear: () => void;
  disabled?: boolean;
}

/**
 * SelectedResourceDisplay - Compact display of a selected resource
 * Shows thumbnail, title, and clear button
 */
export function SelectedResourceDisplay({
  title,
  image,
  onClear,
  disabled
}: SelectedResourceDisplayProps) {
  return (
    <s-stack gap="small" direction="inline" alignItems="center">
      {/* Thumbnail */}
      {image && (
        <s-thumbnail
          src={image}
          alt={title}
          size="small"
        />
      )}

      {/* Title (truncated) */}
      <s-text>
        {title.length > 30 ? `${title.substring(0, 30)}...` : title}
      </s-text>

      {/* Clear button */}
      <s-button
        variant="tertiary"
        onClick={onClear}
        disabled={disabled || undefined}
        accessibilityLabel={`Clear ${title} selection`}
        icon="x"
      />
    </s-stack>
  );
}
