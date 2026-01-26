import type { CodeExtractionResult } from '../types/ai.types';

// Code block patterns in priority order (allow optional whitespace/newline after language)
const CODE_BLOCK_PATTERNS = [
  /```liquid\s*([\s\S]*?)```/g,
  /```html\s*([\s\S]*?)```/g,
  /```\s*([\s\S]*?)```/g,
];

// Pattern to match structured CHANGES comment
const CHANGES_COMMENT_PATTERN = /<!--\s*CHANGES:\s*(\[.*?\])\s*-->/s;

// Max changes to return (UX: keep list scannable)
const MAX_CHANGES = 5;

/**
 * Extract Liquid code from AI response
 * Handles multiple formats:
 * 1. Fenced code blocks (```liquid...```, ```html...```, ```...```)
 * 2. Raw Liquid schema pattern (fallback)
 *
 * When multiple code blocks exist, takes the LAST one (final version)
 */
export function extractCodeFromResponse(content: string): CodeExtractionResult {
  let code: string | undefined;

  // Try each pattern and take the LAST match (final version)
  for (const pattern of CODE_BLOCK_PATTERNS) {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const potentialCode = lastMatch[1].trim();

      // Verify it looks like Liquid/HTML
      if (potentialCode.includes('{%') || potentialCode.includes('{{') || potentialCode.includes('<')) {
        code = potentialCode;
        break;
      }
    }
  }

  // Fallback: look for raw Liquid schema pattern (no fencing)
  if (!code) {
    const schemaMatch = content.match(/(\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\})/);
    if (schemaMatch) {
      // Find the full section including HTML around the schema
      const sectionMatch = content.match(
        /((?:<[a-z][^>]*>[\s\S]*?)?\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}(?:[\s\S]*?<\/[a-z]+>)?)/i
      );
      code = sectionMatch ? sectionMatch[1].trim() : schemaMatch[1].trim();
    }
  }

  if (!code) {
    return {
      hasCode: false,
      explanation: content,
    };
  }

  // Extract changes BEFORE stripping comment from code
  const changes = extractChanges(content, code);

  // Remove CHANGES comment from code output
  const cleanedCode = stripChangesComment(code);

  // Compute explanation (content without the code block)
  const explanation = content
    .replace(/```(?:liquid|html)?\s*[\s\S]*?```/g, '')
    .trim() || undefined;

  return {
    hasCode: true,
    code: cleanedCode,
    explanation,
    changes,
  };
}

/**
 * Extract changes from AI response
 * Priority:
 * 1. Structured <!-- CHANGES: [...] --> comment (inside or outside code block)
 * 2. Fallback: bullet points or numbered lists in explanation text
 */
function extractChanges(fullContent: string, codeContent: string): string[] | undefined {
  // Try structured comment in code first
  let changes = parseStructuredChanges(codeContent);
  if (changes) return changes;

  // Try structured comment in full content (might be outside code block)
  changes = parseStructuredChanges(fullContent);
  if (changes) return changes;

  // Fallback: extract from bullet points in explanation (outside code)
  const explanationText = fullContent.replace(/```[\s\S]*?```/g, '');
  return extractBulletChanges(explanationText);
}

/**
 * Parse structured CHANGES comment
 * Format: <!-- CHANGES: ["item1", "item2"] -->
 */
function parseStructuredChanges(content: string): string[] | undefined {
  const match = content.match(CHANGES_COMMENT_PATTERN);
  if (!match) return undefined;

  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .slice(0, MAX_CHANGES);
    }
  } catch {
    // Invalid JSON, return undefined to try fallback
  }
  return undefined;
}

/**
 * Extract change summary from bullet points/numbered lists
 * Fallback when structured comment not present
 */
function extractBulletChanges(content: string): string[] | undefined {
  const changes: string[] = [];

  // Match bullet points (- or *)
  const bulletMatches = content.matchAll(/^[\s]*[-*]\s+(.+)$/gm);
  for (const match of bulletMatches) {
    const text = match[1].trim();
    // Filter out markdown artifacts and code-like content
    if (text && !text.startsWith('`') && !text.includes('```')) {
      changes.push(text);
    }
  }

  // Match numbered lists
  const numberedMatches = content.matchAll(/^[\s]*\d+\.\s+(.+)$/gm);
  for (const match of numberedMatches) {
    const text = match[1].trim();
    if (text && !text.startsWith('`') && !text.includes('```')) {
      changes.push(text);
    }
  }

  return changes.length > 0 ? changes.slice(0, MAX_CHANGES) : undefined;
}

/**
 * Remove CHANGES comment from code
 * Keeps code clean for display and storage
 */
function stripChangesComment(code: string): string {
  return code.replace(CHANGES_COMMENT_PATTERN, '').trim();
}

/**
 * Validate extracted code is a complete Liquid section
 */
export function isCompleteLiquidSection(code: string): boolean {
  const hasSchema = /\{%\s*schema\s*%\}[\s\S]*\{%\s*endschema\s*%\}/.test(code);
  const hasMarkup = /<[a-z][\s\S]*>/i.test(code);

  return hasSchema && hasMarkup;
}
