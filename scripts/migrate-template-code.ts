/**
 * One-Time Template Code Migration Script
 *
 * Updates all shops' templates with new pre-built Liquid code.
 * Run this after integrating new template code into default-templates.ts.
 *
 * Usage:
 *   npx tsx scripts/migrate-template-code.ts
 *   npx tsx scripts/migrate-template-code.ts --dry-run
 *   npx tsx scripts/migrate-template-code.ts --shop=example.myshopify.com
 */

import { fileURLToPath } from "url";
import * as path from "path";

// ESM module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports for app modules
const prismaModule = await import("../app/db.server");
const prisma = prismaModule.default;
const { DEFAULT_TEMPLATES } = await import("../app/data/default-templates");

// ============================================
// Types
// ============================================

interface MigrationResult {
  shop: string;
  templatesChecked: number;
  templatesUpdated: number;
  updateDetails: Array<{ title: string; category: string }>;
}

interface MigrationSummary {
  shopsProcessed: number;
  totalUpdated: number;
  timestamp: string;
  dryRun: boolean;
}

// ============================================
// CLI Arguments
// ============================================

function parseArgs(): { dryRun: boolean; shop?: string } {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const shopArg = args.find((a) => a.startsWith("--shop="));
  const shop = shopArg ? shopArg.split("=")[1] : undefined;
  return { dryRun, shop };
}

// ============================================
// Migration Logic
// ============================================

/**
 * Migrate templates for a single shop
 */
async function migrateShop(
  shop: string,
  dryRun: boolean
): Promise<MigrationResult> {
  // Get templates without code
  const templatesNeedingCode = await prisma.sectionTemplate.findMany({
    where: {
      shop,
      code: null,
    },
    select: { id: true, title: true, category: true },
  });

  const updateDetails: Array<{ title: string; category: string }> = [];
  let updated = 0;

  for (const dbTemplate of templatesNeedingCode) {
    // Find matching default template with code
    const defaultTemplate = DEFAULT_TEMPLATES.find(
      (t) => t.title === dbTemplate.title && t.code
    );

    if (defaultTemplate?.code) {
      if (!dryRun) {
        await prisma.sectionTemplate.update({
          where: { id: dbTemplate.id },
          data: { code: defaultTemplate.code },
        });
      }
      updateDetails.push({
        title: dbTemplate.title,
        category: dbTemplate.category,
      });
      updated++;
    }
  }

  return {
    shop,
    templatesChecked: templatesNeedingCode.length,
    templatesUpdated: updated,
    updateDetails,
  };
}

/**
 * Migrate all shops
 */
async function migrateAllShops(
  dryRun: boolean,
  targetShop?: string
): Promise<{ results: MigrationResult[]; summary: MigrationSummary }> {
  // Get all unique shops (or single shop if specified)
  let shops: Array<{ shop: string }>;

  if (targetShop) {
    shops = [{ shop: targetShop }];
  } else {
    shops = await prisma.sectionTemplate.findMany({
      select: { shop: true },
      distinct: ["shop"],
    });
  }

  console.log(`\n📋 Migrating ${shops.length} shop(s)...\n`);

  const results: MigrationResult[] = [];
  let totalUpdated = 0;

  for (const { shop } of shops) {
    const result = await migrateShop(shop, dryRun);
    results.push(result);
    totalUpdated += result.templatesUpdated;

    // Log progress
    if (result.templatesUpdated > 0) {
      console.log(
        `✅ ${shop}: ${result.templatesUpdated}/${result.templatesChecked} templates updated`
      );
    } else {
      console.log(`⏭️  ${shop}: No updates needed (0/${result.templatesChecked})`);
    }
  }

  const summary: MigrationSummary = {
    shopsProcessed: shops.length,
    totalUpdated,
    timestamp: new Date().toISOString(),
    dryRun,
  };

  return { results, summary };
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("        Template Code Migration Script");
  console.log("═══════════════════════════════════════════════════════════");

  const { dryRun, shop } = parseArgs();

  if (dryRun) {
    console.log("\n⚠️  DRY RUN MODE - No database changes will be made\n");
  }

  // Show available code count
  const templatesWithCode = DEFAULT_TEMPLATES.filter((t) => t.code).length;
  console.log(
    `\n📊 DEFAULT_TEMPLATES: ${templatesWithCode}/${DEFAULT_TEMPLATES.length} have pre-built code`
  );

  if (templatesWithCode === 0) {
    console.log("\n⚠️  No templates have pre-built code. Run integration first.");
    console.log("   npx tsx scripts/integrate-templates.ts\n");
    process.exit(0);
  }

  try {
    const { results, summary } = await migrateAllShops(dryRun, shop);

    // Print summary
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("                    MIGRATION COMPLETE");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`\n📊 Summary:`);
    console.log(`   Shops processed:    ${summary.shopsProcessed}`);
    console.log(`   Templates updated:  ${summary.totalUpdated}`);
    console.log(`   Dry run:            ${summary.dryRun}`);

    // Show breakdown by category if any updates
    if (summary.totalUpdated > 0) {
      const byCategory: Record<string, number> = {};
      for (const result of results) {
        for (const detail of result.updateDetails) {
          byCategory[detail.category] = (byCategory[detail.category] || 0) + 1;
        }
      }
      console.log("\n📂 Updates by category:");
      for (const [category, count] of Object.entries(byCategory).sort()) {
        console.log(`   ${category}: ${count}`);
      }
    }

    console.log("\n═══════════════════════════════════════════════════════════\n");

    // Disconnect prisma
    await prisma.$disconnect();
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
