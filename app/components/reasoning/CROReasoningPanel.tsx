/**
 * CROReasoningPanel - Displays CRO design reasoning from AI generation
 * Collapsible panel showing goal, design decisions, and optimization tips
 */
import { useState } from 'react';
import type { CROReasoning } from '../../utils/cro-reasoning-parser';
import { ReasoningDecision } from './ReasoningDecision';

interface CROReasoningPanelProps {
  reasoning: CROReasoning | null;
  defaultCollapsed?: boolean;
}

/**
 * Empty state when no CRO reasoning is available
 */
function EmptyReasoningState() {
  return (
    <s-box
      padding="base"
      background="subdued"
      borderRadius="base"
    >
      <s-stack gap="base" direction="block" alignItems="center">
        <s-icon type="chart-line" />
        <s-text color="subdued">
          No CRO reasoning available. Generate a section using a CRO recipe to see design reasoning.
        </s-text>
      </s-stack>
    </s-box>
  );
}

export function CROReasoningPanel({
  reasoning,
  defaultCollapsed = false,
}: CROReasoningPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // No reasoning - show empty state
  if (!reasoning) {
    return <EmptyReasoningState />;
  }

  return (
    <s-box
      padding="base"
      background="base"
      borderRadius="base"
      borderWidth="small"
      borderColor="subdued"
    >
      <s-stack gap="base" direction="block">
        {/* Header with collapse toggle */}
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-icon type="chart-line" tone="info" />
          <s-heading>CRO Reasoning</s-heading>
          <div style={{ marginLeft: 'auto' }}>
            <s-button
              variant="tertiary"
              onClick={() => setIsCollapsed(!isCollapsed)}
              accessibilityLabel={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {isCollapsed ? 'Expand' : 'Collapse'}
            </s-button>
          </div>
        </s-stack>

        {/* Collapsible content */}
        {!isCollapsed && (
          <s-stack gap="base" direction="block">
            {/* Goal section */}
            <s-box>
              <s-stack gap="small" direction="block">
                <s-paragraph color="subdued">Goal</s-paragraph>
                <s-text type="strong">{reasoning.goal}</s-text>
              </s-stack>
            </s-box>

            {/* Divider */}
            <s-divider />

            {/* Design decisions */}
            <s-box>
              <s-stack gap="small" direction="block">
                <s-paragraph color="subdued">Design Decisions</s-paragraph>
                {reasoning.decisions.map((decision, index) => (
                  <ReasoningDecision key={index} decision={decision} />
                ))}
              </s-stack>
            </s-box>

            {/* Optimization tip */}
            {reasoning.tip && (
              <>
                <s-divider />
                <s-banner tone="info">
                  <s-stack direction="inline" gap="small" alignItems="center">
                    <s-icon type="lightbulb" />
                    <s-text>{reasoning.tip}</s-text>
                  </s-stack>
                </s-banner>
              </>
            )}
          </s-stack>
        )}
      </s-stack>
    </s-box>
  );
}
