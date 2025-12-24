/**
 * API Route: App Proxy Render
 * Handles Shopify App Proxy requests for native Liquid rendering.
 *
 * Storefront URL: https://shop.myshopify.com/apps/blocksmith-preview?code=...
 * Returns: Content-Type: application/liquid for Shopify native rendering
 *
 * Query Parameters:
 * - code: Base64-encoded Liquid code
 * - settings: Base64-encoded JSON settings object
 * - product: Product handle for context injection
 * - collection: Collection handle for context injection
 * - section_id: Optional section ID for CSS scoping
 */

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { parseProxyParams, wrapLiquidForProxy } from "../utils/liquid-wrapper.server";

// Max base64 code length (~75KB decoded) to prevent DoS attacks
const MAX_CODE_LENGTH = 100_000;

// Error template for consistent error display
const errorTemplate = (message: string) =>
  `<div class="blocksmith-error" style="color:#d72c0d;padding:20px;background:#fff4f4;border-radius:8px;font-family:system-ui,sans-serif;">${message}</div>`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // HMAC validation + liquid helper from Shopify app package
  const { liquid, session } = await authenticate.public.appProxy(request);

  // Check if app is installed
  if (!session) {
    return liquid(errorTemplate("App not installed. Please install Blocksmith first."), {
      layout: false,
    });
  }

  const url = new URL(request.url);

  // DoS protection: check raw param length before parsing
  const codeParam = url.searchParams.get("code");
  if (codeParam && codeParam.length > MAX_CODE_LENGTH) {
    return liquid(errorTemplate("Code exceeds maximum allowed size."), { layout: false });
  }

  // Parse and validate all proxy parameters
  const { code, settings, productHandle, collectionHandle, sectionId } = parseProxyParams(url);

  if (!code) {
    return liquid(errorTemplate("No Liquid code provided or invalid encoding."), {
      layout: false,
    });
  }

  try {
    // Wrap code with context injection and CSS isolation
    const wrappedCode = wrapLiquidForProxy({
      liquidCode: code,
      sectionId,
      productHandle: productHandle ?? undefined,
      collectionHandle: collectionHandle ?? undefined,
      settings,
    });

    return liquid(wrappedCode, { layout: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown render error";
    return liquid(errorTemplate(`Render error: ${message}`), { layout: false });
  }
};
