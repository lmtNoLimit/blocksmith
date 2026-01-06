/**
 * Billing page - Plan selection, subscription management, usage dashboard
 */

import { useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  useLoaderData,
  useSubmit,
  useActionData,
  useNavigation,
} from "react-router";
import { authenticate } from "../shopify.server";
import {
  getActivePlans,
  getSubscription,
  createSubscription,
  cancelSubscription,
  checkQuota,
} from "../services/billing.server";
import { getUsageStats } from "../services/usage-analytics.server";
import type { PlanTier } from "../types/billing";
import {
  PlanSelector,
  UsageDashboard,
  UsageAlertBanner,
} from "../components/billing";
import { useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const charge_id = url.searchParams.get("charge_id");

  const [plans, subscription, quota, stats] = await Promise.all([
    getActivePlans(),
    getSubscription(session.shop),
    checkQuota(session.shop),
    getUsageStats(session.shop),
  ]);

  return {
    plans,
    subscription,
    quota,
    stats,
    shop: session.shop,
    approvalStatus: status, // 'success', 'declined', or null
    chargeId: charge_id,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (action === "subscribe") {
    const planName = formData.get("planName") as PlanTier;

    // Build the embedded app URL that Shopify will redirect to after approval
    // Format: https://admin.shopify.com/store/{shop}/apps/{app-handle}/app/billing
    const shopDomain = session.shop.replace(".myshopify.com", "");
    const appHandle = "blocksmith-ai"; // Your app handle from shopify.app.toml
    const returnUrl = `https://admin.shopify.com/store/${shopDomain}/apps/${appHandle}/app/billing`;

    try {
      const result = await createSubscription(admin, {
        shop: session.shop,
        planName,
        returnUrl,
      });

      // Return confirmation URL for App Bridge redirect (embedded apps)
      return {
        confirmationUrl: result.confirmationUrl,
      };
    } catch (error) {
      console.error("Failed to create subscription:", error);
      return {
        error: "Failed to create subscription. Please try again.",
      };
    }
  }

  if (action === "cancel") {
    try {
      await cancelSubscription(admin, session.shop);
      return { success: true };
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      return {
        error: "Failed to cancel subscription. Please try again.",
      };
    }
  }

  return { error: "Invalid action" };
}

export default function BillingPage() {
  const { plans, subscription, quota, stats, approvalStatus, chargeId } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();

  // Redirect to Shopify confirmation page
  useEffect(() => {
    if (actionData?.confirmationUrl) {
      // For embedded apps, use top-level window redirect
      // Shopify will handle the billing flow in their UI
      window.top!.location.href = actionData.confirmationUrl;
    }
  }, [actionData?.confirmationUrl]);

  // Show toast on successful subscription cancellation
  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Subscription cancelled successfully");
    }
  }, [actionData?.success, shopify]);

  // Handle plan selection
  const handlePlanSelect = (planName: PlanTier) => {
    const formData = new FormData();
    formData.append("action", "subscribe");
    formData.append("planName", planName);
    submit(formData, { method: "post" });
  };

  // Handle upgrade click from alert banner
  const handleUpgradeClick = () => {
    // Scroll to plan selector
    const planSelector = document.getElementById("plan-selector");
    if (planSelector) {
      planSelector.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Show loading state during subscription operations
  const isLoading =
    navigation.state === "submitting" || navigation.state === "loading";
  const isCancelling =
    isLoading && navigation.formData?.get("action") === "cancel";

  return (
    <s-page heading="Billing & Usage" inlineSize="base">
      <s-button slot="primary-action" variant="secondary" href="/docs/billing">
        Help
      </s-button>

      {/* Subscription Approval Success */}
      {approvalStatus === "success" && chargeId && (
        <s-banner tone="success">
          <s-paragraph>
            Subscription activated successfully! Your plan is now active.
          </s-paragraph>
        </s-banner>
      )}

      {/* Subscription Approval Declined */}
      {approvalStatus === "declined" && (
        <s-banner tone="warning">
          <s-paragraph>
            Subscription approval was declined. Please select a plan to
            continue.
          </s-paragraph>
        </s-banner>
      )}

      {/* Error Banner */}
      {actionData?.error && (
        <s-banner tone="critical">
          <s-paragraph>{actionData.error}</s-paragraph>
        </s-banner>
      )}

      {/* Usage Alert Banner (shows at 75%+ usage) */}
      <UsageAlertBanner quota={quota} onUpgradeClick={handleUpgradeClick} />

      <s-stack gap="large" direction="block">
        {/* Current Subscription Details */}
        {subscription && (
          <s-section heading="Current Subscription">
            <s-box border="base" borderRadius="base" padding="base">
              <s-grid gap="base">
                {/* Plan Info */}
                <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                  <s-grid gap="small-100">
                    <s-heading>
                      {subscription.planName === "free" && "Free Plan"}
                      {subscription.planName === "pro" && "Pro Plan"}
                      {subscription.planName === "agency" && "Agency Plan"}
                    </s-heading>
                    <s-paragraph color="subdued">
                      ${subscription.basePrice}/month + usage charges
                    </s-paragraph>
                  </s-grid>
                  <s-badge
                    tone={
                      subscription.status === "active"
                        ? "success"
                        : subscription.status === "cancelled"
                          ? "critical"
                          : "warning"
                    }
                  >
                    {subscription.status.charAt(0).toUpperCase() +
                      subscription.status.slice(1)}
                  </s-badge>
                </s-grid>

                {/* Billing Date */}
                {subscription.currentPeriodEnd && (
                  <>
                    <s-divider />
                    <s-grid gridTemplateColumns="1fr auto">
                      <s-paragraph>Next billing date</s-paragraph>
                      <s-text>
                        {new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </s-text>
                    </s-grid>
                  </>
                )}
              </s-grid>
            </s-box>
          </s-section>
        )}

        {/* Usage Dashboard */}
        <UsageDashboard quota={quota} subscription={subscription} stats={stats} />

        {/* Plan Selector */}
        <PlanSelector
          plans={plans.map((p) => ({
            ...p,
            planName: p.planName as PlanTier,
            badge: p.badge ?? undefined,
          }))}
          currentPlan={(subscription?.planName as PlanTier) ?? null}
          onSelect={handlePlanSelect}
        />

        {/* Cancel Subscription Button & Modal - only show if subscription exists */}
        {subscription && subscription.status === "active" && (
          <>
            <s-button
              variant="secondary"
              tone="critical"
              commandFor="cancel-subscription-modal"
              command="--show"
              accessibilityLabel="Cancel subscription"
            >
              Cancel Subscription
            </s-button>

            <s-modal id="cancel-subscription-modal" heading="Cancel your subscription?">
              <s-stack gap="base" direction="block">
                <s-paragraph>
                  You&apos;re currently on the{" "}
                  <s-text type="strong">
                    {subscription.planName === "free" && "Free"}
                    {subscription.planName === "pro" && "Pro"}
                    {subscription.planName === "agency" && "Agency"}
                  </s-text>{" "}
                  plan.
                </s-paragraph>

                <s-paragraph>Canceling will remove access to:</s-paragraph>
                <s-stack gap="small-100" direction="block">
                  <s-text>• {quota.includedQuota} generations per month</s-text>
                  <s-text>• Premium templates library</s-text>
                  <s-text>• Section history & versioning</s-text>
                </s-stack>

                <s-banner tone="warning">
                  <s-paragraph>
                    Your subscription will end immediately. This action cannot be undone.
                  </s-paragraph>
                </s-banner>
              </s-stack>

              <s-button
                slot="primary-action"
                variant="primary"
                tone="critical"
                loading={isCancelling || undefined}
                disabled={isCancelling || undefined}
                onClick={() => {
                  const formData = new FormData();
                  formData.append("action", "cancel");
                  submit(formData, { method: "post" });
                }}
              >
                {isCancelling ? "Cancelling..." : "Yes, cancel subscription"}
              </s-button>
              <s-button
                slot="secondary-actions"
                variant="secondary"
                commandFor="cancel-subscription-modal"
                command="--hide"
              >
                Keep my subscription
              </s-button>
            </s-modal>
          </>
        )}
      </s-stack>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <s-text type="strong">Processing subscription...</s-text>
        </div>
      )}
    </s-page>
  );
}
