import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { settingsService } from "../services/settings.server";
import { newsService } from "../services/news.server";
import { getSubscription } from "../services/billing.server";
import { getTrialStatus, startTrial, type TrialStatus } from "../services/trial.server";
import { SetupGuide, Analytics, News } from "../components/home";
import { TrialBanner } from "../components/billing";

// Helper to get start of current week (Monday)
function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

// Helper to get start of last week
function getStartOfLastWeek(): Date {
  const startOfWeek = getStartOfWeek();
  const lastWeek = new Date(startOfWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);
  return lastWeek;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const startOfWeek = getStartOfWeek();
  const startOfLastWeek = getStartOfLastWeek();

  // Check/start trial for new users (before parallel fetches)
  let trialStatus = await getTrialStatus(shop);

  // Auto-start trial if no trial and no subscription
  if (trialStatus.status === "none") {
    const subscription = await getSubscription(shop);
    if (!subscription) {
      trialStatus = await startTrial(shop);
    }
  }

  // Fetch stats, trend data, onboarding state, CTA state, and news in parallel
  const [historyCount, templateCount, weeklyCount, lastWeekCount, shopSettings, ctaState, newsItems] =
    await Promise.all([
      prisma.section.count({ where: { shop } }),
      prisma.sectionTemplate.count({ where: { shop } }),
      prisma.section.count({
        where: {
          shop,
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.section.count({
        where: {
          shop,
          createdAt: {
            gte: startOfLastWeek,
            lt: startOfWeek,
          },
        },
      }),
      settingsService.get(shop),
      settingsService.getCTAState(shop),
      newsService.getActiveNews(5),
    ]);

  // Calculate weekly trend
  let weeklyTrend: "up" | "down" | "stable" = "stable";
  let weeklyChange = 0;

  if (lastWeekCount > 0) {
    weeklyChange = Math.round(
      ((weeklyCount - lastWeekCount) / lastWeekCount) * 100
    );
    weeklyTrend = weeklyChange > 0 ? "up" : weeklyChange < 0 ? "down" : "stable";
  } else if (weeklyCount > 0) {
    weeklyTrend = "up";
    weeklyChange = 100;
  }

  // Onboarding: combine manual toggle state with derived state (either makes it complete)
  const hasGeneratedSection = (shopSettings?.hasGeneratedSection ?? false) || historyCount > 0;
  const hasSavedTemplate = (shopSettings?.hasSavedTemplate ?? false) || templateCount > 0;

  return {
    stats: {
      sectionsGenerated: historyCount,
      templatesSaved: templateCount,
      generationsThisWeek: weeklyCount,
      weeklyTrend,
      weeklyChange: Math.abs(weeklyChange),
    },
    onboarding: {
      hasGeneratedSection,
      hasSavedTemplate,
      hasViewedHistory: shopSettings?.hasViewedHistory ?? false, // Deprecated: kept for backward compatibility
      hasConfiguredSettings: shopSettings?.hasConfiguredSettings ?? false,
      isDismissed: shopSettings?.onboardingDismissed ?? false,
    },
    cta: ctaState,
    news: newsItems,
    trialStatus,
  };
};

// Valid step keys for onboarding toggle
const VALID_STEP_KEYS = ["hasGeneratedSection", "hasSavedTemplate", "hasConfiguredSettings"] as const;
type StepKey = typeof VALID_STEP_KEYS[number];

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "dismissOnboarding") {
    await settingsService.dismissOnboarding(session.shop);
  }

  if (intent === "dismissCTA") {
    await settingsService.dismissCTA(session.shop);
  }

  if (intent === "toggleOnboardingStep") {
    const stepKey = formData.get("stepKey") as string;
    const completed = formData.get("completed") === "true";

    if (VALID_STEP_KEYS.includes(stepKey as StepKey)) {
      await settingsService.updateOnboardingStep(
        session.shop,
        stepKey as StepKey,
        completed
      );
    }
  }

  return { success: true };
};

export default function Homepage() {
  const { stats, onboarding, news, trialStatus } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate("/app/billing");
  };

  return (
    <s-page heading="Dashboard" inlineSize="base">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() => navigate("/app/sections/new")}
      >
        Generate Section
      </s-button>

      <s-stack gap="large" direction="block">
        {/* Trial banner - show when in active trial */}
        {trialStatus.isInTrial && (
          <TrialBanner
            daysRemaining={trialStatus.daysRemaining}
            usageRemaining={trialStatus.usageRemaining}
            maxUsage={trialStatus.maxUsage}
            onUpgrade={handleUpgrade}
          />
        )}

        <SetupGuide onboarding={onboarding} />
        <Analytics stats={stats} />
        <News items={news} />
      </s-stack>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
