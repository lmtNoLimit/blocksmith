/**
 * Liquid Wrapper Utility for App Proxy
 * Handles context injection, settings parsing, and CSS isolation
 * for native Shopify Liquid rendering via App Proxy.
 */

// Types for wrapper configuration
export interface WrapperOptions {
  liquidCode: string;
  sectionId?: string;
  productHandle?: string;
  collectionHandle?: string;
  settings?: Record<string, unknown>;
}

// Types for parsed proxy parameters
export interface ProxyParams {
  code: string | null;
  settings: Record<string, unknown>;
  productHandle: string | null;
  collectionHandle: string | null;
  sectionId: string;
}

// Regex to strip schema blocks (handles whitespace control syntax)
const SCHEMA_BLOCK_REGEX = /{%-?\s*schema\s*-?%}[\s\S]*?{%-?\s*endschema\s*-?%}/gi;

// Validation regex for Shopify handles (alphanumeric + hyphens)
const VALID_HANDLE_REGEX = /^[a-z0-9-]+$/i;

// Validation regex for section IDs (alphanumeric + underscores + hyphens)
const VALID_SECTION_ID_REGEX = /^[a-z0-9_-]+$/i;

// Max settings param size (50KB base64 encoded)
const MAX_SETTINGS_LENGTH = 70_000;

/**
 * Validates that a handle contains only safe characters
 * Prevents injection attacks via malformed handles
 */
function isValidHandle(handle: string): boolean {
  return VALID_HANDLE_REGEX.test(handle) && handle.length <= 255;
}

/**
 * Escapes a value for safe use in Liquid assign statements
 */
function escapeLiquidValue(value: unknown): string {
  if (typeof value === "string") {
    // Escape single quotes and backslashes
    return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "nil";
}

/**
 * Wraps Liquid code with context injection for App Proxy rendering
 * Injects product/collection context and settings as Liquid assigns
 */
export function wrapLiquidForProxy({
  liquidCode,
  sectionId = "preview",
  productHandle,
  collectionHandle,
  settings = {},
}: WrapperOptions): string {
  const assigns: string[] = [];

  // Inject product context if specified and valid
  if (productHandle && isValidHandle(productHandle)) {
    assigns.push(`{% assign product = all_products['${productHandle}'] %}`);
  }

  // Inject collection context if specified and valid
  if (collectionHandle && isValidHandle(collectionHandle)) {
    assigns.push(`{% assign collection = collections['${collectionHandle}'] %}`);
  }

  // Inject settings as individual assigns for simple values
  for (const [key, value] of Object.entries(settings)) {
    // Only allow valid variable names (alphanumeric + underscore, not starting with number)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      assigns.push(`{% assign ${key} = ${escapeLiquidValue(value)} %}`);
    }
  }

  // Strip schema block from user code (not renderable)
  const cleanedCode = liquidCode.replace(SCHEMA_BLOCK_REGEX, "");

  // Build wrapped template with CSS isolation container
  const assignsBlock = assigns.length > 0 ? `${assigns.join("\n")}\n` : "";

  return `${assignsBlock}<div class="blocksmith-preview" id="shopify-section-${sectionId}">
${cleanedCode}
</div>
<style>
.blocksmith-preview { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.blocksmith-preview img { max-width: 100%; height: auto; }
</style>`;
}

/**
 * Decode and validate proxy request parameters
 * Handles base64 decoding for code and settings
 */
export function parseProxyParams(url: URL): ProxyParams {
  const codeParam = url.searchParams.get("code");
  const settingsParam = url.searchParams.get("settings");
  const productHandle = url.searchParams.get("product");
  const collectionHandle = url.searchParams.get("collection");
  const rawSectionId = url.searchParams.get("section_id");

  // Validate section ID to prevent XSS (alphanumeric + underscore + hyphen only)
  const sectionId =
    rawSectionId && VALID_SECTION_ID_REGEX.test(rawSectionId) && rawSectionId.length <= 64
      ? rawSectionId
      : "preview";

  // Parse settings from base64 JSON with size limit (DoS prevention)
  let settings: Record<string, unknown> = {};
  if (settingsParam && settingsParam.length <= MAX_SETTINGS_LENGTH) {
    try {
      const decoded = Buffer.from(settingsParam, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      // Only accept plain objects
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        settings = parsed;
      }
    } catch {
      // Invalid settings, use empty object
    }
  }

  // Decode code from base64
  let code: string | null = null;
  if (codeParam) {
    try {
      code = Buffer.from(codeParam, "base64").toString("utf-8");
    } catch {
      // Invalid code encoding
    }
  }

  return {
    code,
    settings,
    productHandle: productHandle && isValidHandle(productHandle) ? productHandle : null,
    collectionHandle: collectionHandle && isValidHandle(collectionHandle) ? collectionHandle : null,
    sectionId,
  };
}
