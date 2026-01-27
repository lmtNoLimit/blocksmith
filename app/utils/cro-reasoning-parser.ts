/**
 * CRO Reasoning Parser
 * Parses structured CRO reasoning from AI responses
 * Used to extract design decisions and explanations from generated sections
 */

/**
 * Single CRO design decision with psychological principle reference
 */
export interface CRODecision {
  element: string;      // Design element name (e.g., "CTA Placement")
  choice: string;       // What was chosen (e.g., "Above-the-fold")
  principle: string;    // CRO principle applied (e.g., "Visual Hierarchy")
  explanation: string;  // Why this works psychologically
  source?: string;      // Reference source (e.g., "Nielsen Norman Group")
}

/**
 * Complete CRO reasoning block from AI response
 */
export interface CROReasoning {
  goal: string;             // Recipe goal (e.g., "Reduce Cart Abandonment")
  decisions: CRODecision[]; // Array of design decisions (typically 3-5)
  tip?: string;             // A/B testing suggestion or optimization tip
}

// Markers for reasoning block in AI response
const CRO_REASONING_START = '<!-- CRO_REASONING_START -->';
const CRO_REASONING_END = '<!-- CRO_REASONING_END -->';

/**
 * Parse CRO reasoning block from AI response
 * Returns null if no valid reasoning block found
 *
 * @param response - Full AI response text
 * @returns Parsed CROReasoning object or null
 */
export function parseCROReasoning(response: string): CROReasoning | null {
  const startIndex = response.indexOf(CRO_REASONING_START);
  const endIndex = response.indexOf(CRO_REASONING_END);

  // No reasoning block found
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  // Extract JSON content between markers
  const jsonStr = response
    .substring(startIndex + CRO_REASONING_START.length, endIndex)
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.goal || !Array.isArray(parsed.decisions)) {
      console.warn('[cro-reasoning-parser] Invalid reasoning structure: missing goal or decisions');
      return null;
    }

    // Validate and filter decisions
    const validDecisions: CRODecision[] = parsed.decisions
      .filter((d: unknown): d is CRODecision => {
        if (!d || typeof d !== 'object') return false;
        const decision = d as Record<string, unknown>;
        return (
          typeof decision.element === 'string' &&
          typeof decision.choice === 'string' &&
          typeof decision.principle === 'string' &&
          typeof decision.explanation === 'string'
        );
      })
      .map((d: CRODecision) => ({
        element: d.element,
        choice: d.choice,
        principle: d.principle,
        explanation: d.explanation,
        source: typeof d.source === 'string' ? d.source : undefined,
      }));

    return {
      goal: String(parsed.goal),
      decisions: validDecisions,
      tip: typeof parsed.tip === 'string' ? parsed.tip : undefined,
    };
  } catch (error) {
    console.error('[cro-reasoning-parser] Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Extract code from response without CRO reasoning block
 * Used when storing section code (reasoning stored separately)
 *
 * @param response - Full AI response text
 * @returns Response with reasoning block removed
 */
export function extractCodeWithoutReasoning(response: string): string {
  // Create regex to match reasoning block with any whitespace
  const reasoningPattern = new RegExp(
    `${escapeRegex(CRO_REASONING_START)}[\\s\\S]*?${escapeRegex(CRO_REASONING_END)}`,
    'g'
  );

  return response
    .replace(reasoningPattern, '')
    .trim();
}

/**
 * Check if response contains CRO reasoning block
 *
 * @param response - Full AI response text
 * @returns True if reasoning block markers are present
 */
export function hasCROReasoning(response: string): boolean {
  return (
    response.includes(CRO_REASONING_START) &&
    response.includes(CRO_REASONING_END)
  );
}

/**
 * Get CRO principle display name with emoji
 * Used for UI rendering
 */
export function getPrincipleDisplay(principle: string): { emoji: string; label: string } {
  const principleMap: Record<string, { emoji: string; label: string }> = {
    'urgency': { emoji: '⏰', label: 'Urgency' },
    'scarcity': { emoji: '🔥', label: 'Scarcity' },
    'social proof': { emoji: '👥', label: 'Social Proof' },
    'authority': { emoji: '🏆', label: 'Authority' },
    'reciprocity': { emoji: '🎁', label: 'Reciprocity' },
    'visual hierarchy': { emoji: '👁️', label: 'Visual Hierarchy' },
    'f-pattern': { emoji: '📖', label: 'F-Pattern' },
    'contrast': { emoji: '🎯', label: 'Contrast' },
    'whitespace': { emoji: '⬜', label: 'Whitespace' },
    'risk reversal': { emoji: '🛡️', label: 'Risk Reversal' },
    'anchoring': { emoji: '⚓', label: 'Anchoring' },
    'loss aversion': { emoji: '💔', label: 'Loss Aversion' },
  };

  const normalized = principle.toLowerCase().trim();
  return principleMap[normalized] || { emoji: '💡', label: principle };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
