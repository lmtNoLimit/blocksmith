import type { Theme } from '../../types';

export interface ThemeSelectorProps {
  themes: Theme[];
  selectedThemeId: string;
  onChange: (themeId: string) => void;
  disabled?: boolean;
}

/**
 * Theme selection dropdown
 * Highlights MAIN theme and provides theme role information
 */
export function ThemeSelector({
  themes,
  selectedThemeId,
  onChange,
  disabled = false
}: ThemeSelectorProps) {
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    onChange(target.value);
  };

  return (
    <s-select
      label="Select Theme"
      value={selectedThemeId}
      onChange={handleChange}
      disabled={disabled || undefined}
    >
      {themes.map((theme) => (
        <option key={theme.id} value={theme.id}>
          {theme.name} ({theme.role})
        </option>
      ))}
    </s-select>
  );
}
