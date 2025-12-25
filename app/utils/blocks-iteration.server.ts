/**
 * Block Iteration Rewriter for App Proxy
 * Transforms {% for block in section.blocks %} loops into unrolled indexed block access
 *
 * This enables Shopify section templates using block iteration patterns
 * to work with flat variable injection (block_0_title, block_1_title, etc.)
 */

// Max blocks to unroll in for loops (prevents output explosion)
const MAX_UNROLL_BLOCKS = 10;

// Regex to match for block in section.blocks loops
const FOR_BLOCK_REGEX = /\{%-?\s*for\s+(\w+)\s+in\s+section\.blocks\s*-?%\}([\s\S]*?)\{%-?\s*endfor\s*-?%\}/g;

// Regex to detect nested for loops
const NESTED_FOR_REGEX = /\{%-?\s*for\s+/;

/**
 * Rewrite section.blocks iteration by unrolling the loop
 * Transforms:
 *   {% for block in section.blocks %}
 *     <div>{{ block.settings.title }}</div>
 *   {% endfor %}
 * To:
 *   {% if blocks_count > 0 %}
 *     <div>{{ block_0_title }}</div>
 *   {% endif %}
 *   {% if blocks_count > 1 %}
 *     <div>{{ block_1_title }}</div>
 *   {% endif %}
 *   ...
 *
 * @param code - Liquid template code
 * @param maxBlocks - Maximum number of blocks to unroll (default: 10)
 * @returns Transformed code with unrolled block loops
 */
export function rewriteBlocksIteration(code: string, maxBlocks: number = MAX_UNROLL_BLOCKS): string {
  return code.replace(FOR_BLOCK_REGEX, (_match: string, blockVar: string, loopBody: string) => {
    // Check for nested for loops - skip transformation if detected
    if (NESTED_FOR_REGEX.test(loopBody)) {
      console.warn('[blocks-iteration] Nested for loops detected, skipping transformation');
      return _match; // Return original match unchanged
    }

    return unrollBlockLoop(blockVar, loopBody, maxBlocks);
  });
}

/**
 * Unroll a single for block loop into indexed block accesses
 * @param blockVar - The loop variable name (usually "block")
 * @param loopBody - The content inside the for loop
 * @param maxBlocks - Maximum iterations to unroll
 */
function unrollBlockLoop(blockVar: string, loopBody: string, maxBlocks: number): string {
  const unrolledBlocks: string[] = [];

  for (let i = 0; i < maxBlocks; i++) {
    // Transform block variable references for this iteration
    const transformedBody = transformBlockReferences(loopBody, blockVar, i);

    // Wrap in conditional: {% if blocks_count > N %}
    // Note: blocks_count is 1-indexed count, i is 0-indexed, so use `> i` not `>= i`
    unrolledBlocks.push(`{% if blocks_count > ${i} %}${transformedBody}{% endif %}`);
  }

  return unrolledBlocks.join('\n');
}

/**
 * Transform block variable references to indexed variables
 * Handles:
 *   - block.settings.property → block_N_property
 *   - block.type → block_N_type
 *   - block.id → block_N_id
 *   - block['settings']['property'] → block_N_property (bracket notation)
 *
 * @param body - Loop body content
 * @param blockVar - The block variable name to replace
 * @param index - The block index
 */
function transformBlockReferences(body: string, blockVar: string, index: number): string {
  const prefix = `block_${index}`;

  // Note: blockVar is already constrained to \w+ (alphanumeric + underscore) by capture group
  // Escaping is paranoia defense for future-proofing if regex changes
  const escapedVar = blockVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Transform block.settings.property → block_N_property
  let result = body.replace(
    new RegExp(`${escapedVar}\\.settings\\.([a-zA-Z_][a-zA-Z0-9_]*)`, 'g'),
    `${prefix}_$1`
  );

  // Transform block.settings['property'] or block.settings["property"] → block_N_property
  result = result.replace(
    new RegExp(`${escapedVar}\\.settings\\[['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\\]`, 'g'),
    `${prefix}_$1`
  );

  // Transform block.type → block_N_type
  result = result.replace(
    new RegExp(`${escapedVar}\\.type`, 'g'),
    `${prefix}_type`
  );

  // Transform block.id → block_N_id
  result = result.replace(
    new RegExp(`${escapedVar}\\.id`, 'g'),
    `${prefix}_id`
  );

  return result;
}
