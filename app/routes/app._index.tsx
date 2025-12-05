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
import { SetupGuide, FeatureNav, QuickStats } from "../components/home";

// Helper to get start of current week (Monday)
function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Fetch stats and onboarding state in parallel
  const [historyCount, templateCount, weeklyCount, shopSettings] =
    await Promise.all([
      prisma.section.count({ where: { shop } }),
      prisma.sectionTemplate.count({ where: { shop } }),
      prisma.section.count({
        where: {
          shop,
          createdAt: { gte: getStartOfWeek() },
        },
      }),
      settingsService.get(shop),
    ]);

  return {
    stats: {
      sectionsGenerated: historyCount,
      templatesSaved: templateCount,
      generationsThisWeek: weeklyCount,
    },
    onboarding: {
      hasGeneratedSection: historyCount > 0,
      hasSavedTemplate: templateCount > 0,
      hasViewedHistory: shopSettings?.hasViewedHistory ?? false,
      isDismissed: shopSettings?.onboardingDismissed ?? false,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "dismissOnboarding") {
    await settingsService.dismissOnboarding(session.shop);
  }

  return { success: true };
};

export default function Homepage() {
  const { stats, onboarding } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <s-page heading="AI Section Generator" inlineSize="base">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() => navigate("/app/generate")}
      >
        Generate Section
      </s-button>

      <s-stack gap="large" direction="block">
        <SetupGuide onboarding={onboarding} />
        <FeatureNav />
      </s-stack>

      <s-section slot="aside" heading="Activity">
        <QuickStats stats={stats} />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
