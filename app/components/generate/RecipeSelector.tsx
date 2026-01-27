/**
 * RecipeSelector Component
 * Responsive grid of CRO recipe cards with single selection
 * Handles recipe selection and triggers context modal
 */

import { useState } from "react";
import type { CRORecipe } from "@prisma/client";
import { RecipeCard } from "./RecipeCard";

export interface RecipeSelectorProps {
  recipes: CRORecipe[];
  onRecipeSelect: (recipe: CRORecipe) => void;
  disabled?: boolean;
}

/**
 * Recipe selection grid - responsive 4→2→1 columns
 * Single selection (radio behavior) managed via state
 * "Continue" button triggers onRecipeSelect callback
 */
export function RecipeSelector({
  recipes,
  onRecipeSelect,
  disabled = false
}: RecipeSelectorProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const handleSelect = (slug: string) => {
    setSelectedSlug(slug);
  };

  const handleContinue = () => {
    if (!selectedSlug) return;
    const recipe = recipes.find((r) => r.slug === selectedSlug);
    if (recipe) {
      onRecipeSelect(recipe);
    }
  };

  const selectedRecipe = recipes.find((r) => r.slug === selectedSlug);

  return (
    <s-stack gap="large" direction="block">
      {/* Header */}
      <s-stack gap="small">
        <s-heading accessibilityRole="heading">
          What conversion goal do you want to achieve?
        </s-heading>
        <s-text color="subdued">
          Choose a recipe optimized for your specific business goal. Each recipe
          uses proven CRO principles.
        </s-text>
      </s-stack>

      {/* Recipe Grid - responsive layout */}
      <s-grid
        gap="base"
        gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
      >
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.slug}
            recipe={recipe}
            isSelected={selectedSlug === recipe.slug}
            onSelect={handleSelect}
            disabled={disabled}
          />
        ))}
      </s-grid>

      {/* Continue button - appears when recipe selected */}
      {selectedSlug && (
        <s-stack direction="inline" justifyContent="end" alignItems="center">
          <s-text color="subdued">
            Selected: {selectedRecipe?.name}
          </s-text>
          <s-button
            variant="primary"
            onClick={handleContinue}
            disabled={disabled || undefined}
          >
            Continue
          </s-button>
        </s-stack>
      )}
    </s-stack>
  );
}
