import type { ReactNode } from 'react';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'plain' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  submit?: boolean;
  fullWidth?: boolean;
}

/**
 * Wrapper for Polaris s-button web component
 * Provides type-safe props and consistent button styling
 */
export function Button({
  children,
  variant = 'secondary',
  loading = false,
  disabled = false,
  onClick,
  submit = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fullWidth = false
}: ButtonProps) {
  // Note: fullWidth not directly supported by s-button, use wrapper if needed
  return (
    <s-button
      variant={variant}
      loading={loading ? 'true' : undefined}
      disabled={disabled}
      onClick={onClick}
      submit={submit}
    >
      {children}
    </s-button>
  );
}
