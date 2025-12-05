import prisma from "../db.server";
import type { Section } from "@prisma/client";

/**
 * Generate a default section name from prompt text
 * Truncates to ~50 chars at last word boundary
 */
function generateDefaultName(prompt: string): string {
  const maxLength = 50;
  const trimmed = prompt.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const truncated = trimmed.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + "...";
  }
  return truncated + "...";
}

export interface CreateSectionInput {
  shop: string;
  prompt: string;
  code: string;
  name?: string;
  tone?: string;
  style?: string;
}

export interface UpdateSectionInput {
  name?: string;
  themeId?: string;
  themeName?: string;
  fileName?: string;
  status?: string;
  isFavorite?: boolean;
}

/**
 * Section service for managing AI-generated sections
 */
export const sectionService = {
  /**
   * Create a new section entry after generation
   */
  async create(input: CreateSectionInput): Promise<Section> {
    return prisma.section.create({
      data: {
        shop: input.shop,
        name: input.name || generateDefaultName(input.prompt),
        prompt: input.prompt,
        code: input.code,
        tone: input.tone,
        style: input.style,
        status: "generated",
      },
    });
  },

  /**
   * Update section entry (e.g., when saved to theme)
   */
  async update(id: string, shop: string, input: UpdateSectionInput): Promise<Section | null> {
    // Verify ownership before update
    const existing = await prisma.section.findFirst({
      where: { id, shop },
    });

    if (!existing) return null;

    return prisma.section.update({
      where: { id },
      data: input,
    });
  },

  /**
   * Get paginated sections for a shop
   */
  async getByShop(
    shop: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      favoritesOnly?: boolean;
      search?: string;
      sort?: "newest" | "oldest";
    } = {}
  ): Promise<{ items: Section[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, status, favoritesOnly, search, sort = "newest" } = options;
    const skip = (page - 1) * limit;

    const where = {
      shop,
      ...(status && { status }),
      ...(favoritesOnly && { isFavorite: true }),
      ...(search && {
        prompt: {
          contains: search,
          mode: "insensitive" as const
        }
      }),
    };

    const [items, total] = await Promise.all([
      prisma.section.findMany({
        where,
        orderBy: { createdAt: sort === "newest" ? "desc" : "asc" },
        skip,
        take: limit,
      }),
      prisma.section.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get single section by ID
   */
  async getById(id: string, shop: string): Promise<Section | null> {
    return prisma.section.findFirst({
      where: { id, shop },
    });
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, shop: string): Promise<Section | null> {
    const existing = await prisma.section.findFirst({
      where: { id, shop },
    });

    if (!existing) return null;

    return prisma.section.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
    });
  },

  /**
   * Delete section entry
   */
  async delete(id: string, shop: string): Promise<boolean> {
    const existing = await prisma.section.findFirst({
      where: { id, shop },
    });

    if (!existing) return false;

    await prisma.section.delete({ where: { id } });
    return true;
  },

  /**
   * Get most recent section for a shop
   */
  async getMostRecent(shop: string): Promise<Section | null> {
    return prisma.section.findFirst({
      where: { shop },
      orderBy: { createdAt: "desc" },
    });
  },
};
