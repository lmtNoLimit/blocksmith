export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  error?: string;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
}

/**
 * Prompt input field with character counter and validation
 * Minimum 10 characters, maximum 2000 characters
 * Uses Polaris s-text-area component
 */
export function PromptInput({
  value,
  onChange,
  placeholder = 'A hero section with a background image and centered text...',
  helpText = 'Describe the section you want to generate in natural language',
  error,
  disabled = false,
  minLength = 10,
  maxLength = 2000
}: PromptInputProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  // Character counter
  const charCount = value.length;
  const charCountText = `${charCount}/${maxLength} characters`;

  // Validation
  const isValid = charCount === 0 || (charCount >= minLength && charCount <= maxLength);
  const validationError = !isValid
    ? `Prompt must be between ${minLength} and ${maxLength} characters`
    : undefined;

  // Combine help text with character counter
  const displayDetails = !error && !validationError
    ? `${helpText} (${charCountText})`
    : charCountText;

  return (
    <s-text-area
      label="Prompt"
      value={value}
      onInput={handleInput}
      placeholder={placeholder}
      disabled={disabled || undefined}
      rows={6}
      maxLength={maxLength}
      error={error || validationError}
      details={displayDetails}
    />
  );
}
