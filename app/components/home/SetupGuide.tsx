import { Fragment, useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";

interface OnboardingState {
  hasGeneratedSection: boolean;
  hasSavedTemplate: boolean;
  hasConfiguredSettings: boolean;
  isDismissed: boolean;
}

interface SetupGuideProps {
  onboarding: OnboardingState;
}

const SETUP_STEPS = [
  {
    id: "generate",
    title: "Create your first section",
    description:
      "Describe what you want in natural language and get production-ready Liquid code for your Shopify theme.",
    href: "/app/sections/new",
    completionKey: "hasGeneratedSection" as const,
    actionLabel: "Create section",
    image: "/images/onboarding/generate-section.svg",
    imageAlt: "AI code generation illustration",
  },
  {
    id: "template",
    title: "Save a template for reuse",
    description:
      "Save your best prompts as templates so you can quickly generate similar sections in the future.",
    href: "/app/templates",
    completionKey: "hasSavedTemplate" as const,
    actionLabel: "View templates",
    image: "/images/onboarding/save-template.svg",
    imageAlt: "Template saving illustration",
  },
  {
    id: "settings",
    title: "Configure your preferences",
    description:
      "Customize default generation settings like tone and style to match your brand voice.",
    href: "/app/settings",
    completionKey: "hasConfiguredSettings" as const,
    actionLabel: "Open settings",
    image: "/images/onboarding/configure-settings.svg",
    imageAlt: "Settings configuration illustration",
  },
];

export function SetupGuide({ onboarding }: SetupGuideProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    generate: true,
  });

  // Calculate completion
  const completedCount = SETUP_STEPS.filter(
    (s) => onboarding[s.completionKey]
  ).length;

  // Auto-expand first incomplete step
  useEffect(() => {
    const firstIncomplete = SETUP_STEPS.find((s) => !onboarding[s.completionKey]);
    if (firstIncomplete && !expandedSteps[firstIncomplete.id]) {
      setExpandedSteps((prev) => ({
        ...prev,
        [firstIncomplete.id]: true,
      }));
    }
  }, [onboarding, expandedSteps]);

  // Don't show if dismissed
  if (onboarding.isDismissed) return null;

  const handleDismiss = () => {
    fetcher.submit({ intent: "dismissOnboarding" }, { method: "post" });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleStepToggle = (stepKey: string, checked: boolean) => {
    fetcher.submit(
      {
        intent: "toggleOnboardingStep",
        stepKey,
        completed: String(checked),
      },
      { method: "post" }
    );
  };

  return (
    <s-section>
      <s-grid gap="base">
        {/* Header */}
        <s-grid gap="small-200">
          <s-grid
            gridTemplateColumns="1fr auto auto"
            gap="small-300"
            alignItems="center"
          >
            <s-heading>Setup Guide</s-heading>
            <s-button
              accessibilityLabel="Dismiss setup guide"
              onClick={handleDismiss}
              variant="tertiary"
              tone="neutral"
              icon="x"
            />
            <s-button
              accessibilityLabel={isExpanded ? "Collapse setup guide" : "Expand setup guide"}
              onClick={() => setIsExpanded(!isExpanded)}
              variant="tertiary"
              tone="neutral"
              icon={isExpanded ? "chevron-up" : "chevron-down"}
            />
          </s-grid>
          <s-paragraph>
            Complete these steps to get the most out of AI Section Generator.
          </s-paragraph>
          <s-paragraph color="subdued">
            {completedCount} of {SETUP_STEPS.length} steps completed
          </s-paragraph>
        </s-grid>

        {/* Steps Container */}
        <s-box
          borderRadius="base"
          border="base"
          background="base"
          display={isExpanded ? "auto" : "none"}
        >
          {SETUP_STEPS.map((step, i) => {
            const completed = onboarding[step.completionKey];
            const stepExpanded = expandedSteps[step.id];

            return (
              <Fragment key={step.id}>
                <s-box>
                  {/* Step Header with Checkbox */}
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    gap="base"
                    padding="small"
                  >
                    <s-checkbox
                      label={step.title}
                      checked={completed}
                      onInput={(e: Event) => {
                        const target = e.target as HTMLInputElement;
                        handleStepToggle(step.completionKey, target.checked);
                      }}
                    />
                    <s-button
                      accessibilityLabel={`${stepExpanded ? "Collapse" : "Expand"} ${step.title} details`}
                      onClick={() => toggleStep(step.id)}
                      variant="tertiary"
                      icon={stepExpanded ? "chevron-up" : "chevron-down"}
                    />
                  </s-grid>

                  {/* Step Details (Expandable) */}
                  <s-box
                    padding="small"
                    paddingBlockStart="none"
                    display={stepExpanded ? "auto" : "none"}
                  >
                    <s-box padding="base" background="subdued" borderRadius="base">
                      <s-grid
                        gridTemplateColumns="1fr auto"
                        gap="base"
                        alignItems="center"
                      >
                        <s-grid gap="small-200">
                          <s-paragraph>{step.description}</s-paragraph>
                          <s-stack direction="inline" gap="small-200">
                            <s-button
                              variant={completed ? "tertiary" : "primary"}
                              accessibilityLabel={`${completed ? "Revisit" : "Start"}: ${step.title}`}
                              onClick={() => navigate(step.href)}
                            >
                              {completed ? "Revisit" : step.actionLabel}
                            </s-button>
                          </s-stack>
                        </s-grid>
                        <s-box maxBlockSize="80px" maxInlineSize="80px">
                          <s-image
                            src={step.image}
                            alt={step.imageAlt}
                          />
                        </s-box>
                      </s-grid>
                    </s-box>
                  </s-box>
                </s-box>

                {/* Divider between steps */}
                {i < SETUP_STEPS.length - 1 && <s-divider />}
              </Fragment>
            );
          })}
        </s-box>
      </s-grid>
    </s-section>
  );
}
