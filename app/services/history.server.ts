import prisma from "../db.server";
import type { GenerationHistory } from "@prisma/client";

export interface CreateHistoryInput {
  shop: string;
  prompt: string;
  code: string;
  tone?: string;
  style?: string;
}

export interface UpdateHistoryInput {
  themeId?: string;
  themeName?: string;
  fileName?: string;
  status?: string;
  isFavorite?: boolean;
}

/**
 * History service for managing generation history
 */
export const historyService = {
  /**
   * Create a new history entry after generation
   */
  async create(input: CreateHistoryInput): Promise<GenerationHistory> {
    return prisma.generationHistory.create({
      data: {
        shop: input.shop,
        prompt: input.prompt,
        code: input.code,
        tone: input.tone,
        style: input.style,
        status: "generated",
      },
    });
  },

  /**
   * Update history entry (e.g., when saved to theme)
   */
  async update(id: string, shop: string, input: UpdateHistoryInput): Promise<GenerationHistory | null> {
    // Verify ownership before update
    const existing = await prisma.generationHistory.findFirst({
      where: { id, shop },
    });

    if (!existing) return null;

    return prisma.generationHistory.update({
      where: { id },
      data: input,
    });
  },

  /**
   * Get paginated history for a shop
   */
  async getByShop(
    shop: string,
    options: { page?: number; limit?: number; status?: string; favoritesOnly?: boolean } = {}
  ): Promise<{ items: GenerationHistory[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, status, favoritesOnly } = options;
    const skip = (page - 1) * limit;

    const where = {
      shop,
      ...(status && { status }),
      ...(favoritesOnly && { isFavorite: true }),
    };

    const [items, total] = await Promise.all([
      prisma.generationHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.generationHistory.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get single history entry by ID
   */
  async getById(id: string, shop: string): Promise<GenerationHistory | null> {
    return prisma.generationHistory.findFirst({
      where: { id, shop },
    });
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, shop: string): Promise<GenerationHistory | null> {
    const existing = await prisma.generationHistory.findFirst({
      where: { id, shop },
    });

    if (!existing) return null;

    return prisma.generationHistory.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
    });
  },

  /**
   * Delete history entry
   */
  async delete(id: string, shop: string): Promise<boolean> {
    const existing = await prisma.generationHistory.findFirst({
      where: { id, shop },
    });

    if (!existing) return false;

    await prisma.generationHistory.delete({ where: { id } });
    return true;
  },

  /**
   * Get most recent history entry for a shop
   */
  async getMostRecent(shop: string): Promise<GenerationHistory | null> {
    return prisma.generationHistory.findFirst({
      where: { shop },
      orderBy: { createdAt: "desc" },
    });
  },
};
