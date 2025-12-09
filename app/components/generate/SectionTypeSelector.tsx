/**
 * Section Type Selector Component
 * Toggle between "Customizable" and "Production-Ready" section modes
 */

export type SectionType = "customizable" | "production-ready";

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
  disabled = false,
}: SectionTypeSelectorProps) {
  return (
    <s-select
      label="Section Type"
      value={value}
      onChange={(e: Event) => {
        const target = e.target as HTMLSelectElement;
        onChange(target.value as SectionType);
      }}
      disabled={disabled || undefined}
      details={
        value === "customizable"
          ? "Full schema with settings for theme editor customization"
          : "Static content ready to use immediately, no customization needed"
      }
    >
      <s-option value="customizable">Customizable</s-option>
      <s-option value="production-ready">Production-Ready</s-option>
    </s-select>
  );
}
