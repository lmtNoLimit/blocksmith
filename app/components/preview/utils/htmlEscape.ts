/**
 * Shared HTML escaping utilities for Liquid filter implementations
 * Prevents XSS by escaping HTML special characters
 */

/**
 * Escapes HTML special characters in a string
 * Use for text content that will be rendered inside HTML elements
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes HTML attribute values (quotes only)
 * Use for attribute values already within quotes
 */
export function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
