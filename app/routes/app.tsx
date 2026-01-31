import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as LegacyPolarisAppProvider } from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import '@shopify/polaris/build/esm/styles.css';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  // NOTE: Navigation is handled natively by App Bridge for s-button/s-link with href
  // Use React Router's navigate() via onClick handlers for programmatic navigation

  return (
    <AppProvider embedded apiKey={apiKey}>
      <LegacyPolarisAppProvider i18n={{}}>
        <s-app-nav>
          <a href="/" rel="home">
            Home
          </a>
          <a href="/app/sections">Sections</a>
          <a href="/app/templates">Templates</a>
          <a href="/app/billing">Billing</a>
          <a href="/app/settings">Settings</a>
        </s-app-nav>
        <Outlet />
      </LegacyPolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
