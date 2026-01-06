/**
 * API Route: Internal Preview Renderer Proxy
 * Server-side proxy to fetch rendered HTML from App Proxy.
 * Supports authenticated requests for password-protected stores.
 *
 * POST /api/preview/render
 * Body: { code, settings?, blocks?, product?, collection?, section_id? }
 * Note: shopDomain in body is ignored - uses session.shop for SSRF prevention
 *
 * Response:
 * - { html, mode: "native" } - Native rendering succeeded
 * - { html: null, mode: "fallback", error: "..." } - Use client-side fallback
 */

import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import DOMPurify from "isomorphic-dompurify";
import { authenticate } from "../shopify.server";
import { getAuthenticatedCookiesForShop } from "../services/storefront-auth.server";
import { storePreviewData } from "../services/preview-token-store.server";
// Note: hasFeature import removed - preview is available for all plans

// Max code length (same as proxy endpoint)
const MAX_CODE_LENGTH = 100_000;

// URL length threshold - use token for URLs longer than this
// HTTP spec recommends max 2000 chars for universal compatibility
const URL_LENGTH_THRESHOLD = 2000;

// Timeout for proxy fetch (10 seconds)
const FETCH_TIMEOUT_MS = 10_000;

// Response headers for XSS protection
const SECURITY_HEADERS = {
  "Content-Security-Policy": "script-src 'none'; object-src 'none'; frame-ancestors 'self'",
  "X-Content-Type-Options": "nosniff",
};

// DOMPurify config for sanitizing Shopify Liquid HTML output
// Excludes <script> tags by default for security (defer decision per user request)
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    // Structure
    "div", "span", "section", "article", "header", "footer", "main", "nav", "aside",
    // Text
    "p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "b", "i", "u", "br", "hr",
    // Lists
    "ul", "ol", "li", "dl", "dt", "dd",
    // Links & Media
    "a", "img", "picture", "source", "video", "audio", "figure", "figcaption", "svg", "path",
    // Forms (for interactive sections)
    "form", "input", "button", "select", "option", "textarea", "label",
    // Tables
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    // Shopify Liquid specific
    "style", "noscript", "template",
  ],
  ALLOWED_ATTR: [
    "class", "id", "style", "data-*",
    // Links
    "href", "target", "rel",
    // Media
    "src", "srcset", "alt", "width", "height", "loading", "decoding",
    // Forms
    "type", "name", "value", "placeholder", "required", "disabled", "checked", "for",
    // Accessibility
    "aria-*", "role", "tabindex",
    // SVG
    "viewBox", "fill", "stroke", "d", "xmlns",
  ],
  ALLOW_DATA_ATTR: true,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

interface ProxyResponse {
  html: string | null;
  mode: "native" | "fallback";
  error?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  // Authenticate the request (ensures user is logged in)
  const { session } = await authenticate.admin(request);

  if (!session) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  // SECURITY: Use session.shop to prevent SSRF attacks
  // Do NOT use shopDomain from request body
  const shop = session.shop;

  // Note: Live preview is available for ALL plans to showcase app value
  // The conversion trigger is publishing (gated to Pro+), not previewing

  // Parse request body
  let body: {
    shopDomain?: string; // Ignored - kept for backward compatibility
    code?: string;
    settings?: string;
    blocks?: string;
    product?: string;
    collection?: string;
    section_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, settings, blocks, product, collection, section_id } = body;

  // Validate required fields
  if (!code) {
    return data({ error: "code is required" }, { status: 400 });
  }

  // DoS protection
  if (code.length > MAX_CODE_LENGTH) {
    return data({ error: "Code exceeds maximum allowed size" }, { status: 400 });
  }

  // SECURITY: Build URL using session.shop only (prevents SSRF)
  const proxyUrl = new URL(`https://${shop}/apps/blocksmith-preview`);

  // Build URL with all params first to check length
  const tempUrl = new URL(proxyUrl);
  tempUrl.searchParams.set("code", code);
  if (settings) tempUrl.searchParams.set("settings", settings);
  if (blocks) tempUrl.searchParams.set("blocks", blocks);
  if (product) tempUrl.searchParams.set("product", product);
  if (collection) tempUrl.searchParams.set("collection", collection);
  tempUrl.searchParams.set("section_id", section_id || "preview");

