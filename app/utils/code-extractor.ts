import type { CodeExtractionResult } from '../types/ai.types';

// ============================================================================
// Types for Liquid Validation
// ============================================================================

/**
 * Error types for liquid validation
 */
export type LiquidValidationErrorType =
  | 'unclosed_liquid_tag'
  | 'unclosed_html_tag'
  | 'invalid_schema_json'
  | 'missing_schema';

/**
 * Individual validation error with context
 */
export interface LiquidValidationError {
  type: LiquidValidationErrorType;
  tag?: string;
  message: string;
}

/**
 * Complete validation result with errors and warnings
 */
export interface LiquidValidationResult {
  isComplete: boolean;
  errors: LiquidValidationError[];
  warnings: string[];
  truncationPoint?: number; // Character index where truncation detected
}

// ============================================================================
// Code Extraction
// ============================================================================

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

// ============================================================================
// Liquid Completeness Validation
// ============================================================================

// Liquid block tags that require explicit closure ({% tag %}...{% endtag %})
const LIQUID_BLOCK_TAGS = [
  'if', 'unless', 'for', 'case', 'form', 'capture', 'paginate', 'tablerow',
  'comment', 'raw', 'style', 'javascript', 'stylesheet'
];

// HTML self-closing tags (don't require </tag>)
const SELF_CLOSING_TAGS = [
  'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base',
  'col', 'embed', 'param', 'source', 'track', 'wbr'
];

/**
 * Validate Liquid block tags are properly closed using stack-based matching
 * Processes tags in document order for correct nesting validation
 */
function validateLiquidTags(code: string): LiquidValidationError[] {
  const errors: LiquidValidationError[] = [];
  const stack: Array<{ tag: string; index: number }> = [];

  // Combined pattern to capture both opening and closing tags with positions
  // Match: {% tagname ... %} or {% endtagname %}
  const tagPattern = /\{%[-\s]*(end)?(\w+)(?:[^%]*?)%\}/g;

  let match;
  while ((match = tagPattern.exec(code)) !== null) {
    const isClosing = !!match[1]; // Has "end" prefix
    const tagName = match[2].toLowerCase();

    // Skip non-block tags
    if (!LIQUID_BLOCK_TAGS.includes(tagName)) continue;

    if (isClosing) {
      // Closing tag: {% endtag %}
      const last = stack.pop();
      if (!last) {
        errors.push({
          type: 'unclosed_liquid_tag',
          tag: tagName,
          message: `Unexpected closing tag: {% end${tagName} %}`
        });
      } else if (last.tag !== tagName) {
        errors.push({
          type: 'unclosed_liquid_tag',
          tag: last.tag,
          message: `Mismatched tag: expected {% end${last.tag} %}, got {% end${tagName} %}`
        });
      }
    } else {
      // Opening tag: {% tag %}
      stack.push({ tag: tagName, index: match.index });
    }
  }

  // Report remaining unclosed tags
  for (const { tag } of stack) {
    errors.push({
      type: 'unclosed_liquid_tag',
      tag,
      message: `Unclosed Liquid tag: {% ${tag} %} missing {% end${tag} %}`
    });
  }

  return errors;
}

/**
 * Validate HTML tags are properly closed using stack-based matching
 * Only reports errors when multiple tags are unclosed (likely truncation)
 */
function validateHTMLTags(code: string): LiquidValidationError[] {
  const errors: LiquidValidationError[] = [];
  const stack: string[] = [];

  // Match HTML tags: <tagname ...> or </tagname>
  // Skip: Liquid tags, comments, DOCTYPE
  const tagPattern = /<\/?([a-z][a-z0-9-]*)[^>]*\/?>/gi;

  let match;
  while ((match = tagPattern.exec(code)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();

    // Skip self-closing tags and self-closed syntax />
    if (SELF_CLOSING_TAGS.includes(tagName) || fullTag.endsWith('/>')) {
      continue;
    }

    if (fullTag.startsWith('</')) {
      // Closing tag
      const last = stack.pop();
      // Don't error on mismatches - HTML is forgiving and Liquid complicates things
      // Just track if stack becomes negative (extra closing tags)
      if (!last) {
        // Extra closing tag - could be valid HTML (browser fixes it)
        // Don't add error, just note it
      }
    } else {
      // Opening tag
      stack.push(tagName);
    }
  }

  // Only report if many unclosed tags (likely truncation, not minor HTML issues)
  if (stack.length > 2) {
    errors.push({
      type: 'unclosed_html_tag',
      tag: stack[stack.length - 1],
      message: `Multiple unclosed HTML tags: ${stack.slice(-3).join(', ')}... (${stack.length} total)`
    });
  }

  return errors;
}

/**
 * Validate schema block exists, is properly closed, and contains valid JSON
 */
function validateSchemaJSON(code: string): LiquidValidationError[] {
  const errors: LiquidValidationError[] = [];

  // Check for complete schema block
  const schemaMatch = code.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);

  if (!schemaMatch) {
    // Check if schema started but not closed
    if (/\{%\s*schema\s*%\}/.test(code)) {
      errors.push({
        type: 'unclosed_liquid_tag',
        tag: 'schema',
        message: 'Schema block started but {% endschema %} missing'
      });
    } else {
      errors.push({
        type: 'missing_schema',
        message: 'No {% schema %}...{% endschema %} block found'
      });
    }
    return errors;
  }

  // Validate JSON content
  const jsonContent = schemaMatch[1].trim();
  if (!jsonContent) {
    errors.push({
      type: 'invalid_schema_json',
      message: 'Schema block is empty'
    });
    return errors;
  }

  try {
    JSON.parse(jsonContent);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Parse error';
    errors.push({
      type: 'invalid_schema_json',
      message: `Invalid JSON in schema: ${errorMessage}`
    });
  }

  return errors;
}

/**
 * Main validation function: checks Liquid code for completeness
 * Validates: schema block, Liquid tags, HTML tags (heuristic)
 *
 * @param code - The Liquid code to validate
 * @returns Validation result with errors and warnings
 */
export function validateLiquidCompleteness(code: string): LiquidValidationResult {
  // Feature flag check - return valid if disabled
  if (process.env.FLAG_VALIDATE_LIQUID !== 'true') {
    return { isComplete: true, errors: [], warnings: [] };
  }

  const errors: LiquidValidationError[] = [];
  const warnings: string[] = [];

  // Run all validators
  errors.push(...validateSchemaJSON(code));
  errors.push(...validateLiquidTags(code));
  errors.push(...validateHTMLTags(code));

  // Heuristic warnings for likely truncation
  if (code.length < 200 && !code.includes('{% endschema %}')) {
    warnings.push('Code is very short and may be truncated');
  }

  // Check for incomplete JSON/array syntax at end of code
  const trimmedEnd = code.slice(-50).trim();
  if (trimmedEnd.endsWith(',') || trimmedEnd.endsWith('[') || trimmedEnd.endsWith('{')) {
    warnings.push('Code ends with incomplete JSON/array syntax');
  }

  // Check for truncated mid-tag
  if (/\{%[^%]*$/.test(code) || /\{\{[^}]*$/.test(code)) {
    warnings.push('Code ends with incomplete Liquid tag');
  }

  return {
    isComplete: errors.length === 0,
    errors,
    warnings,
  };
}
