import { useRef, useEffect, useState } from 'react';
import type { DeviceSize } from './types';

interface NativePreviewFrameProps {
  html: string | null;
  isLoading: boolean;
  deviceSize: DeviceSize;
}

const DEVICE_WIDTHS: Record<DeviceSize, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1200,
};

/**
 * Iframe wrapper for native Liquid preview rendering
 * Uses srcdoc with rendered HTML from App Proxy
 * Supports device size scaling via CSS transform
 */
export function NativePreviewFrame({
  html,
  isLoading,
  deviceSize,
}: NativePreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [iframeHeight, setIframeHeight] = useState<number>(400);

  // Measure container for scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Build full HTML document for iframe
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${html || '<div style="padding:20px;color:#6d7175;text-align:center;">Loading preview...</div>'}
  <script>
    // Report height to parent
    function reportHeight() {
      window.parent.postMessage({ type: 'NATIVE_PREVIEW_HEIGHT', height: document.body.scrollHeight }, '*');
    }
    window.addEventListener('load', reportHeight);
    new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true });
  </script>
</body>
</html>
  `.trim();

  // Listen for height updates (validate origin for security)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Accept messages from srcdoc iframe (null origin) or same origin
      if (event.origin !== 'null' && event.origin !== window.location.origin) return;
      if (event.data?.type === 'NATIVE_PREVIEW_HEIGHT') {
        setIframeHeight(Math.max(300, event.data.height));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const targetWidth = DEVICE_WIDTHS[deviceSize];
  const needsScaling = containerWidth > 0 && containerWidth < targetWidth;
  const scale = needsScaling ? containerWidth / targetWidth : 1;
  const scaledHeight = iframeHeight * scale;

  return (
    <s-box
      background="subdued"
      borderRadius="base"
      padding="base"
      blockSize={`${scaledHeight + 32}px`}
      overflow="hidden"
    >
      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <s-spinner size="large" />
        </div>
      )}

      <div ref={containerRef} style={{ position: 'relative', height: '100%', width: '100%' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            width: `${targetWidth}px`,
            marginLeft: `-${targetWidth / 2}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <iframe
            srcDoc={fullHtml}
            sandbox="allow-scripts"
            style={{
              width: '100%',
              height: `${iframeHeight}px`,
              border: '1px solid var(--p-color-border)',
              borderRadius: 'var(--p-border-radius-200)',
              backgroundColor: 'var(--p-color-bg-surface)',
              display: 'block',
            }}
            title="Native Section Preview"
          />
        </div>
      </div>
    </s-box>
  );
}
