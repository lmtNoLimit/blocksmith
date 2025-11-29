export interface SectionNameInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Section filename input
 * Shows filename preview with .liquid extension
 */
export function SectionNameInput({
  value,
  onChange,
  error
}: SectionNameInputProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  return (
    <s-text-field
      label="Section Filename"
      value={value}
      onInput={handleInput}
      autoComplete="off"
      suffix=".liquid"
      error={error}
    />
  );
}
