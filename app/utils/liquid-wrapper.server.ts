/**
 * Liquid Wrapper Utility for App Proxy
 * Handles context injection, settings parsing, and CSS isolation
 * for native Shopify Liquid rendering via App Proxy.
 */

import type { SettingsState, BlockInstance } from '../components/preview/schema/SchemaTypes';
import {
  generateSettingsAssigns,
  generateBlocksAssigns,
  rewriteSectionSettings,
  rewriteBlocksIteration,
} from './settings-transform.server';

// Types for wrapper configuration
export interface WrapperOptions {
  liquidCode: string;
  sectionId?: string;
  productHandle?: string;
  collectionHandle?: string;
  settings?: SettingsState;
  blocks?: BlockInstance[];
  transformSectionSettings?: boolean;
  transformBlocksIteration?: boolean;
}

// Types for parsed proxy parameters
export interface ProxyParams {
  code: string | null;
  settings: SettingsState;
  blocks: BlockInstance[];
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
 * Wraps Liquid code with context injection for App Proxy rendering
 * Injects product/collection context, settings, and blocks as Liquid assigns
 *
 * Settings are injected as: settings_title, settings_columns, etc.
 * Blocks are injected as: block_0_type, block_0_title, blocks_count, etc.
 */
export function wrapLiquidForProxy({
  liquidCode,
  sectionId = "preview",
  productHandle,
  collectionHandle,
  settings = {},
  blocks = [],
  transformSectionSettings = false,
  transformBlocksIteration = false,
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

  // Inject settings as individual assigns (settings_title, settings_columns, etc.)
  assigns.push(...generateSettingsAssigns(settings));

  // Inject blocks as numbered assigns (block_0_type, block_0_title, blocks_count)
  assigns.push(...generateBlocksAssigns(blocks));

  // Strip schema block from user code (not renderable)
  let cleanedCode = liquidCode.replace(SCHEMA_BLOCK_REGEX, "");

  // Optionally transform section.settings.X to settings_X for compatibility
  if (transformSectionSettings) {
    cleanedCode = rewriteSectionSettings(cleanedCode);
  }

  // Optionally transform for block in section.blocks loops
  if (transformBlocksIteration) {
    cleanedCode = rewriteBlocksIteration(cleanedCode);
  }

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
 * Handles base64 decoding for code, settings, and blocks
 */
export function parseProxyParams(url: URL): ProxyParams {
  const codeParam = url.searchParams.get("code");
  const settingsParam = url.searchParams.get("settings");
  const blocksParam = url.searchParams.get("blocks");
  const productHandle = url.searchParams.get("product");
  const collectionHandle = url.searchParams.get("collection");
  const rawSectionId = url.searchParams.get("section_id");

  // Validate section ID to prevent XSS (alphanumeric + underscore + hyphen only)
  const sectionId =
    rawSectionId && VALID_SECTION_ID_REGEX.test(rawSectionId) && rawSectionId.length <= 64
      ? rawSectionId
      : "preview";

  // Parse settings from base64 JSON with size limit (DoS prevention)
  let settings: SettingsState = {};
  if (settingsParam && settingsParam.length <= MAX_SETTINGS_LENGTH) {
    try {
      const decoded = Buffer.from(settingsParam, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      // Only accept plain objects with primitive values
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        settings = parsed as SettingsState;
      }
    } catch {
      // Invalid settings, use empty object
    }
  }

  // Parse blocks from base64 JSON array with size limit
  let blocks: BlockInstance[] = [];
  if (blocksParam && blocksParam.length <= MAX_SETTINGS_LENGTH) {
    try {
      const decoded = Buffer.from(blocksParam, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      // Only accept arrays of block objects
      if (Array.isArray(parsed)) {
        blocks = parsed.filter(
          (b): b is BlockInstance =>
            typeof b === 'object' &&
            b !== null &&
            typeof b.id === 'string' &&
            typeof b.type === 'string'
        );
      }
    } catch {
      // Invalid blocks, use empty array
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
    blocks,
    productHandle: productHandle && isValidHandle(productHandle) ? productHandle : null,
    collectionHandle: collectionHandle && isValidHandle(collectionHandle) ? collectionHandle : null,
    sectionId,
  };
}
