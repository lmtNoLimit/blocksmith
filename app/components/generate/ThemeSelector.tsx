import type { Theme } from '../../types';

export interface ThemeSelectorProps {
  themes: Theme[];
  selectedThemeId: string;
  onChange: (themeId: string) => void;
  disabled?: boolean;
}

/**
 * Theme selection dropdown
 * Uses native select element because s-select web component
 * doesn't render dynamically generated options properly
 */
export function ThemeSelector({
  themes,
  selectedThemeId,
  onChange,
  disabled = false
}: ThemeSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label
        htmlFor="theme-selector"
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#202223'
        }}
      >
        Select Theme
      </label>
      <select
        id="theme-selector"
        value={selectedThemeId}
        onChange={handleChange}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          borderRadius: '8px',
          border: '1px solid #c9cccf',
          backgroundColor: disabled ? '#f6f6f7' : '#fff',
          color: '#202223',
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236d7175' d='M6 8.5L1.5 4h9L6 8.5z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '32px'
        }}
      >
        {themes.length === 0 ? (
          <option value="">No themes available</option>
        ) : (
          themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name} {theme.role === 'MAIN' ? '(Live)' : `(${theme.role})`}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
