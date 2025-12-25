/**
 * API Route: App Proxy Render
 * Handles Shopify App Proxy requests for native Liquid rendering.
 *
 * Storefront URL: https://shop.myshopify.com/apps/blocksmith-preview?code=...
 * Returns: Content-Type: application/liquid for Shopify native rendering
 *
 * Query Parameters:
 * - token: Short token to retrieve large preview data from server cache
 * - code: Base64-encoded Liquid code (for small payloads, used if no token)
 * - settings: Base64-encoded JSON settings object (injects as settings_X)
 * - blocks: Base64-encoded JSON blocks array (injects as block_N_X)
 * - product: Product handle for context injection
 * - collection: Collection handle for context injection
 * - section_id: Optional section ID for CSS scoping
 */

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { parseProxyParams, wrapLiquidForProxy } from "../utils/liquid-wrapper.server";
import { getPreviewData, deletePreviewToken } from "../services/preview-token-store.server";
import type { SettingsState, BlockInstance } from "../components/preview/schema/SchemaTypes";

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

  // Check for token-based data retrieval first (for large payloads)
  const token = url.searchParams.get("token");
  let code: string | null = null;
  let settings: SettingsState | null = null;
  let blocks: BlockInstance[] | null = null;
  let productHandle: string | null = null;
  let collectionHandle: string | null = null;
  let sectionId: string | null = null;

  if (token) {
    // Retrieve data from token store
    const previewData = getPreviewData(token);
    if (!previewData) {
      return liquid(errorTemplate("Preview token expired or invalid. Please refresh."), {
        layout: false,
      });
    }

    // Decode base64 data from token store
    try {
      code = previewData.code ? Buffer.from(previewData.code, "base64").toString("utf-8") : null;
      settings = previewData.settings
        ? (JSON.parse(Buffer.from(previewData.settings, "base64").toString("utf-8")) as SettingsState)
        : null;
      blocks = previewData.blocks
        ? (JSON.parse(Buffer.from(previewData.blocks, "base64").toString("utf-8")) as BlockInstance[])
        : null;
      productHandle = previewData.product || null;
      collectionHandle = previewData.collection || null;
      sectionId = previewData.section_id || null;
    } catch {
      return liquid(errorTemplate("Invalid preview data encoding."), { layout: false });
    }

    // Clean up token after use (optional, auto-expires anyway)
    deletePreviewToken(token);
  } else {
    // Fallback to URL params for small payloads
    const codeParam = url.searchParams.get("code");
    if (codeParam && codeParam.length > MAX_CODE_LENGTH) {
      return liquid(errorTemplate("Code exceeds maximum allowed size."), { layout: false });
    }

    // Parse and validate all proxy parameters
    const parsed = parseProxyParams(url);
    code = parsed.code;
    settings = parsed.settings;
    blocks = parsed.blocks;
    productHandle = parsed.productHandle;
    collectionHandle = parsed.collectionHandle;
    sectionId = parsed.sectionId;
  }

  if (!code) {
    return liquid(errorTemplate("No Liquid code provided or invalid encoding."), {
      layout: false,
    });
  }

  try {
    // Wrap code with context injection and CSS isolation
    const wrappedCode = wrapLiquidForProxy({
      liquidCode: code,
      sectionId: sectionId ?? undefined,
      productHandle: productHandle ?? undefined,
      collectionHandle: collectionHandle ?? undefined,
      settings: settings ?? undefined,
      blocks: blocks ?? undefined,
      transformSectionSettings: true,
    });

    return liquid(wrappedCode, { layout: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown render error";
    return liquid(errorTemplate(`Render error: ${message}`), { layout: false });
  }
};
