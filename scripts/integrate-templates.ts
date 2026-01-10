/**
 * Template Integration Script
 *
 * Merges validated Liquid code from generated templates into default-templates.ts.
 * Preserves existing templates with code (does not overwrite).
 *
 * Usage:
 *   npx tsx scripts/integrate-templates.ts [input-file]
 *   npx tsx scripts/integrate-templates.ts --verify
 *   npx tsx scripts/integrate-templates.ts --dry-run
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Types
// ============================================

interface GeneratedTemplate {
  title: string;
  category: string;
  code: string | null;
  error?: string;
  retries: number;
  duration: number;
}

interface GeneratedOutput {
  generatedAt: string;
  config: Record<string, unknown>;
  summary: {
    total: number;
    success: number;
    failed: number;
    avgDuration: number;
  };
  results: GeneratedTemplate[];
}

interface IntegrationResult {
  title: string;
  category: string;
  status: "added" | "skipped_has_code" | "skipped_no_code" | "failed";
  reason?: string;
}

interface IntegrationSummary {
  total: number;
  added: number;
  skippedHasCode: number;
  skippedNoCode: number;
  failed: number;
  timestamp: string;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Escape code for template literal embedding
 * Handles backticks and ${} interpolation
 */
function escapeTemplateCode(code: string): string {
  return code
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/`/g, "\\`") // Escape backticks
    .replace(/\$\{/g, "\\${"); // Escape template literal interpolation
}

/**
 * Find the latest generated templates file
 */
function findLatestGeneratedFile(): string | null {
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    return null;
  }

  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.startsWith("generated-templates-") && f.endsWith(".json"))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(outputDir, files[0]) : null;
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  inputPath: string | null;
  verify: boolean;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);

  const verify = args.includes("--verify");
  const dryRun = args.includes("--dry-run");

  // Find input file (first non-flag argument)
  const inputPath =
    args.find((a) => !a.startsWith("--")) || findLatestGeneratedFile();

  return { inputPath, verify, dryRun };
}

// ============================================
// Core Integration Logic
// ============================================

/**
 * Check if a template already has code in the source file
 */
