import { useState, useEffect, useRef, useCallback } from 'react';
import type { SettingsState, BlockInstance } from '../schema/SchemaTypes';
import type { MockProduct, MockCollection } from '../mockData/types';

interface UseNativePreviewRendererOptions {
  liquidCode: string;
  settings?: SettingsState;
  blocks?: BlockInstance[];
  resources?: Record<string, MockProduct | MockCollection>;
  shopDomain: string;
  debounceMs?: number;
}

interface NativePreviewResult {
  html: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for rendering Liquid via App Proxy (server-side native rendering)
 * Debounces code changes and fetches rendered HTML from proxy endpoint
 */
export function useNativePreviewRenderer({
  liquidCode,
  settings = {},
  blocks = [],
  resources = {},
  shopDomain,
  debounceMs = 600,
}: UseNativePreviewRendererOptions): NativePreviewResult {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  // Extract product/collection handles from resources
  const getResourceHandles = useCallback(() => {
    let productHandle: string | null = null;
    let collectionHandle: string | null = null;

    for (const resource of Object.values(resources)) {
      if ('products' in resource && Array.isArray(resource.products)) {
        collectionHandle = (resource as MockCollection).handle || null;
      } else if ('variants' in resource) {
        productHandle = (resource as MockProduct).handle || null;
      }
    }

    return { productHandle, collectionHandle };
  }, [resources]);

  // Base64 encode for browser (handles Unicode properly with TextEncoder)
  const base64Encode = useCallback((str: string): string => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  // Build proxy URL
  const buildProxyUrl = useCallback(() => {
    const base = `https://${shopDomain}/apps/blocksmith-preview`;
    const params = new URLSearchParams();

    // Base64 encode Liquid code
    params.set('code', base64Encode(liquidCode));

    // Add settings if present
    if (Object.keys(settings).length > 0) {
      params.set('settings', base64Encode(JSON.stringify(settings)));
    }

    // Add blocks if present
    if (blocks.length > 0) {
      params.set('blocks', base64Encode(JSON.stringify(blocks)));
    }

    // Add resource handles
    const { productHandle, collectionHandle } = getResourceHandles();
    if (productHandle) params.set('product', productHandle);
    if (collectionHandle) params.set('collection', collectionHandle);

    params.set('section_id', 'preview');

    return `${base}?${params.toString()}`;
  }, [liquidCode, settings, blocks, shopDomain, getResourceHandles, base64Encode]);

  // Fetch preview from proxy
  const fetchPreview = useCallback(async () => {
    if (!liquidCode.trim() || !shopDomain) {
      setHtml('<p style="color:#6d7175;text-align:center;">No code to preview</p>');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const url = buildProxyUrl();
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const renderedHtml = await response.text();
      setHtml(renderedHtml);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request cancelled, ignore
      }
      const message = err instanceof Error ? err.message : 'Fetch failed';
      setError(message);
      setHtml(null);
    } finally {
      setIsLoading(false);
    }
  }, [liquidCode, shopDomain, buildProxyUrl]);

  // Debounced fetch on code/settings changes
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(fetchPreview, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [fetchPreview, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { html, isLoading, error, refetch: fetchPreview };
}
