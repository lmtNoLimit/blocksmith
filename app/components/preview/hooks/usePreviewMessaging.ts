import { useCallback, useEffect, useRef } from 'react';
import type { PreviewMessage } from '../types';

interface UsePreviewMessagingResult {
  sendMessage: (message: PreviewMessage) => void;
  setIframe: (iframe: HTMLIFrameElement | null) => void;
}

/**
 * Hook for handling postMessage communication with preview iframe
 * Includes security validation for message origin
 */
export function usePreviewMessaging(
  onMessage?: (message: PreviewMessage) => void
): UsePreviewMessagingResult {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const expectedOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Listen for messages from iframe
  useEffect(() => {
    if (!onMessage) return;

    const handleMessage = (event: MessageEvent) => {
      // Security: Validate origin
      if (event.origin !== expectedOrigin) {
        console.warn('Ignored message from unexpected origin:', event.origin);
        return;
      }

      // Validate message structure
      if (event.data && typeof event.data.type === 'string') {
        onMessage(event.data as PreviewMessage);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage, expectedOrigin]);

  const sendMessage = useCallback((message: PreviewMessage) => {
    if (!iframeRef.current?.contentWindow) {
      console.warn('Cannot send message: iframe not ready');
      return;
    }

    // Use '*' for srcDoc iframes since they have null origin
    // Security is handled by validating message structure in the iframe
    iframeRef.current.contentWindow.postMessage(message, '*');
  }, []);

  const setIframe = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeRef.current = iframe;
  }, []);

  return { sendMessage, setIframe };
}
