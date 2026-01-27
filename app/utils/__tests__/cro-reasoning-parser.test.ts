/**
 * Tests for CRO Reasoning Parser
 * Validates parsing of CRO reasoning blocks from AI responses
 */

import {
  parseCROReasoning,
  extractCodeWithoutReasoning,
  hasCROReasoning,
  getPrincipleDisplay,
} from '../cro-reasoning-parser';

describe('CRO Reasoning Parser', () => {
  describe('parseCROReasoning', () => {
    it('parses valid CRO reasoning block', () => {
      const response = `
{% schema %}{"name": "Test"}{% endschema %}
<div>Content</div>

<!-- CRO_REASONING_START -->
{
  "goal": "Reduce Cart Abandonment",
  "decisions": [
    {
      "element": "CTA Placement",
      "choice": "Above-the-fold",
      "principle": "Visual Hierarchy",
      "explanation": "Users see it first",
      "source": "Nielsen Norman Group"
    }
  ],
  "tip": "Test different colors"
}
<!-- CRO_REASONING_END -->
      `;

      const result = parseCROReasoning(response);

      expect(result).not.toBeNull();
      expect(result?.goal).toBe('Reduce Cart Abandonment');
      expect(result?.decisions).toHaveLength(1);
      expect(result?.decisions[0].element).toBe('CTA Placement');
      expect(result?.decisions[0].principle).toBe('Visual Hierarchy');
      expect(result?.decisions[0].source).toBe('Nielsen Norman Group');
      expect(result?.tip).toBe('Test different colors');
    });

    it('parses reasoning with multiple decisions', () => {
      const response = `
<!-- CRO_REASONING_START -->
{
  "goal": "Increase Conversions",
  "decisions": [
    {
      "element": "Urgency",
      "choice": "Countdown timer",
      "principle": "Urgency",
      "explanation": "Creates time pressure"
    },
    {
      "element": "Social Proof",
      "choice": "Customer reviews",
      "principle": "Social Proof",
      "explanation": "Builds trust"
    },
    {
      "element": "Risk Reversal",
      "choice": "Money-back guarantee",
      "principle": "Risk Reversal",
      "explanation": "Reduces purchase anxiety"
    }
  ]
}
<!-- CRO_REASONING_END -->
      `;

      const result = parseCROReasoning(response);

      expect(result).not.toBeNull();
      expect(result?.decisions).toHaveLength(3);
      expect(result?.decisions[0].principle).toBe('Urgency');
      expect(result?.decisions[1].principle).toBe('Social Proof');
      expect(result?.decisions[2].principle).toBe('Risk Reversal');
      expect(result?.tip).toBeUndefined();
    });

    it('returns null for response without reasoning block', () => {
      const response = `
{% schema %}{"name": "Test"}{% endschema %}
<div>Content</div>
      `;

      const result = parseCROReasoning(response);
      expect(result).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      const response = `
<!-- CRO_REASONING_START -->
{ invalid json }
<!-- CRO_REASONING_END -->
      `;

      const result = parseCROReasoning(response);
      expect(result).toBeNull();
    });

    it('returns null for missing goal field', () => {
      const response = `
<!-- CRO_REASONING_START -->
{
  "decisions": [
    {
      "element": "Test",
      "choice": "Test",
      "principle": "Test",
      "explanation": "Test"
    }
  ]
}
<!-- CRO_REASONING_END -->
      `;

      const result = parseCROReasoning(response);
      expect(result).toBeNull();
    });

    it('returns null for missing decisions array', () => {
      const response = `
<!-- CRO_REASONING_START -->
{
  "goal": "Test Goal"
}
<!-- CRO_REASONING_END -->
      `;

      const result = parseCROReasoning(response);
      expect(result).toBeNull();
    });

    it('filters out invalid decisions', () => {
      const response = `
<!-- CRO_REASONING_START -->
{
  "goal": "Test",
  "decisions": [
    {
      "element": "Valid",
      "choice": "Valid",
      "principle": "Valid",
      "explanation": "Valid"
    },
    {
      "element": "Missing choice"
    },
    null,
    "not an object"
  ]
}
<!-- CRO_REASONING_END -->
      `;

      const result = parseCROReasoning(response);

      expect(result).not.toBeNull();
      expect(result?.decisions).toHaveLength(1);
      expect(result?.decisions[0].element).toBe('Valid');
    });

    it('handles extra whitespace in markers', () => {
      const response = `
Code here

<!-- CRO_REASONING_START -->

{
  "goal": "Test",
  "decisions": []
}

<!-- CRO_REASONING_END -->

More code
      `;

      const result = parseCROReasoning(response);

      expect(result).not.toBeNull();
      expect(result?.goal).toBe('Test');
    });
  });

  describe('extractCodeWithoutReasoning', () => {
    it('removes reasoning block from response', () => {
      const response = `
{% schema %}{"name": "Test"}{% endschema %}
<div>Content</div>

<!-- CRO_REASONING_START -->
{"goal": "Test", "decisions": []}
<!-- CRO_REASONING_END -->
      `;

      const result = extractCodeWithoutReasoning(response);

      expect(result).not.toContain('CRO_REASONING_START');
      expect(result).not.toContain('CRO_REASONING_END');
      expect(result).toContain('{% schema %}');
      expect(result).toContain('<div>Content</div>');
    });

    it('returns original if no reasoning block', () => {
      const response = `{% schema %}{"name": "Test"}{% endschema %}`;

      const result = extractCodeWithoutReasoning(response);

      expect(result).toBe(response);
    });

    it('handles multiple reasoning blocks', () => {
      const response = `
Code1
<!-- CRO_REASONING_START -->
{"goal": "A", "decisions": []}
<!-- CRO_REASONING_END -->
Code2
<!-- CRO_REASONING_START -->
{"goal": "B", "decisions": []}
<!-- CRO_REASONING_END -->
Code3
      `;

      const result = extractCodeWithoutReasoning(response);

      expect(result).not.toContain('CRO_REASONING_START');
      expect(result).toContain('Code1');
      expect(result).toContain('Code2');
      expect(result).toContain('Code3');
    });
  });

  describe('hasCROReasoning', () => {
    it('returns true when both markers present', () => {
      const response = `<!-- CRO_REASONING_START -->{}<!-- CRO_REASONING_END -->`;
      expect(hasCROReasoning(response)).toBe(true);
    });

    it('returns false when only start marker', () => {
      const response = `<!-- CRO_REASONING_START -->{}`;
      expect(hasCROReasoning(response)).toBe(false);
    });

    it('returns false when only end marker', () => {
      const response = `{}<!-- CRO_REASONING_END -->`;
      expect(hasCROReasoning(response)).toBe(false);
    });

    it('returns false when no markers', () => {
      const response = `{% schema %}{"name": "Test"}{% endschema %}`;
      expect(hasCROReasoning(response)).toBe(false);
    });
  });

  describe('getPrincipleDisplay', () => {
    it('returns emoji and label for known principles', () => {
      expect(getPrincipleDisplay('urgency')).toEqual({ emoji: '⏰', label: 'Urgency' });
      expect(getPrincipleDisplay('scarcity')).toEqual({ emoji: '🔥', label: 'Scarcity' });
      expect(getPrincipleDisplay('social proof')).toEqual({ emoji: '👥', label: 'Social Proof' });
      expect(getPrincipleDisplay('authority')).toEqual({ emoji: '🏆', label: 'Authority' });
      expect(getPrincipleDisplay('risk reversal')).toEqual({ emoji: '🛡️', label: 'Risk Reversal' });
    });

    it('handles case insensitivity', () => {
      expect(getPrincipleDisplay('URGENCY')).toEqual({ emoji: '⏰', label: 'Urgency' });
      expect(getPrincipleDisplay('Social Proof')).toEqual({ emoji: '👥', label: 'Social Proof' });
      expect(getPrincipleDisplay('RISK REVERSAL')).toEqual({ emoji: '🛡️', label: 'Risk Reversal' });
    });

    it('returns default for unknown principles', () => {
      expect(getPrincipleDisplay('unknown')).toEqual({ emoji: '💡', label: 'unknown' });
      expect(getPrincipleDisplay('custom principle')).toEqual({ emoji: '💡', label: 'custom principle' });
    });
  });
});
