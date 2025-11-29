import prisma from "../db.server";
import type { SectionTemplate } from "@prisma/client";

export interface CreateTemplateInput {
  shop: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  prompt: string;
  code?: string;
}

export interface UpdateTemplateInput {
  title?: string;
  description?: string;
  category?: string;
  icon?: string;
  prompt?: string;
  code?: string;
  isFavorite?: boolean;
}

/**
 * Template service for managing section templates
 */
export const templateService = {
  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput): Promise<SectionTemplate> {
    return prisma.sectionTemplate.create({
      data: {
        shop: input.shop,
        title: input.title,
        description: input.description,
        category: input.category,
        icon: input.icon,
        prompt: input.prompt,
        code: input.code,
      },
    });
  },

  /**
   * Update a template
   */
  async update(id: string, shop: string, input: UpdateTemplateInput): Promise<SectionTemplate | null> {
    const existing = await prisma.sectionTemplate.findFirst({
      where: { id, shop },
    });

    if (!existing) return null;

    return prisma.sectionTemplate.update({
      where: { id },
      data: input,
    });
  },

  /**
   * Get all templates for a shop
   */
  async getByShop(
    shop: string,
    options: { category?: string; favoritesOnly?: boolean } = {}
  ): Promise<SectionTemplate[]> {
    const { category, favoritesOnly } = options;

    return prisma.sectionTemplate.findMany({
      where: {
        shop,
        ...(category && { category }),
        ...(favoritesOnly && { isFavorite: true }),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Get single template by ID
   */
  async getById(id: string, shop: string): Promise<SectionTemplate | null> {
    return prisma.sectionTemplate.findFirst({
      where: { id, shop },
    });
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, shop: string): Promise<SectionTemplate | null> {
    const existing = await prisma.sectionTemplate.findFirst({
      where: { id, shop },
    });

    if (!existing) return null;

    return prisma.sectionTemplate.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
    });
  },

  /**
   * Delete template
   */
  async delete(id: string, shop: string): Promise<boolean> {
    const existing = await prisma.sectionTemplate.findFirst({
      where: { id, shop },
    });

    if (!existing) return false;

    await prisma.sectionTemplate.delete({ where: { id } });
    return true;
  },

  /**
   * Duplicate template
   */
  async duplicate(id: string, shop: string): Promise<SectionTemplate | null> {
    const existing = await prisma.sectionTemplate.findFirst({
      where: { id, shop },
    });

    if (!existing) return null;

    return prisma.sectionTemplate.create({
      data: {
        shop: existing.shop,
        title: `${existing.title} (Copy)`,
        description: existing.description,
        category: existing.category,
        icon: existing.icon,
        prompt: existing.prompt,
        code: existing.code,
        isFavorite: false,
      },
    });
  },
};