  // Check if URL exceeds threshold - use token-based storage for large payloads
  if (tempUrl.toString().length > URL_LENGTH_THRESHOLD) {
    const token = storePreviewData({
      code,
      settings,
      blocks,
      product,
      collection,
      section_id: section_id || "preview",
    });
    proxyUrl.searchParams.set("token", token);
  } else {
    // Small payload - use direct URL params
    proxyUrl.searchParams.set("code", code);
    if (settings) proxyUrl.searchParams.set("settings", settings);
    if (blocks) proxyUrl.searchParams.set("blocks", blocks);
    if (product) proxyUrl.searchParams.set("product", product);
    if (collection) proxyUrl.searchParams.set("collection", collection);
    proxyUrl.searchParams.set("section_id", section_id || "preview");
  }

  // Get authenticated cookies (null if not configured or auth fails)
  const cookies = await getAuthenticatedCookiesForShop(shop);

  const urlString = proxyUrl.toString();

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // Build request headers
    const headers: Record<string, string> = {
      "User-Agent": "Blocksmith-Preview-Proxy/1.0",
      Accept: "text/html",
    };

    // Add cookies if available (for password-protected stores)
    if (cookies) {
      headers.Cookie = cookies;
    }

    // Fetch from App Proxy with redirect: "manual" to detect password redirects
    const response = await fetch(urlString, {
      method: "GET",
      signal: controller.signal,
      headers,
      redirect: "manual",
    });

    clearTimeout(timeoutId);

    // Check for redirect (302/301) - indicates password wall
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("location") || "";

      // Password redirect detected
      if (location.includes("/password")) {
        return data<ProxyResponse>(
          {
            html: null,
            mode: "fallback",
            error: cookies
              ? "Storefront password expired or invalid"
              : "Store is password-protected - configure password in settings",
          },
          { headers: SECURITY_HEADERS }
        );
      }

      // Other redirect - follow manually (with timeout protection)
      const redirectUrl = new URL(location, proxyUrl.origin);
      const redirectController = new AbortController();
      const redirectTimeoutId = setTimeout(
        () => redirectController.abort(),
        FETCH_TIMEOUT_MS
      );

      try {
        const redirectResponse = await fetch(redirectUrl.toString(), {
          method: "GET",
          headers,
          signal: redirectController.signal,
        });
        clearTimeout(redirectTimeoutId);

        if (!redirectResponse.ok) {
          return data<ProxyResponse>(
            { html: null, mode: "fallback", error: "Redirect failed" },
            { headers: SECURITY_HEADERS }
          );
        }

        const rawHtml = await redirectResponse.text();
        const sanitizedHtml = DOMPurify.sanitize(rawHtml, DOMPURIFY_CONFIG);
        return data<ProxyResponse>(
          { html: sanitizedHtml, mode: "native" },
          { headers: SECURITY_HEADERS }
        );
      } catch {
        clearTimeout(redirectTimeoutId);
        return data<ProxyResponse>(
          { html: null, mode: "fallback", error: "Redirect timeout" },
          { headers: SECURITY_HEADERS }
        );
      }
    }

    if (!response.ok) {
      const statusText = response.statusText || "Unknown error";
      const errorBody = await response.text().catch(() => "");
      console.error("[ProxyRender] ========== ERROR DETAILS ==========");
      console.error("[ProxyRender] Status:", response.status, statusText);
      console.error("[ProxyRender] URL:", urlString);
      console.error("[ProxyRender] Response body (first 500 chars):", errorBody.substring(0, 500));
      console.error("[ProxyRender] ========== END ERROR ==========");
      return data<ProxyResponse>(
        { html: null, mode: "fallback", error: `Proxy error: ${response.status} ${statusText}` },
        { headers: SECURITY_HEADERS }
      );
    }

    // Return the rendered HTML with mode indicator
    const rawHtml = await response.text();

    // Final check: if HTML contains password form, auth failed silently
    if (
      rawHtml.includes('form_type="storefront_password"') ||
      rawHtml.includes('id="password"')
    ) {
      return data<ProxyResponse>(
        { html: null, mode: "fallback", error: "Store is password-protected" },
        { headers: SECURITY_HEADERS }
      );
    }

    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, DOMPURIFY_CONFIG);
    return data<ProxyResponse>(
      { html: sanitizedHtml, mode: "native" },
      { headers: SECURITY_HEADERS }
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return data<ProxyResponse>(
        { html: null, mode: "fallback", error: "Request timeout" },
        { headers: SECURITY_HEADERS }
      );
    }

    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[ProxyRender] Preview proxy error:", errorMessage, err);
    return data<ProxyResponse>(
      { html: null, mode: "fallback", error: `Proxy error: ${errorMessage}` },
      { headers: SECURITY_HEADERS }
    );
  }
}

// Only POST is supported
export async function loader() {
  return data({ error: "Method not allowed" }, { status: 405 });
}
