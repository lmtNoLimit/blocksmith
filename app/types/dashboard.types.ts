/**
 * Dashboard types for Polaris App Home components
 */

// Dashboard analytics types
export interface DashboardStats {
  sectionsGenerated: number;
  templatesSaved: number;
  generationsThisWeek: number;
  weeklyTrend: "up" | "down" | "stable"; // Compared to last week
  weeklyChange: number; // Percentage change
}

// Onboarding state
export interface OnboardingState {
  hasGeneratedSection: boolean;
  hasSavedTemplate: boolean;
  hasViewedHistory: boolean; // Deprecated: kept for backward compatibility
  hasConfiguredSettings: boolean;
  isDismissed: boolean;
}

// News item
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  type: "update" | "feature" | "announcement";
  publishedAt: Date;
}

// CTA state
export interface CTAState {
  isDismissed: boolean;
  dismissedAt?: Date;
}

// CTA configuration
export interface CTAConfig {
  id: string;
  type: "feature" | "upgrade" | "tip";
  title: string;
  description: string;
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: "dismiss";
  };
  tone?: "info" | "success" | "warning";
}

// Full dashboard loader data
export interface DashboardLoaderData {
  stats: DashboardStats;
  onboarding: OnboardingState;
  cta: CTAState;
  news: NewsItem[];
}
