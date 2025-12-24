/**
 * Loading skeleton for preview component
 */
export function PreviewSkeleton() {
  return (
    <s-stack gap="base">
      {/* Toolbar skeleton */}
      <s-stack direction="inline" justifyContent="space-between" alignItems="center" padding="small none">
        <s-stack direction="inline" gap="small">
          <s-box background="subdued" borderRadius="small" inlineSize="60px" blockSize="28px" />
          <s-box background="subdued" borderRadius="small" inlineSize="60px" blockSize="28px" />
          <s-box background="subdued" borderRadius="small" inlineSize="60px" blockSize="28px" />
        </s-stack>
        <s-box background="subdued" borderRadius="small" inlineSize="80px" blockSize="28px" />
      </s-stack>

      {/* Preview frame skeleton */}
      <s-box
        background="subdued"
        borderRadius="base"
        padding="base"
        minBlockSize="400px"
      >
        <s-stack gap="base" alignItems="center" justifyContent="center" blockSize="100%">
          <s-spinner size="large" />
          <s-text color="subdued">Rendering preview...</s-text>
        </s-stack>
      </s-box>
    </s-stack>
  );
}
