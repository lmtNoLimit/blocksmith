/**
 * Seed script for CRO recipes
 * Run with: npx tsx prisma/seed-cro-recipes.ts
 *
 * 8 CRO-optimized recipes with conversion-focused prompts
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface CRORecipeInput {
  name: string;
  slug: string;
  icon: string;
  businessProblem: string;
  croPrinciples: string[];
  promptTemplate: string;
  requiredElements: string[];
  contextQuestions?: Prisma.InputJsonValue;
  active: boolean;
  order: number;
}

const recipes: CRORecipeInput[] = [
  {
    name: "Cart Abandonment Recovery",
    slug: "cart-abandonment",
    icon: "CartIcon",
    businessProblem: "Visitors add products to cart but don't complete purchase. High cart abandonment rate hurts revenue.",
    croPrinciples: ["urgency", "trust", "scarcity"],
    promptTemplate: `You are creating a Shopify section to REDUCE CART ABANDONMENT.

BUSINESS CONTEXT:
- Visitors add products to cart but don't complete purchase
- Goal: Recover abandoned carts via urgency and trust signals

CRO PRINCIPLES TO APPLY:
- URGENCY: Show scarcity (stock counts, time-limited offers)
- TRUST: Display guarantees, security badges, return policies
- SOCIAL PROOF: Recent purchases, customer reviews

REQUIRED ELEMENTS:
- Hero with cart item preview
- Trust row (guarantees, security, shipping info)
- Urgency indicator (stock count or time limit)
- Clear CTA button above the fold

{{CONTEXT}}`,
    requiredElements: ["trust-badges", "urgency-indicator", "cta-button", "cart-preview"],
    contextQuestions: [
      { field: "returnPolicy", label: "Return policy duration", options: ["30 days", "60 days", "90 days"] },
      { field: "urgencyType", label: "Urgency type", options: ["stock-count", "time-limit", "both"] }
    ],
    active: true,
    order: 0
  },
  {
    name: "High-Ticket Trust Builder",
    slug: "high-ticket-trust",
    icon: "ShieldIcon",
    businessProblem: "High-priced items need extra trust signals. Customers hesitate on expensive purchases.",
    croPrinciples: ["authority", "social-proof", "risk-reversal"],
    promptTemplate: `You are creating a Shopify section to BUILD TRUST for HIGH-TICKET items.

BUSINESS CONTEXT:
- Selling premium/expensive products
- Customers need reassurance before large purchases
- Goal: Reduce purchase anxiety, increase confidence

CRO PRINCIPLES TO APPLY:
- AUTHORITY: Expert endorsements, certifications, awards
- SOCIAL PROOF: Customer testimonials with photos, video reviews
- RISK REVERSAL: Money-back guarantees, warranty info

REQUIRED ELEMENTS:
- Testimonial carousel with customer photos
- Trust badges row (certifications, awards)
- Money-back guarantee callout
- Expert/brand authority section

{{CONTEXT}}`,
    requiredElements: ["testimonials", "trust-badges", "guarantee", "authority-section"],
    contextQuestions: [
      { field: "productPrice", label: "Price range", options: ["$100-500", "$500-1000", "$1000+"] },
      { field: "warrantyLength", label: "Warranty offered", options: ["1 year", "2 years", "Lifetime"] }
    ],
    active: true,
    order: 1
  },
  {
    name: "Page Engagement Booster",
    slug: "page-engagement",
    icon: "ViewIcon",
    businessProblem: "High bounce rate, visitors leave quickly. Content doesn't capture attention.",
    croPrinciples: ["visual-hierarchy", "f-pattern", "progressive-disclosure"],
    promptTemplate: `You are creating a Shopify section to INCREASE PAGE ENGAGEMENT.

BUSINESS CONTEXT:
- High bounce rate on landing pages
- Visitors leave within seconds
- Goal: Capture attention, encourage scrolling

CRO PRINCIPLES TO APPLY:
- VISUAL HIERARCHY: Clear focal points, size contrast
- F-PATTERN: Important content in F-reading path
- PROGRESSIVE DISCLOSURE: Reveal content as user scrolls

REQUIRED ELEMENTS:
- Attention-grabbing hero with motion/animation
- Scroll-triggered content reveals
- Visual break sections
- Interactive elements (hover effects, micro-interactions)

{{CONTEXT}}`,
    requiredElements: ["hero-section", "scroll-animation", "visual-breaks", "interactive-elements"],
    contextQuestions: [
      { field: "pageType", label: "Page type", options: ["homepage", "landing", "product", "collection"] },
      { field: "animationLevel", label: "Animation preference", options: ["subtle", "moderate", "bold"] }
    ],
    active: true,
    order: 2
  },
  {
    name: "Email Signup Optimizer",
    slug: "email-signup",
    icon: "EmailIcon",
    businessProblem: "Low email capture rate. Visitors don't subscribe to newsletter.",
    croPrinciples: ["value-exchange", "micro-commitment", "loss-aversion"],
    promptTemplate: `You are creating a Shopify section to MAXIMIZE EMAIL SIGNUPS.

BUSINESS CONTEXT:
- Need to grow email list for marketing
- Current signup rate is low
- Goal: Increase email capture rate

CRO PRINCIPLES TO APPLY:
- VALUE EXCHANGE: Clear benefit for subscribing (discount, free content)
- MICRO-COMMITMENT: Easy first step, minimal friction
- LOSS AVERSION: Show what they'll miss without subscribing

REQUIRED ELEMENTS:
- Clear value proposition (discount percentage or benefit)
- Simple form (email only, minimal fields)
- Social proof (subscriber count or testimonial)
- Privacy assurance

{{CONTEXT}}`,
    requiredElements: ["value-proposition", "email-form", "social-proof", "privacy-note"],
    contextQuestions: [
      { field: "incentive", label: "Signup incentive", options: ["10% discount", "15% discount", "Free shipping", "Exclusive content"] },
      { field: "popupTiming", label: "Popup timing", options: ["on-load", "exit-intent", "scroll-trigger", "time-delay"] }
    ],
    active: true,
    order: 3
  },
  {
    name: "Upsell & Cross-sell",
    slug: "upsell-crosssell",
    icon: "PlusIcon",
    businessProblem: "Low average order value. Missing opportunities to increase cart size.",
    croPrinciples: ["anchoring", "bundle-psychology", "complementary-pairing"],
    promptTemplate: `You are creating a Shopify section to INCREASE AVERAGE ORDER VALUE.

BUSINESS CONTEXT:
- Customers buy single items
- Missing upsell/cross-sell opportunities
- Goal: Increase cart value through smart recommendations

CRO PRINCIPLES TO APPLY:
- ANCHORING: Show original vs bundle price
- BUNDLE PSYCHOLOGY: "Complete the look" or "Frequently bought together"
- COMPLEMENTARY PAIRING: Logical product combinations

REQUIRED ELEMENTS:
- Product recommendation carousel
- Bundle savings display
- "Add all to cart" button
- Comparison pricing (individual vs bundle)

{{CONTEXT}}`,
    requiredElements: ["product-recommendations", "bundle-price", "add-all-cta", "savings-display"],
    contextQuestions: [
      { field: "bundleType", label: "Bundle type", options: ["frequently-bought", "complete-the-look", "accessories", "upgrades"] },
      { field: "discountType", label: "Bundle discount", options: ["percentage", "fixed-amount", "free-item"] }
    ],
    active: true,
    order: 4
  },
  {
    name: "Promotion Spotlight",
    slug: "promotion-highlight",
    icon: "DiscountIcon",
    businessProblem: "Promotions don't get noticed. Sales and offers underperform.",
    croPrinciples: ["scarcity", "contrast", "urgency"],
    promptTemplate: `You are creating a Shopify section to HIGHLIGHT PROMOTIONS effectively.

BUSINESS CONTEXT:
- Running sales/promotions that underperform
- Customers don't notice or act on offers
- Goal: Maximize promotion visibility and conversion

CRO PRINCIPLES TO APPLY:
- SCARCITY: Limited time, limited quantity messaging
- CONTRAST: Make offer stand out visually
- URGENCY: Countdown timers, deadline emphasis

REQUIRED ELEMENTS:
- Bold promotion banner with high contrast
- Countdown timer or expiration date
- Clear discount amount/percentage
- Direct CTA to shop sale

{{CONTEXT}}`,
    requiredElements: ["promo-banner", "countdown-timer", "discount-display", "shop-cta"],
    contextQuestions: [
      { field: "promoType", label: "Promotion type", options: ["sitewide-sale", "category-sale", "flash-sale", "clearance"] },
      { field: "discountAmount", label: "Discount level", options: ["10-20%", "25-40%", "50%+", "BOGO"] }
    ],
    active: true,
    order: 5
  },
  {
    name: "Homepage Conversion",
    slug: "homepage-conversion",
    icon: "HomeIcon",
    businessProblem: "Homepage doesn't convert visitors to shoppers. Unclear next steps.",
    croPrinciples: ["clear-cta", "progressive-disclosure", "value-proposition"],
    promptTemplate: `You are creating a Shopify section for HOMEPAGE CONVERSION.

BUSINESS CONTEXT:
- Homepage gets traffic but low click-through
- Visitors don't know where to go next
- Goal: Guide visitors to products/collections efficiently

CRO PRINCIPLES TO APPLY:
- CLEAR CTA: Single, obvious primary action
- PROGRESSIVE DISCLOSURE: Show paths for different user intents
- VALUE PROPOSITION: Immediately communicate what makes you different

REQUIRED ELEMENTS:
- Hero with single primary CTA
- Category/collection navigation tiles
- Brand value proposition
- Featured products or bestsellers

{{CONTEXT}}`,
    requiredElements: ["hero-cta", "category-nav", "value-prop", "featured-products"],
    contextQuestions: [
      { field: "primaryGoal", label: "Primary homepage goal", options: ["shop-now", "browse-categories", "see-new-arrivals", "learn-brand"] },
      { field: "productCount", label: "Products to feature", options: ["4", "6", "8", "12"] }
    ],
    active: true,
    order: 6
  },
  {
    name: "Objection Handler",
    slug: "objection-handling",
    icon: "QuestionIcon",
    businessProblem: "Customers have doubts and unanswered questions. Hesitation leads to lost sales.",
    croPrinciples: ["objection-reversal", "guarantees", "faq-preemption"],
    promptTemplate: `You are creating a Shopify section to HANDLE CUSTOMER OBJECTIONS.

BUSINESS CONTEXT:
- Customers have common doubts about products/brand
- Questions go unanswered, leading to cart abandonment
- Goal: Preemptively address objections and build confidence

CRO PRINCIPLES TO APPLY:
- OBJECTION REVERSAL: Turn doubts into selling points
- GUARANTEES: Risk-free purchase promises
- FAQ PREEMPTION: Answer questions before they're asked

REQUIRED ELEMENTS:
- FAQ accordion with common questions
- Guarantee/warranty callout box
- Comparison table (vs competitors if applicable)
- Customer support contact info

{{CONTEXT}}`,
    requiredElements: ["faq-accordion", "guarantee-box", "comparison-table", "support-contact"],
    contextQuestions: [
      { field: "topObjection", label: "Top customer objection", options: ["price", "quality", "shipping-time", "fit-sizing", "durability"] },
      { field: "competitorComparison", label: "Include competitor comparison?", options: ["yes", "no"] }
    ],
    active: true,
    order: 7
  }
];

async function main() {
  console.log("Seeding CRO recipes...\n");

  for (const recipe of recipes) {
    const result = await prisma.cRORecipe.upsert({
      where: { slug: recipe.slug },
      update: {
        name: recipe.name,
        icon: recipe.icon,
        businessProblem: recipe.businessProblem,
        croPrinciples: recipe.croPrinciples,
        promptTemplate: recipe.promptTemplate,
        requiredElements: recipe.requiredElements,
        contextQuestions: recipe.contextQuestions,
        active: recipe.active,
        order: recipe.order
      },
      create: recipe
    });

    console.log(`✓ ${result.name} (${result.slug})`);
    console.log(`  Principles: ${result.croPrinciples.join(", ")}`);
    console.log(`  Elements: ${result.requiredElements.length} required\n`);
  }

  console.log("CRO recipes seeded successfully!");
  console.log(`Total: ${recipes.length} recipes`);
}

main()
  .catch((error) => {
    console.error("Error seeding CRO recipes:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
