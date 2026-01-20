/**
 * ElementInfoPanel - Displays selected element details with edit action
 * Shows tag, classes, text preview, and path breadcrumb
 */
import type { SelectedElementInfo } from './types';

export interface ElementInfoPanelProps {
  element: SelectedElementInfo;
  onEdit: () => void;
  onClear: () => void;
}

const monoStyle = { fontFamily: 'ui-monospace, SFMono-Regular, monospace' };
const truncateStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const };

export function ElementInfoPanel({ element, onEdit, onClear }: ElementInfoPanelProps) {
  // Format class names for display
  const displayClasses = element.className
    ? element.className.split(' ').slice(0, 3).join(' ')
    : null;

  return (
    <s-box
      padding="base"
      background="subdued"
      borderWidth="small"
      borderColor="subdued"
      borderRadius="base"
    >
      <s-stack direction="block" gap="small">
        {/* Breadcrumb path */}
        <span style={{ ...monoStyle, color: 'var(--p-color-text-subdued)', fontSize: '12px' }}>
          {element.path.join(' › ')}
        </span>

        {/* Element tag and class */}
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-badge tone="success">&lt;{element.tagName}&gt;</s-badge>
          {displayClasses && (
            <span style={{ ...monoStyle, color: 'var(--p-color-text-subdued)', fontSize: '12px' }}>
              .{displayClasses.split(' ')[0]}
            </span>
          )}
        </s-stack>

        {/* Text content preview */}
        {element.textContent && (
          <s-box
            padding="small"
            background="base"
            borderRadius="small"
            borderWidth="small"
            borderColor="subdued"
          >
            <span style={{ ...truncateStyle, color: 'var(--p-color-text-subdued)', display: 'block' }}>
              &quot;{element.textContent}&quot;
            </span>
          </s-box>
        )}

        {/* Action buttons */}
        <s-stack direction="inline" gap="small">
          <s-button variant="primary" onClick={onEdit}>
            Edit this element
          </s-button>
          <s-button variant="tertiary" onClick={onClear}>
            Clear
          </s-button>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
