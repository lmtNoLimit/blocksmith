import { useState, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  useActionData,
  useNavigation,
  useSubmit,
  useNavigate,
  useLoaderData,
} from "react-router";
import type { CRORecipe } from "@prisma/client";
import { authenticate } from "../shopify.server";
import { sectionService } from "../services/section.server";
import { chatService } from "../services/chat.server";
import {
  getActiveRecipes,
  getRecipeBySlug,
  buildRecipePrompt,
} from "../services/cro-recipe.server";
import { sanitizeUserInput } from "../utils/input-sanitizer";
import { RecipeSelector } from "../components/generate/RecipeSelector";
import {
  RecipeContextModal,
  type RecipeContext,
} from "../components/generate/RecipeContextModal";

/**
 * /sections/new route - CRO Recipe-based section creation
 * Recipe selection grid → Optional context modal → AI generation
 */

interface LoaderData {
  recipes: CRORecipe[];
  prebuiltCode: string | null;
  prebuiltName: string | null;
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<LoaderData> {
  await authenticate.admin(request);
  const url = new URL(request.url);

  // Handle pre-built code from "Use As-Is" template flow (backward compat)
  const prebuiltCode = url.searchParams.get("code");
  const prebuiltName = url.searchParams.get("name");

  // Fetch active CRO recipes
  try {
    const recipes = await getActiveRecipes();
    return {
      recipes,
      prebuiltCode,
      prebuiltName,
    };
  } catch (error) {
    console.error("Failed to fetch CRO recipes:", error);
    return {
      recipes: [],
      prebuiltCode,
      prebuiltName,
    };
  }
}

interface ActionData {
  sectionId?: string;
  error?: string;
}

export async function action({
  request,
}: ActionFunctionArgs): Promise<ActionData> {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  // Check for pre-built code path (from "Use As-Is" template flow)
  const prebuiltCode = formData.get("prebuiltCode") as string | null;
  const prebuiltName = formData.get("prebuiltName") as string | null;

  // Pre-built code path: create section directly without AI
  if (prebuiltCode) {
    try {
      const section = await sectionService.create({
        shop: session.shop,
        prompt: prebuiltName || "Pre-built template",
        code: prebuiltCode,
      });

      const conversation = await chatService.getOrCreateConversation(
        section.id,
        session.shop,
      );
      const { sanitized: safeName } = sanitizeUserInput(
        prebuiltName || "Pre-built template",
      );
      await chatService.addUserMessage(
        conversation.id,
        `Created from template: ${safeName}`,
      );

      return { sectionId: section.id };
    } catch (error) {
      console.error("Failed to create section from template:", error);
      return { error: "Failed to create section. Please try again." };
    }
  }

  // Recipe-based path
  const recipeSlug = formData.get("recipeSlug") as string;
  const recipeContextRaw = formData.get("recipeContext") as string | null;

  if (!recipeSlug) {
    return { error: "Please select a recipe" };
  }

  try {
    // Fetch the selected recipe
    const recipe = await getRecipeBySlug(recipeSlug);
    if (!recipe) {
      return { error: "Recipe not found" };
    }

    // Parse context if provided
    let recipeContext: RecipeContext = {};
    if (recipeContextRaw) {
      try {
        recipeContext = JSON.parse(recipeContextRaw);
      } catch {
        console.warn("Failed to parse recipe context, using empty context");
      }
    }

    // Build the full prompt from recipe template + context
    const prompt = buildRecipePrompt(recipe, recipeContext);

    // Sanitize the generated prompt
    const { sanitized: safePrompt } = sanitizeUserInput(prompt);

    // Create section (starts as draft, empty code until AI generates)
    const section = await sectionService.create({
      shop: session.shop,
      prompt: safePrompt,
      code: "",
    });

    // Create conversation + first user message with recipe context
    const conversation = await chatService.getOrCreateConversation(
      section.id,
      session.shop,
    );
    await chatService.addUserMessage(conversation.id, safePrompt);

    return { sectionId: section.id };
  } catch (error) {
    console.error("Failed to create section:", error);
    return { error: "Failed to create section. Please try again." };
  }
}

export default function NewSectionPage() {
  const { recipes, prebuiltCode, prebuiltName } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const hasSubmittedPrebuilt = useRef(false);

  // Selected recipe for context modal
  const [selectedRecipe, setSelectedRecipe] = useState<CRORecipe | null>(null);

  const isSubmitting = navigation.state === "submitting";

  // Auto-submit when prebuilt code is provided (from "Use As-Is" flow)
  useEffect(() => {
    if (prebuiltCode && !hasSubmittedPrebuilt.current && !isSubmitting) {
      hasSubmittedPrebuilt.current = true;
      const formData = new FormData();
      formData.append("prebuiltCode", prebuiltCode);
      if (prebuiltName) {
        formData.append("prebuiltName", prebuiltName);
      }
      submit(formData, { method: "post" });
    }
  }, [prebuiltCode, prebuiltName, isSubmitting, submit]);

  // Redirect on success
  useEffect(() => {
    if (actionData?.sectionId) {
      navigate(`/app/sections/${actionData.sectionId}`);
    }
  }, [actionData, navigate]);

  // Recipe selection handler - opens context modal
  const handleRecipeSelect = (recipe: CRORecipe) => {
    setSelectedRecipe(recipe);
  };

  // Context submit handler - submits form with recipe + context
  const handleContextSubmit = (context: RecipeContext) => {
    if (!selectedRecipe) return;

    const formData = new FormData();
    formData.append("recipeSlug", selectedRecipe.slug);
    formData.append("recipeContext", JSON.stringify(context));
    submit(formData, { method: "post" });
    setSelectedRecipe(null);
  };

  // Skip context handler - submits form with recipe only
  const handleContextSkip = () => {
    if (!selectedRecipe) return;

    const formData = new FormData();
    formData.append("recipeSlug", selectedRecipe.slug);
    formData.append("recipeContext", "{}");
    submit(formData, { method: "post" });
    setSelectedRecipe(null);
  };

  // Show loading state when processing prebuilt code
  if (prebuiltCode && (isSubmitting || hasSubmittedPrebuilt.current)) {
    return (
      <s-page heading="Creating section..." inlineSize="base">
        <s-section>
          <s-stack gap="large" alignItems="center">
            <s-spinner />
            <s-text>Setting up your {prebuiltName || "section"}...</s-text>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  // Show loading state when submitting recipe
  if (isSubmitting) {
    return (
      <s-page heading="Generating section..." inlineSize="base">
        <s-section>
          <s-stack gap="large" alignItems="center">
            <s-spinner />
            <s-text>Preparing your CRO-optimized section...</s-text>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Create section" inlineSize="base">
      {/* Main Content */}
      <s-section>
        <s-stack gap="large-200">
          {/* Error Banner */}
          {actionData?.error && (
            <s-banner tone="critical" dismissible>
              {actionData.error}
            </s-banner>
          )}

          {/* Recipe Selector */}
          {recipes.length > 0 ? (
            <RecipeSelector
              recipes={recipes}
              onRecipeSelect={handleRecipeSelect}
              disabled={isSubmitting}
            />
          ) : (
            <s-box padding="large" background="subdued" borderRadius="base">
              <s-stack gap="base" alignItems="center">
                <s-icon type="alert-circle" />
                <s-text>No recipes available. Please check configuration.</s-text>
              </s-stack>
            </s-box>
          )}
        </s-stack>
      </s-section>

      {/* Aside - Tips */}
      <s-section slot="aside">
        <s-stack gap="large">
          <s-heading>How it works</s-heading>

          <s-stack gap="base">
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack gap="small-100">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-badge>1</s-badge>
                  <s-text type="strong">Choose a goal</s-text>
                </s-stack>
                <s-text color="subdued">
                  Select the conversion goal that matches your needs
                </s-text>
              </s-stack>
            </s-box>

            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack gap="small-100">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-badge>2</s-badge>
                  <s-text type="strong">Add context (optional)</s-text>
                </s-stack>
                <s-text color="subdued">
                  Provide details about your product or brand
                </s-text>
              </s-stack>
            </s-box>

            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack gap="small-100">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-badge>3</s-badge>
                  <s-text type="strong">Generate & refine</s-text>
                </s-stack>
                <s-text color="subdued">
                  AI creates a CRO-optimized section you can edit
                </s-text>
              </s-stack>
            </s-box>
          </s-stack>

          <s-divider />

          <s-stack gap="small">
            <s-text type="strong">Why recipes?</s-text>
            <s-text color="subdued">
              Each recipe applies proven CRO principles like urgency, trust
              signals, and social proof to maximize conversions.
            </s-text>
          </s-stack>
        </s-stack>
      </s-section>

      {/* Context Modal */}
      <RecipeContextModal
        recipe={selectedRecipe}
        onSubmit={handleContextSubmit}
        onSkip={handleContextSkip}
      />
    </s-page>
  );
}
