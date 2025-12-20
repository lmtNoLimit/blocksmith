import prisma from "../db.server";
import type { ShopSettings } from "@prisma/client";
import type { CTAState } from "../types/dashboard.types";

interface PreferencesInput {
  defaultTone: string;
  defaultStyle: string;
  autoSaveEnabled: boolean;
}

/**
 * Settings service for managing shop-level settings (onboarding, preferences)
 */
export const settingsService = {
  /**
   * Get shop settings
   */
  async get(shop: string): Promise<ShopSettings | null> {
    return prisma.shopSettings.findUnique({ where: { shop } });
  },

  /**
   * Mark history as viewed (for onboarding step)
   */
  async markHistoryViewed(shop: string): Promise<ShopSettings> {
    return prisma.shopSettings.upsert({
      where: { shop },
      update: { hasViewedHistory: true },
      create: { shop, hasViewedHistory: true },
    });
  },

  /**
   * Dismiss onboarding guide
   */
  async dismissOnboarding(shop: string): Promise<ShopSettings> {
    return prisma.shopSettings.upsert({
      where: { shop },
      update: { onboardingDismissed: true },
      create: { shop, onboardingDismissed: true },
    });
  },

  /**
   * Mark settings as configured (for onboarding step 3)
   */
  async markSettingsConfigured(shop: string): Promise<ShopSettings> {
    return prisma.shopSettings.upsert({
      where: { shop },
      update: { hasConfiguredSettings: true },
      create: { shop, hasConfiguredSettings: true },
    });
  },

  /**
   * Update onboarding step completion state
   * Valid keys: hasGeneratedSection, hasSavedTemplate, hasConfiguredSettings
   */
  async updateOnboardingStep(
    shop: string,
    stepKey: "hasGeneratedSection" | "hasSavedTemplate" | "hasConfiguredSettings",
    completed: boolean
  ): Promise<ShopSettings> {
    return prisma.shopSettings.upsert({
      where: { shop },
      update: { [stepKey]: completed },
      create: { shop, [stepKey]: completed },
    });
  },

  /**
   * Dismiss CTA banner
   */
  async dismissCTA(shop: string): Promise<void> {
    await prisma.shopSettings.upsert({
      where: { shop },
      create: { shop, ctaDismissedAt: new Date() },
      update: { ctaDismissedAt: new Date() },
    });
  },

  /**
   * Get CTA dismissal state
   */
  async getCTAState(shop: string): Promise<CTAState> {
    const settings = await prisma.shopSettings.findUnique({
      where: { shop },
      select: { ctaDismissedAt: true },
    });

    return {
      isDismissed: settings?.ctaDismissedAt != null,
      dismissedAt: settings?.ctaDismissedAt ?? undefined,
    };
  },

  /**
   * Update shop preferences
   */
  async updatePreferences(
    shop: string,
    preferences: PreferencesInput
  ): Promise<ShopSettings> {
    return prisma.shopSettings.upsert({
      where: { shop },
      update: preferences,
      create: { shop, ...preferences },
    });
  },
};
