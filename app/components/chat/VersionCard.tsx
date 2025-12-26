/**
 * VersionCard component - displays version info with icon actions
 * Shows version number, relative time, and preview/restore actions
 */
import { memo } from 'react';

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
 * Eye icon SVG for preview action
 */
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3C4.36 3 1.26 5.28 0 8.5c1.26 3.22 4.36 5.5 8 5.5s6.74-2.28 8-5.5C14.74 5.28 11.64 3 8 3zm0 9.17c-1.84 0-3.33-1.49-3.33-3.33S6.16 5.5 8 5.5s3.33 1.49 3.33 3.33S9.84 12.17 8 12.17zm0-5.34c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>
  );
}

/**
 * Return/restore icon SVG for restore action
 */
function RestoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3v2.5L4 2.5 8 0v2c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l-1.46-1.46c.1-.42.16-.86.16-1.34 0-2.21-1.79-4-4-4zm0 10c-2.21 0-4-1.79-4-4 0-.48.06-.92.16-1.34L2.7 6.2C2.25 7.03 2 7.99 2 9c0 3.31 2.69 6 6 6v2l4-3-4-3v1z"/>
    </svg>
  );
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

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview();
  };

  const handleRestoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestore();
  };

  const cardClasses = [
    'version-card',
    isActive ? 'version-card--active' : '',
    isSelected ? 'version-card--selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      <div className="version-card__info">
        <span className="version-card__number">v{versionNumber}</span>
        <span className="version-card__separator">•</span>
        <span className="version-card__time">{relativeTime}</span>
      </div>
      <div className="version-card__actions">
        <button
          type="button"
          className={`version-card__icon ${isSelected ? 'version-card__icon--active' : ''}`}
          onClick={handlePreviewClick}
          aria-label={isSelected ? 'Currently previewing' : 'Preview this version'}
          aria-pressed={isSelected}
        >
          <EyeIcon />
        </button>
        <button
          type="button"
          className="version-card__icon"
          onClick={handleRestoreClick}
          aria-label="Restore this version"
          disabled={isActive}
        >
          <RestoreIcon />
        </button>
      </div>
    </div>
  );
});