function templateHasCode(content: string, title: string): boolean {
  // Escape special regex characters in title
  const titleEscaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match template object pattern: title: "X" followed by code: ` anywhere before next title: "
  // This handles the complex nested structure of the templates
  const templatePattern = new RegExp(
    `title:\\s*["']${titleEscaped}["'][\\s\\S]*?code:\\s*\``,
    "m"
  );

  // Also check if there's a code property before the next template starts
  const templateBlockPattern = new RegExp(
    `title:\\s*["']${titleEscaped}["'][\\s\\S]*?(?=title:\\s*["']|$)`,
    "m"
  );

  const block = content.match(templateBlockPattern);
  if (block) {
    return /code:\s*`/.test(block[0]);
  }

  return templatePattern.test(content);
}

/**
 * Insert code property into a template definition
 * Returns the modified content and success status
 */
function insertCodeIntoTemplate(
  content: string,
  title: string,
  code: string
): { content: string; success: boolean; error?: string } {
  const titleEscaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Find the template by its title and locate the prompt property
  // We'll insert code after the prompt property
  const templatePattern = new RegExp(
    `(title:\\s*["']${titleEscaped}["'][\\s\\S]*?prompt:\\s*["'][^"']*["'],?)\\s*(\\},?)`,
    "m"
  );

  const match = content.match(templatePattern);
  if (!match) {
    return {
      content,
      success: false,
      error: `Could not find template with title "${title}"`,
    };
  }

  const escapedCode = escapeTemplateCode(code);

  // Insert code property after prompt, before closing brace
  const newContent = content.replace(
    templatePattern,
    `$1\n    code: \`${escapedCode}\`,\n  $2`
  );

  // Verify the replacement happened
  if (newContent === content) {
    return {
      content,
      success: false,
      error: "Replacement did not change content",
    };
  }

  return { content: newContent, success: true };
}

/**
 * Main integration function
 */
async function integrateTemplates(
  generatedPath: string,
  dryRun: boolean
): Promise<{ results: IntegrationResult[]; summary: IntegrationSummary }> {
  // Read generated templates
  const generated: GeneratedOutput = JSON.parse(
    fs.readFileSync(generatedPath, "utf-8")
  );

  // Read current default-templates.ts
  const templatePath = path.join(
    __dirname,
    "..",
    "app",
    "data",
    "default-templates.ts"
  );
  let templateContent = fs.readFileSync(templatePath, "utf-8");

  const results: IntegrationResult[] = [];
  let addedCount = 0;
  let skippedHasCode = 0;
  let skippedNoCode = 0;
  let failedCount = 0;

  console.log(`\n📋 Processing ${generated.results.length} templates...\n`);

  for (const gen of generated.results) {
    // Skip templates without generated code
    if (!gen.code) {
      console.log(`⏭️  SKIP (no code): ${gen.category}/${gen.title}`);
      results.push({
        title: gen.title,
        category: gen.category,
        status: "skipped_no_code",
        reason: gen.error || "No code generated",
      });
      skippedNoCode++;
      continue;
    }

    // Check if template already has code (preserve existing)
    if (templateHasCode(templateContent, gen.title)) {
      console.log(`⏭️  SKIP (has code): ${gen.category}/${gen.title}`);
      results.push({
        title: gen.title,
        category: gen.category,
        status: "skipped_has_code",
        reason: "Template already has pre-built code",
      });
      skippedHasCode++;
      continue;
    }

    // Insert code into template
    const { content, success, error } = insertCodeIntoTemplate(
      templateContent,
      gen.title,
      gen.code
    );

    if (success) {
      templateContent = content;
      console.log(`✅ ADDED: ${gen.category}/${gen.title}`);
      results.push({
        title: gen.title,
        category: gen.category,
        status: "added",
      });
      addedCount++;
    } else {
      console.log(`❌ FAILED: ${gen.category}/${gen.title} - ${error}`);
      results.push({
        title: gen.title,
        category: gen.category,
        status: "failed",
        reason: error,
      });
      failedCount++;
    }
  }

  // Write updated file (unless dry run)
  if (!dryRun && addedCount > 0) {
    fs.writeFileSync(templatePath, templateContent);
    console.log(`\n💾 Updated: ${templatePath}`);
  } else if (dryRun) {
    console.log("\n⚠️  DRY RUN - no files modified");
  }

  const summary: IntegrationSummary = {
    total: generated.results.length,
    added: addedCount,
    skippedHasCode,
    skippedNoCode,
    failed: failedCount,
    timestamp: new Date().toISOString(),
  };

  return { results, summary };
}

// ============================================
// Verification Function
// ============================================

/**
 * Verify integrated templates are syntactically valid
 */
async function verifyIntegration(): Promise<{
  valid: boolean;
  stats: { total: number; withCode: number; withoutCode: number };
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Dynamic import to check syntax and load templates
    const { DEFAULT_TEMPLATES } = await import(
      "../app/data/default-templates.js"
    );

    const withCode = DEFAULT_TEMPLATES.filter(
      (t: { code?: string }) => t.code
    );
    const withoutCode = DEFAULT_TEMPLATES.filter(
      (t: { code?: string }) => !t.code
    );

    console.log("\n📊 Template Statistics:");
    console.log(`   Total templates: ${DEFAULT_TEMPLATES.length}`);
    console.log(`   With code: ${withCode.length}`);
    console.log(`   Without code: ${withoutCode.length}`);

    // Validate each code block
    let parseErrors = 0;
    for (const template of withCode) {
      const code = template.code as string; // Already filtered to have code

      // Check for schema block
      if (!/{%\s*schema\s*%}/.test(code)) {
        errors.push(`${template.title}: Missing {% schema %} block`);
        parseErrors++;
      }

      // Check for endschema
      if (!/{%\s*endschema\s*%}/.test(code)) {
        errors.push(`${template.title}: Missing {% endschema %} block`);
        parseErrors++;
      }

      // Try to parse schema JSON
      const schemaMatch = code.match(
        /{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/
      );
      if (schemaMatch) {
        try {
          JSON.parse(schemaMatch[1].trim());
        } catch {
          errors.push(`${template.title}: Invalid JSON in schema`);
          parseErrors++;
        }
      }
    }

    if (parseErrors === 0) {
      console.log("✅ All templates validated successfully");
    } else {
      console.log(`❌ ${parseErrors} templates have parsing issues`);
    }

    return {
      valid: parseErrors === 0,
      stats: {
        total: DEFAULT_TEMPLATES.length,
        withCode: withCode.length,
        withoutCode: withoutCode.length,
      },
      errors,
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Unknown error during import";
    errors.push(`Module import failed: ${msg}`);
    return {
      valid: false,
      stats: { total: 0, withCode: 0, withoutCode: 0 },
      errors,
    };
  }
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("        Template Integration Script");
  console.log("═══════════════════════════════════════════════════════════");

  const { inputPath, verify, dryRun } = parseArgs();

  // Verification mode
  if (verify) {
    console.log("\n🔍 Running verification...");
    const result = await verifyIntegration();

    if (result.errors.length > 0) {
      console.log("\n❌ Errors found:");
      for (const err of result.errors) {
        console.log(`   • ${err}`);
      }
    }

    console.log("\n═══════════════════════════════════════════════════════════\n");
    process.exit(result.valid ? 0 : 1);
  }

  // Integration mode
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error("\n❌ No input file found.");
    console.error("   Run: npx tsx scripts/batch-generate-templates.ts first");
    console.error("   Or specify: npx tsx scripts/integrate-templates.ts [file]\n");
    process.exit(1);
  }

  if (dryRun) {
    console.log("\n⚠️  DRY RUN MODE - No files will be modified\n");
  }

  console.log(`\n📁 Source: ${inputPath}`);

  const { results, summary } = await integrateTemplates(inputPath, dryRun);

  // Print summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                    INTEGRATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\n📊 Summary:`);
  console.log(`   Total:              ${summary.total}`);
  console.log(`   ✅ Added:            ${summary.added}`);
  console.log(`   ⏭️  Skipped (has code): ${summary.skippedHasCode}`);
  console.log(`   ⏭️  Skipped (no code):  ${summary.skippedNoCode}`);
  console.log(`   ❌ Failed:           ${summary.failed}`);

  // Write integration report
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const timestamp = Date.now();
  const reportPath = path.join(
    outputDir,
    `integration-report-${timestamp}.json`
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ summary, results }, null, 2)
  );
  console.log(`\n📁 Report: ${reportPath}`);

  // Verification
  console.log("\n🔍 Running verification...");
  const verifyResult = await verifyIntegration();

  console.log("\n═══════════════════════════════════════════════════════════\n");

  // Exit with appropriate code
  if (summary.failed > 0 || !verifyResult.valid) {
    process.exit(1);
  }
  process.exit(0);
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
