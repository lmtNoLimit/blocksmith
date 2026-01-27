/**
 * CRO Recipe Service
 * Manages CRO-focused recipes for AI section generation
 */

import prisma from "../db.server";
import type { CRORecipe } from "@prisma/client";

// Context field definition for recipe forms
export interface ContextQuestion {
  field: string;
  label: string;
  options: string[];
}

// Context values provided by user when using a recipe
export interface RecipeContext {
  [key: string]: string | undefined;
}

/**
 * Get all active CRO recipes ordered by display order
 */
export async function getActiveRecipes(): Promise<CRORecipe[]> {
  return prisma.cRORecipe.findMany({
    where: { active: true },
    orderBy: { order: "asc" }
  });
}

/**
 * Get a single recipe by its slug
 */
export async function getRecipeBySlug(slug: string): Promise<CRORecipe | null> {
  return prisma.cRORecipe.findUnique({
    where: { slug }
  });
}

/**
 * Get a single recipe by its ID
 */
export async function getRecipeById(id: string): Promise<CRORecipe | null> {
  return prisma.cRORecipe.findUnique({
    where: { id }
  });
}

/**
 * Build the final prompt by injecting context into the recipe template
 * Replaces {{CONTEXT}} placeholder with user-provided context values
 */
export function buildRecipePrompt(recipe: CRORecipe, context?: RecipeContext): string {
  let contextSection = "";

  if (context && Object.keys(context).length > 0) {
    const contextLines = Object.entries(context)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => `- ${formatContextKey(key)}: ${value}`);

    if (contextLines.length > 0) {
      contextSection = `\nUSER CONTEXT:\n${contextLines.join("\n")}`;
    }
  }

  return recipe.promptTemplate.replace("{{CONTEXT}}", contextSection);
}

/**
 * Format context key for display (camelCase to Title Case)
 */
function formatContextKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Parse context questions from JSON field
 */
export function parseContextQuestions(recipe: CRORecipe): ContextQuestion[] {
  if (!recipe.contextQuestions) return [];

  try {
    const questions = recipe.contextQuestions as unknown;
    if (Array.isArray(questions)) {
      return questions.filter(
        (q): q is ContextQuestion =>
          typeof q === "object" &&
          q !== null &&
          "field" in q &&
          "label" in q &&
          "options" in q
      );
    }
  } catch {
    console.error("Failed to parse context questions for recipe:", recipe.slug);
  }

  return [];
}

/**
 * Get recipes filtered by CRO principle
 */
export async function getRecipesByPrinciple(principle: string): Promise<CRORecipe[]> {
  return prisma.cRORecipe.findMany({
    where: {
      active: true,
      croPrinciples: { has: principle }
    },
    orderBy: { order: "asc" }
  });
}

/**
 * CRO Recipe service export object (alternative pattern)
 */
export const croRecipeService = {
  getActiveRecipes,
  getRecipeBySlug,
  getRecipeById,
  buildRecipePrompt,
  parseContextQuestions,
  getRecipesByPrinciple
};
