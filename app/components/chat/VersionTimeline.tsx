/**
 * VersionTimeline component - dropdown for quick version navigation
 * Uses Polaris s-select component
 * Shows all versions with timestamps for easy selection
 */
import { memo, useCallback } from 'react';
import type { CodeVersion } from '../../types';

export interface VersionTimelineProps {
  versions: CodeVersion[];
  selectedVersionId: string | null;
  onSelect: (versionId: string | null) => void;
}

/**
 * Format date to short time string
 */
function formatTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Dropdown showing all versions for quick navigation
 * "Current draft" option clears selection
 */
export const VersionTimeline = memo(function VersionTimeline({
  versions,
  selectedVersionId,
  onSelect,
}: VersionTimelineProps) {
  // Hook must be called before any early returns (React rules of hooks)
  const handleChange = useCallback((e: Event) => {
    const target = e.currentTarget as HTMLSelectElement;
    const value = target.value;
    onSelect(value || null);
  }, [onSelect]);

  if (versions.length === 0) return null;


  // Build options for s-select
  const options = [
    { label: 'Current draft', value: '' },
    ...versions.map((v) => ({
      label: `v${v.versionNumber} - ${formatTime(v.createdAt)}`,
      value: v.id,
    })),
  ];

  return (
    <s-stack direction="inline" gap="small-100" alignItems="center">
      <s-select
        label="Select version"
        icon="clock"
        labelAccessibilityVisibility="exclusive"
        value={selectedVersionId || ''}
        onChange={handleChange}
      >
        {options.map((opt) => (
          <s-option key={opt.value} value={opt.value}>
            {opt.label}
          </s-option>
        ))}
      </s-select>
      {/* {versions.length > 0 && (
        <s-badge tone={selectedVersionId ? 'info' : 'success'}>
          {displayLabel}
        </s-badge>
      )} */}
    </s-stack>
  );
});
