import type { Section } from "@prisma/client";
import { useState } from "react";

export interface HistoryPreviewModalProps {
  item: Section;
  onClose: () => void;
}

/**
 * Modal preview for history item code
 */
export function HistoryPreviewModal({
  item,
  onClose
}: HistoryPreviewModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const fileName = item.fileName || 'section';
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const blob = new Blob([item.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizedName}.liquid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-preview-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        style={{
          backgroundColor: 'var(--p-color-bg-surface)',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--p-color-border)' }}>
          <s-stack gap="base" justifyContent="space-between" alignItems="center" direction="inline">
            <s-heading>Code Preview</s-heading>
            <s-button variant="tertiary" onClick={onClose}>Close</s-button>
          </s-stack>
        </div>

        {/* Prompt info */}
        <div style={{ padding: '12px 20px', backgroundColor: 'var(--p-color-bg-surface-secondary)' }}>
          <s-text color="subdued">
            Prompt: {item.prompt.substring(0, 150)}{item.prompt.length > 150 ? '...' : ''}
          </s-text>
        </div>

        {/* Saved info */}
        {item.status === 'saved' && item.themeName && (
          <div style={{ padding: '8px 20px', backgroundColor: 'var(--p-color-bg-surface-secondary)' }}>
            <s-text color="subdued">
              Saved to: {item.themeName} / {item.fileName}.liquid
            </s-text>
          </div>
        )}

        {/* Code block */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <pre
            style={{
              margin: 0,
              fontFamily: 'Monaco, Courier, monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {item.code}
          </pre>
        </div>

        {/* Actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--p-color-border)' }}>
          <s-stack gap="base" direction="inline">
            <s-button onClick={handleDownload} variant="secondary">Download</s-button>
            <s-button variant="primary" onClick={handleCopy}>
              {copySuccess ? 'Copied!' : 'Copy Code'}
            </s-button>
          </s-stack>
        </div>
      </div>
    </div>
  );
}
