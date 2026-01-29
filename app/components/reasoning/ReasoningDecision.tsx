/**
 * ReasoningDecision - Individual CRO design decision display
 * Shows element, choice, principle badge, and explanation
 */
import type { CRODecision } from '../../utils/cro-reasoning-parser';
import { getPrincipleDisplay } from '../../utils/cro-reasoning-parser';

interface ReasoningDecisionProps {
  decision: CRODecision;
}

/**
 * Map CRO principles to Polaris badge tones
 */
function getPrincipleTone(principle: string): 'info' | 'success' | 'warning' | 'critical' {
  const normalized = principle.toLowerCase().trim();

  // Urgency/scarcity principles - warning tone
  if (['urgency', 'scarcity', 'loss aversion'].includes(normalized)) {
    return 'warning';
  }

  // Trust/authority principles - success tone
  if (['social proof', 'authority', 'trust', 'risk reversal'].includes(normalized)) {
    return 'success';
  }

  // Visual/UX principles - info tone
  return 'info';
}

export function ReasoningDecision({ decision }: ReasoningDecisionProps) {
  const { emoji, label } = getPrincipleDisplay(decision.principle);
  const tone = getPrincipleTone(decision.principle);

  return (
    <s-box
      padding="small"
      background="subdued"
      borderRadius="base"
    >
      <s-stack gap="small" direction="block">
        {/* Header: Principle badge + Element name */}
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-badge tone={tone}>
            {emoji} {label}
          </s-badge>
          <s-text type="strong">{decision.element}</s-text>
        </s-stack>

        {/* Choice - what was chosen */}
        <s-text>{decision.choice}</s-text>

        {/* Explanation + source */}
        <s-paragraph color="subdued">
          {decision.explanation}
          {decision.source && (
            <span style={{ marginLeft: '4px', fontStyle: 'italic' }}>
              ({decision.source})
            </span>
          )}
        </s-paragraph>
      </s-stack>
    </s-box>
  );
}
