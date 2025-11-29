import type { ReactNode } from "react";

export interface GenerateLayoutProps {
  inputColumn: ReactNode;
  previewColumn: ReactNode;
}

/**
 * Two-column responsive layout for generate screen
 * Following Shopify's Details template pattern:
 * - Primary column (2/3): Main content (prompt, templates)
 * - Secondary column (1/3): Supporting info (preview, save)
 * Uses s-grid for proper responsive behavior
 */
export function GenerateLayout({ inputColumn, previewColumn }: GenerateLayoutProps) {
  return (
    <s-grid
      gap="large"
      gridTemplateColumns="1fr 2fr"
    >
      {/* Primary column: Main creation content */}
      <s-stack gap="large" direction="block">
        {inputColumn}
      </s-stack>

      {/* Secondary column: Preview and save */}
      <s-stack gap="large" direction="block">
        {previewColumn}
      </s-stack>
    </s-grid>
  );
}
