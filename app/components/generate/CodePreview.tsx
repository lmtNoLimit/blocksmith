import { useState } from 'react';

export interface CodePreviewProps {
  code: string;
  maxHeight?: string;
  fileName?: string;
  onCopy?: () => void;
  onDownload?: () => void;
}

/**
 * Enhanced code preview with copy and download buttons
 * Shows generated Liquid code in a formatted, scrollable container
 * Uses proper Polaris components
 */
export function CodePreview({
  code,
  maxHeight = '400px',
  fileName = 'section',
  onCopy,
  onDownload
}: CodePreviewProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!code) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      onCopy?.();

      // Reset success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    // Sanitize filename (replace special chars with dashes)
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9-_]/g, '-');

    // Create blob and download link
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizedName}.liquid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onDownload?.();
  };

  return (
    <s-stack gap="base" direction="block">
      {/* Action buttons */}
      <s-stack gap="small" direction="inline" justifyContent="end">
        <s-button
          onClick={handleCopy}
          variant="secondary"
          icon={copySuccess ? 'check' : 'clipboard'}
        >
          {copySuccess ? 'Copied!' : 'Copy'}
        </s-button>

        <s-button
          onClick={handleDownload}
          variant="secondary"
          icon="download"
        >
          Download
        </s-button>
      </s-stack>

      {/* Code display */}
      <s-box
        padding="base"
        background="subdued"
        borderRadius="base"
      >
        <pre
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight,
            margin: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {code}
        </pre>
      </s-box>
    </s-stack>
  );
}
