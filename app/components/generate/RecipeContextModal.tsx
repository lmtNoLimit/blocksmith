/**
 * RecipeContextModal Component
 * Modal for collecting optional context before generating section
 * Displays dynamic context questions from recipe configuration
 */

import { useState, useRef, useEffect } from "react";
import type { CRORecipe } from "@prisma/client";

// Context field definition (matches server-side type)
interface ContextQuestion {
  field: string;
  label: string;
  options: string[];
}

// Context values provided by user
export interface RecipeContext {
  [key: string]: string | undefined;
}

/**
 * Parse context questions from recipe JSON field
 * Client-safe version of server parseContextQuestions
 */
function parseContextQuestions(recipe: CRORecipe): ContextQuestion[] {
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

export const CONTEXT_MODAL_ID = "recipe-context-modal";

export interface RecipeContextModalProps {
  recipe: CRORecipe | null;
  onSubmit: (context: RecipeContext) => void;
  onSkip: () => void;
}

/**
 * Modal for optional context collection
 * Shows dynamic fields based on recipe.contextQuestions
 * User can skip or provide context to enhance generation
 */
export function RecipeContextModal({
  recipe,
  onSubmit,
  onSkip
}: RecipeContextModalProps) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const modalRef = useRef<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const [contextValues, setContextValues] = useState<RecipeContext>({});

  // Parse context questions from recipe JSON field
  const contextQuestions = recipe ? parseContextQuestions(recipe) : [];
  const hasQuestions = contextQuestions.length > 0;

  // Show modal when recipe is provided
  useEffect(() => {
    if (recipe && modalRef.current) {
      // Reset context values for new recipe
      setContextValues({});
      modalRef.current?.showOverlay?.();
    }
  }, [recipe]);

  const handleFieldChange = (field: string, value: string) => {
    setContextValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    modalRef.current?.hideOverlay?.();
    onSubmit(contextValues);
  };

  const handleSkip = () => {
    modalRef.current?.hideOverlay?.();
    onSkip();
  };

  // If no recipe, render nothing but keep modal in DOM
  if (!recipe) {
    return (
      <s-modal ref={modalRef} id={CONTEXT_MODAL_ID} heading="Add Context">
        <s-text>Loading...</s-text>
      </s-modal>
    );
  }

  return (
    <s-modal
      ref={modalRef}
      id={CONTEXT_MODAL_ID}
      heading={`Customize: ${recipe.name}`}
    >
      <s-stack gap="large" direction="block">
        {/* Recipe summary */}
        <s-box background="subdued" padding="base" borderRadius="base">
          <s-stack gap="small">
            <s-text type="strong">Goal</s-text>
            <s-text>{recipe.businessProblem}</s-text>
          </s-stack>
        </s-box>

        {/* Context questions */}
        {hasQuestions ? (
          <s-stack gap="base" direction="block">
            <s-text color="subdued">
              Optional: Provide details for better results
            </s-text>

            {contextQuestions.map((question) => (
              <s-select
                key={question.field}
                label={question.label}
                value={contextValues[question.field] || ""}
                onChange={(e: Event) => {
                  const target = e.target as HTMLSelectElement;
                  handleFieldChange(question.field, target.value);
                }}
              >
                <s-option value="">Select...</s-option>
                {question.options.map((option) => (
                  <s-option key={option} value={option}>
                    {option}
                  </s-option>
                ))}
              </s-select>
            ))}
          </s-stack>
        ) : (
          <s-text color="subdued">
            No additional context needed for this recipe.
          </s-text>
        )}

        {/* CRO principles preview */}
        <s-stack gap="small">
          <s-text type="strong">CRO principles applied</s-text>
          <s-stack direction="inline" gap="small">
            {recipe.croPrinciples.map((principle) => (
              <s-badge key={principle} tone="info">
                {principle.replace("-", " ")}
              </s-badge>
            ))}
          </s-stack>
        </s-stack>
      </s-stack>

      {/* Modal footer actions */}
      <s-button slot="secondary-action" onClick={handleSkip}>
        Skip
      </s-button>
      <s-button slot="primary-action" variant="primary" onClick={handleSubmit}>
        Generate Section
      </s-button>
    </s-modal>
  );
}

/**
 * Helper to show the context modal programmatically
 */
export function showContextModal(): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const modal = document.getElementById(CONTEXT_MODAL_ID) as any;
  modal?.showOverlay?.();
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
