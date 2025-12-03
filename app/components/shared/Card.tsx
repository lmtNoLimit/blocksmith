import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  children: ReactNode;
  sectioned?: boolean;
}

/**
 * Wrapper for Polaris s-section web component
 * Provides consistent card layout and styling
 */
export function Card({ title, children }: CardProps) {
  return (
    <s-section heading={title}>
      {children}
    </s-section>
  );
}
