import { useState } from 'react';

export interface AdvancedOptionsState {
  tone: 'professional' | 'casual' | 'friendly';
  style: 'minimal' | 'bold' | 'elegant';
  includeSchema: boolean;
}

export interface AdvancedOptionsProps {
  value: AdvancedOptionsState;
  onChange: (options: AdvancedOptionsState) => void;
  disabled?: boolean;
}

/**
 * Collapsible advanced options for generation customization
 * Tone, style, schema settings
 */
export function AdvancedOptions({
  value,
  onChange,
  disabled = false
}: AdvancedOptionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToneChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    onChange({ ...value, tone: target.value as AdvancedOptionsState['tone'] });
  };

  const handleStyleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    onChange({ ...value, style: target.value as AdvancedOptionsState['style'] });
  };

  const handleSchemaChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange({ ...value, includeSchema: target.checked });
  };

  return (
    <s-stack gap="base" direction="block">
      {/* Collapsible trigger */}
      <s-button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="tertiary"
        icon={isExpanded ? 'chevron-up' : 'chevron-down'}
        disabled={disabled || undefined}
        accessibilityLabel={isExpanded ? 'Collapse advanced options' : 'Expand advanced options'}
      >
        Advanced Options
      </s-button>

      {/* Collapsible content */}
      {isExpanded && (
        <s-stack gap="base" direction="block">
          {/* Tone select */}
          <s-select
            label="Tone"
            value={value.tone}
            onChange={handleToneChange}
            disabled={disabled || undefined}
            details="Writing style for generated content"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="friendly">Friendly</option>
          </s-select>

          {/* Style select */}
          <s-select
            label="Style"
            value={value.style}
            onChange={handleStyleChange}
            disabled={disabled || undefined}
            details="Visual aesthetic for the section"
          >
            <option value="minimal">Minimal</option>
            <option value="bold">Bold</option>
            <option value="elegant">Elegant</option>
          </s-select>

          {/* Switch for schema */}
          <s-switch
            label="Include customizable schema settings"
            checked={value.includeSchema || undefined}
            onChange={handleSchemaChange}
            disabled={disabled || undefined}
          />
        </s-stack>
      )}
    </s-stack>
  );
}
