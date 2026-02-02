import type { ConversationContext } from '../types/ai.types';
import type { ModelMessage } from '../types/chat.types';
import type { CRORecipe } from '@prisma/client';

/**
 * Recipe context values provided by user
 */
export interface RecipeContextValues {
  productType?: string;
  priceRange?: string;
  targetAudience?: string;
  customNotes?: string;
  [key: string]: string | undefined;
}

/**
 * Chat-specific system prompt extension
 * Appended to base SYSTEM_PROMPT for conversational context
 * Uses marker format for consistent extraction
 */
const CHAT_SYSTEM_EXTENSION = `

=== CONVERSATION MODE ===

For code refinements, output the COMPLETE updated section.
Wrap output: ===START LIQUID=== [full code] ===END LIQUID===

RULES:
- Always output complete section (schema + style + markup)
- NO markdown fences, NO explanations before/after code
- Base changes on provided current code
- For questions (not code changes), answer without code markers

CONTEXT:
The user's current section code is provided below. Always base changes on this code.`;

/**
 * Build full prompt with conversation context
 */
export function buildConversationPrompt(
  userMessage: string,
  context: ConversationContext
): string {
  const parts: string[] = [];

  // Current code context
  if (context.currentCode) {
    parts.push('=== CURRENT SECTION CODE ===');
    parts.push('```liquid');
    parts.push(context.currentCode);
    parts.push('```');
    parts.push('');
  }

  // Recent conversation history
  if (context.recentMessages.length > 0) {
    parts.push('=== RECENT CONVERSATION ===');
    for (const msg of context.recentMessages) {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      // Truncate long messages for context efficiency
      const content = msg.content.length > 500
        ? msg.content.slice(0, 500) + '...[truncated]'
        : msg.content;
      parts.push(`${role}: ${content}`);
    }
    parts.push('');
  }

  // Summarized history (if available)
  if (context.summarizedHistory) {
    parts.push('=== EARLIER CONTEXT (SUMMARIZED) ===');
    parts.push(context.summarizedHistory);
    parts.push('');
  }

  // Current user request
  parts.push('=== USER REQUEST ===');
  parts.push(userMessage);

  return parts.join('\n');
}

/**
 * Get system prompt with chat extension
 */
export function getChatSystemPrompt(baseSystemPrompt: string): string {
  return baseSystemPrompt + CHAT_SYSTEM_EXTENSION;
}

/**
 * Summarize old messages to save tokens
 * Called when conversation exceeds ~20 messages
 */
export function summarizeOldMessages(messages: ModelMessage[]): string {
  if (messages.length === 0) return '';

  const summary: string[] = [];
  summary.push('Previous conversation covered:');

  // Extract key topics from messages
  const topics = new Set<string>();

  for (const msg of messages) {
    // Look for common request patterns
    if (msg.content.toLowerCase().includes('color')) topics.add('color changes');
    if (msg.content.toLowerCase().includes('button')) topics.add('button modifications');
    if (msg.content.toLowerCase().includes('heading')) topics.add('heading styling');
    if (msg.content.toLowerCase().includes('spacing')) topics.add('spacing adjustments');
    if (msg.content.toLowerCase().includes('image')) topics.add('image settings');
    if (msg.content.toLowerCase().includes('font')) topics.add('font changes');
    if (msg.content.toLowerCase().includes('responsive')) topics.add('responsive design');
    if (msg.content.toLowerCase().includes('background')) topics.add('background styling');
    if (msg.content.toLowerCase().includes('padding')) topics.add('padding adjustments');
    if (msg.content.toLowerCase().includes('margin')) topics.add('margin changes');
  }

  for (const topic of topics) {
    summary.push(`- ${topic}`);
  }

  // Count exchanges
  const userMessages = messages.filter(m => m.role === 'user').length;
  summary.push(`(${userMessages} refinement requests made)`);

  return summary.join('\n');
}

/**
 * Build CRO-enhanced prompt for recipe-based generation
 * Injects user context and CRO principles into the recipe template
 *
 * @param recipe - The CRO recipe with prompt template
 * @param context - User-provided context values
 * @returns Enhanced prompt with context and principles
 */
export function buildCROEnhancedPrompt(
  recipe: CRORecipe,
  context?: RecipeContextValues
): string {
  let prompt = recipe.promptTemplate;

  // Build context block from user values
  const contextBlock = buildContextBlock(context);
  prompt = prompt.replace('{{CONTEXT}}', contextBlock);

  // Add CRO principles reminder if available
  const principles = recipe.croPrinciples as string[] | null;
  if (principles && principles.length > 0) {
    prompt += `\n\nCRO PRINCIPLES TO APPLY: ${principles.join(', ')}`;
    prompt += '\nEnsure your design decisions reference these principles in your reasoning.';
  }

  return prompt;
}

/**
 * Build context block from user-provided values
 * Formats context for injection into prompt template
 */
function buildContextBlock(context?: RecipeContextValues): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  const lines: string[] = [];

  // Process known fields with better labels
  const fieldLabels: Record<string, string> = {
    productType: 'Product Type',
    priceRange: 'Price Range',
    targetAudience: 'Target Audience',
    customNotes: 'Additional Notes',
  };

  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && value !== '') {
      const label = fieldLabels[key] || formatContextKey(key);
      lines.push(`${label}: ${value}`);
    }
  }

  if (lines.length === 0) {
    return '';
  }

  return `\nUSER CONTEXT:\n${lines.join('\n')}`;
}

/**
 * Format context key for display (camelCase to Title Case)
 */
function formatContextKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
