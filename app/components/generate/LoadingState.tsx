export interface LoadingStateProps {
  message: string;
  subMessage?: string;
  size?: 'base' | 'large' | 'large-100';
}

/**
 * Loading state with spinner and message
 * Used during generation or save operations
 * Uses proper Polaris components
 */
export function LoadingState({
  message,
  subMessage,
  size = 'large'
}: LoadingStateProps) {
  return (
    <s-box padding="large-200">
      <s-stack gap="base" direction="block" alignItems="center">
        <s-spinner size={size} accessibilityLabel="Loading" />
        <s-paragraph color="subdued">{message}</s-paragraph>
        {subMessage && (
          <s-text color="subdued">{subMessage}</s-text>
        )}
      </s-stack>
    </s-box>
  );
}
