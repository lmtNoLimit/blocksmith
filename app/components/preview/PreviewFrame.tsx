import { useRef, useEffect } from 'react';
import type { DeviceSize } from './types';

export interface PreviewFrameProps {
  deviceSize: DeviceSize;
  onLoad?: (iframe: HTMLIFrameElement) => void;
}

const DEVICE_WIDTHS: Record<DeviceSize, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%'
};

// Standalone HTML template for iframe
// Note: Using srcDoc means the iframe has null origin, so we accept messages from any origin
// but validate the message structure instead
const IFRAME_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style id="preview-styles"></style>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
    }
    img { max-width: 100%; height: auto; }
    .preview-error {
      color: #d72c0d;
      padding: 16px;
      background: #fff4f4;
      border-radius: 8px;
      border: 1px solid #ffd2cc;
    }
    .preview-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: #6d7175;
    }
  </style>
</head>
<body>
  <div id="preview-content">
    <div class="preview-loading">Loading preview...</div>
  </div>
  <script>
    // For srcDoc iframes, we validate message structure instead of origin
    // since srcDoc iframes have null origin
    window.addEventListener('message', (event) => {
      // Validate message structure for security
      if (!event.data || typeof event.data !== 'object') return;
      const { type, html, css, error } = event.data;
      if (!type || typeof type !== 'string') return;

      if (type === 'RENDER') {
        document.getElementById('preview-styles').textContent = css || '';
        // Wrap HTML in shopify-section wrapper to match CSS selectors like #shopify-section-{{ section.id }}
        document.getElementById('preview-content').innerHTML =
          '<div id="shopify-section-preview-section">' + (html || '') + '</div>';
        // Notify parent of new height
        setTimeout(() => {
          window.parent.postMessage(
            { type: 'RESIZE', height: document.body.scrollHeight },
            '*'
          );
        }, 50);
      } else if (type === 'RENDER_ERROR') {
        document.getElementById('preview-content').innerHTML =
          '<div class="preview-error">' + (error || 'Render error') + '</div>';
      }
    });
  </script>
</body>
</html>
`;

/**
 * Sandboxed iframe wrapper for preview rendering
 * Uses postMessage for parent-child communication
 */
export function PreviewFrame({ deviceSize, onLoad }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && onLoad) {
      const iframe = iframeRef.current;
      iframe.onload = () => onLoad(iframe);
    }
  }, [onLoad]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: '#f6f6f7',
      borderRadius: '8px',
      padding: '16px',
      minHeight: '400px'
    }}>
      <iframe
        ref={iframeRef}
        srcDoc={IFRAME_HTML}
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: DEVICE_WIDTHS[deviceSize],
          maxWidth: '100%',
          minHeight: '300px',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          backgroundColor: '#fff',
          transition: 'width 0.2s ease'
        }}
        title="Section Preview"
        aria-label="Live preview of generated section"
      />
    </div>
  );
}
