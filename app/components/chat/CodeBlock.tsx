/**
 * CodeBlock component for displaying syntax-highlighted code
 * Uses Polaris components with minimal custom styling for code display
 * Features: copy button, line numbers, language label
 */
import { useState, useCallback } from 'react';

import type { CompletionStatus } from '../../types';

export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  // Completion status for badges
  completionStatus?: CompletionStatus;
}

// Minimal inline styles for code block (dark theme not in Polaris)
const codeBlockStyle = {
  background: '#1e1e1e',
  borderRadius: 'var(--p-border-radius-200)',
  overflow: 'hidden',
  fontSize: '13px',
};

const codePreStyle = {
  margin: 0,
  padding: 'var(--p-space-300)',
  overflowX: 'auto' as const,
  color: '#d4d4d4',
  fontFamily: "'SF Mono', Monaco, Consolas, 'Courier New', monospace",
};

const lineStyle = {
  display: 'flex',
};

const lineNumberStyle = {
  color: '#5a5a5a',
  width: '3ch',
  flexShrink: 0,
  textAlign: 'right' as const,
  marginRight: 'var(--p-space-300)',
  userSelect: 'none' as const,
};

export function CodeBlock({
  code,
  language = 'liquid',
  showLineNumbers = true,
  completionStatus,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  const lines = code.split('\n');

  return (
    <div style={codeBlockStyle}>
      {/* Header with language, status badge, and copy button */}
      <s-box
        padding="small"
        background="strong"
        borderWidth="none none small none"
        borderColor="subdued"
      >
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-text color="subdued">{language.toUpperCase()}</s-text>
            {/* Completion status badges */}
            {completionStatus === 'potentially-incomplete' && (
              <s-tooltip id="incomplete-tooltip">
                <span slot="content">AI output may be incomplete. Some code may be missing.</span>
                <s-badge tone="warning">Potentially Incomplete</s-badge>
              </s-tooltip>
            )}
          </s-stack>
          <s-button
            variant="tertiary"
            onClick={handleCopy}
            icon={copied ? 'check' : 'clipboard'}
          >
            {copied ? 'Copied' : 'Copy'}
          </s-button>
        </s-stack>
      </s-box>

      {/* Code content */}
      <pre style={codePreStyle}>
        <code>
          {showLineNumbers ? (
            lines.map((line, i) => (
              <div key={i} style={lineStyle}>
                <span style={lineNumberStyle}>{i + 1}</span>
                <span>{line}</span>
              </div>
            ))
          ) : (
            code
          )}
        </code>
      </pre>
    </div>
  );
}
