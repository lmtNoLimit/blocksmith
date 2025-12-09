/**
 * Section Type Selector Component
 * Toggle between "Customizable" and "Production-Ready" section modes
 */

export type SectionType = 'customizable' | 'production-ready';

export interface SectionTypeSelectorProps {
  value: SectionType;
  onChange: (type: SectionType) => void;
  disabled?: boolean;
}

/**
 * Button group for selecting section generation mode
 * - Customizable: Full schema with settings for theme editor customization
 * - Production-Ready: Static content ready to use immediately
 */
export function SectionTypeSelector({
  value,
  onChange,
  disabled = false
}: SectionTypeSelectorProps) {
  return (
    <s-stack gap="small" direction="block">
      <s-text type="strong">Section Type</s-text>
      <s-stack direction="inline" gap="base">
        <s-button
          variant={value === 'customizable' ? 'primary' : 'secondary'}
          onClick={() => onChange('customizable')}
          disabled={disabled || undefined}
        >
          Customizable
        </s-button>
        <s-button
          variant={value === 'production-ready' ? 'primary' : 'secondary'}
          onClick={() => onChange('production-ready')}
          disabled={disabled || undefined}
        >
          Production-Ready
        </s-button>
      </s-stack>
      <s-text color="subdued">
        {value === 'customizable'
          ? 'Full schema with settings for theme editor customization'
          : 'Static content ready to use immediately, no customization needed'}
      </s-text>
    </s-stack>
  );
}
