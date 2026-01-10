import prisma from "../db.server";
import { DEFAULT_TEMPLATES, type DefaultTemplate } from "../data/default-templates";

/**
 * Template Seeder Service
 *
 * Seeds default section templates for a shop on first access.
 * Handles both initial seeding and migration of pre-built code
 * to existing templates.
 */
export const templateSeeder = {
  /**
   * Check if shop has any templates
   */
  async hasTemplates(shop: string): Promise<boolean> {
    const count = await prisma.sectionTemplate.count({
      where: { shop },
    });
    return count > 0;
  },

  /**
   * Update existing templates with new pre-built code
   * Only updates templates that have null code in DB but code in DEFAULT_TEMPLATES
   * Called during shop access to sync code updates silently
   */
  async updateTemplatesWithCode(shop: string): Promise<{ updated: number }> {
    // Get templates without code in DB
    const templatesNeedingCode = await prisma.sectionTemplate.findMany({
      where: {
        shop,
        code: null,
      },
      select: { id: true, title: true },
    });

    if (templatesNeedingCode.length === 0) {
      return { updated: 0 };
    }

    // Match with DEFAULT_TEMPLATES by title and update if code available
    let updated = 0;
    for (const dbTemplate of templatesNeedingCode) {
      const defaultTemplate = DEFAULT_TEMPLATES.find(
        (t) => t.title === dbTemplate.title && t.code
      );

      if (defaultTemplate?.code) {
        await prisma.sectionTemplate.update({
          where: { id: dbTemplate.id },
          data: { code: defaultTemplate.code },
        });
        updated++;
      }
    }

    return { updated };
  },

  /**
   * Seed default templates for a shop
   * If shop already has templates, runs migration to update code
   * For new shops, seeds all templates with pre-built code
   */
  async seedDefaultTemplates(
    shop: string
  ): Promise<{ seeded: boolean; count: number; updated: number }> {
    // Check if already seeded
    const hasExisting = await this.hasTemplates(shop);
    if (hasExisting) {
      // Migrate existing templates with new pre-built code
      const { updated } = await this.updateTemplatesWithCode(shop);
      return { seeded: false, count: 0, updated };
    }

    // Fresh seed for new shops
    const templates = DEFAULT_TEMPLATES.map((template: DefaultTemplate) => ({
      shop,
      title: template.title,
      description: template.description,
      category: template.category,
      icon: template.icon,
      prompt: template.prompt,
      code: template.code || null,
    }));

    await prisma.sectionTemplate.createMany({
      data: templates,
    });

    return { seeded: true, count: templates.length, updated: 0 };
  },

  /**
   * Reset templates to defaults
   * Deletes all existing templates and reseeds
   */
  async resetToDefaults(shop: string): Promise<{ count: number }> {
    // Delete all existing templates for shop
    await prisma.sectionTemplate.deleteMany({
      where: { shop },
    });

    // Seed default templates
    const templates = DEFAULT_TEMPLATES.map((template: DefaultTemplate) => ({
      shop,
      title: template.title,
      description: template.description,
      category: template.category,
      icon: template.icon,
      prompt: template.prompt,
      code: template.code || null, // Include pre-built code if available
    }));

    await prisma.sectionTemplate.createMany({
      data: templates,
    });

    return { count: templates.length };
  },

  /**
   * Get count of default templates
   */
  getDefaultTemplateCount(): number {
    return DEFAULT_TEMPLATES.length;
  },

  /**
   * Get default templates (for reference/preview)
   */
  getDefaultTemplates(): DefaultTemplate[] {
    return DEFAULT_TEMPLATES;
  },
};
