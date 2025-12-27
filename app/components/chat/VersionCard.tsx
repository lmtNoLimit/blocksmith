/**
 * VersionCard component - displays version info with icon actions
 * Uses Polaris components for layout and buttons
 * Shows version number, relative time, and preview/restore actions
 */
import { memo, useCallback } from 'react';

export interface VersionCardProps {
  versionNumber: number;
  createdAt: Date;
  isActive: boolean;      // This version is current active draft
  isSelected: boolean;    // Currently previewing this version
  onPreview: () => void;  // Eye icon - temporary preview
  onRestore: () => void;  // Return icon - apply with dirty check
}

/**
 * Get relative time string from date
 * Native implementation avoids date-fns dependency
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Version card with info and action buttons
 * Shows version number, relative time, preview and restore actions
 */
export const VersionCard = memo(function VersionCard({
  versionNumber,
  createdAt,
  isActive,
  isSelected,
  onPreview,
  onRestore,
}: VersionCardProps) {
  const relativeTime = getRelativeTime(createdAt);

  const handlePreviewClick = useCallback((e: Event) => {
    e.stopPropagation();
    onPreview();
  }, [onPreview]);

  const handleRestoreClick = useCallback((e: Event) => {
    e.stopPropagation();
    onRestore();
  }, [onRestore]);

  // Build class names for styling
  const cardClasses = [
    'chat-version-card',
    isActive && 'chat-version-card--active',
    isSelected && 'chat-version-card--selected',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      <s-box
        padding="small base"
        borderRadius="large"
        borderWidth="small"
        borderColor={isSelected ? 'strong' : 'subdued'}
      >
        <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
          {/* Version info with badge */}
          <s-stack direction="inline" gap="small" alignItems="center">
            <span className="chat-version-badge">
              <s-icon type="code" />
              v{versionNumber}
            </span>
            <s-text color="subdued">{relativeTime}</s-text>
            {isActive && (
              <s-badge tone="success">Active</s-badge>
            )}
          </s-stack>

          {/* Action buttons */}
          <s-stack direction="inline" gap="small-100" alignItems="center">
            <s-button
              variant={isSelected ? 'secondary' : 'tertiary'}
              icon="view"
              onClick={handlePreviewClick}
              accessibilityLabel={isSelected ? 'Currently previewing' : 'Preview this version'}
            >
              {isSelected ? 'Viewing' : 'Preview'}
            </s-button>
            {!isActive && (
              <s-button
                variant="primary"
                icon="reset"
                onClick={handleRestoreClick}
                accessibilityLabel="Restore this version"
              >
                Restore
              </s-button>
            )}
          </s-stack>
        </s-stack>
      </s-box>
    </div>
  );
});
