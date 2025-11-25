/// <reference types="./types/polaris.d.ts" />

declare module "*.css";

// Extend Window interface for Shopify App Bridge
declare global {
  interface Window {
    shopify?: {
      config?: {
        apiKey: string;
        host: string;
      };
    };
  }
}
