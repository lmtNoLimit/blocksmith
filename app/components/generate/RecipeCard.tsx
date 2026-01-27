/**
 * RecipeCard Component
 * Individual recipe card for CRO recipe selection grid
 * Shows icon, name, business problem with selection state
 */

import type { CRORecipe } from "@prisma/client";

// Map PascalCase icon names from DB to Polaris s-icon type values
const ICON_MAP: Record<string, string> = {
  CartIcon: "cart",
  ShieldIcon: "shield-check",
  ViewIcon: "view",
  EmailIcon: "email",
  PlusIcon: "plus",
  DiscountIcon: "discount",
  HomeIcon: "home",
  QuestionIcon: "question"
};

export interface RecipeCardProps {
  recipe: CRORecipe;
  isSelected: boolean;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

/**
 * Recipe card with icon, name, and business problem description
 * Uses s-clickable for accessibility + s-box for visual styling
 * Selected state shows highlighted background/border
 */
export function RecipeCard({
  recipe,
  isSelected,
  onSelect,
  disabled = false
}: RecipeCardProps) {
  const iconType = ICON_MAP[recipe.icon] || "wand";

  const handleClick = () => {
    if (!disabled) {
      onSelect(recipe.slug);
    }
  };

  // Selection visual feedback via background + border
  const background = isSelected ? "subdued" : "base";
  const borderColor = isSelected ? "strong" : "subdued";

  return (
    <s-clickable
      onClick={handleClick}
      disabled={disabled || undefined}
      accessibilityLabel={`${recipe.name}: ${recipe.businessProblem}`}
    >
      <s-box
        padding="base"
        border="base"
        borderRadius="base"
        background={background}
        borderColor={borderColor}
      >
        <s-stack gap="small" direction="block" alignItems="start">
          {/* Icon - cast to any for Polaris compatibility */}
          {/* eslint-disable @typescript-eslint/no-explicit-any */}
          <s-icon type={iconType as any} />
          {/* eslint-enable @typescript-eslint/no-explicit-any */}

          {/* Name */}
          <s-text type="strong">{recipe.name}</s-text>

          {/* Business problem - subdued, truncated */}
          <s-text color="subdued">
            {recipe.businessProblem.length > 80
              ? `${recipe.businessProblem.slice(0, 80)}...`
              : recipe.businessProblem}
          </s-text>
        </s-stack>
      </s-box>
    </s-clickable>
  );
}
