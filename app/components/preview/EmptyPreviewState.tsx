export interface EmptyPreviewStateProps {
  message?: string;
}

/**
 * Empty state shown when no code is available to preview
 */
export function EmptyPreviewState({
  message = 'Generate a section to see the preview'
}: EmptyPreviewStateProps) {
  return (
    <s-box
      padding="large-400"
      background="subdued"
      borderRadius="base"
      minBlockSize="300px"
    >
      <s-stack gap="base" alignItems="center" justifyContent="center" blockSize="100%">
        <s-icon type="view" />
        <s-text color="subdued">{message}</s-text>
      </s-stack>
    </s-box>
  );
}
