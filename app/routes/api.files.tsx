/**
 * API Route: Files
 * Provides endpoint for fetching Shopify store images
 */

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { filesService } from "../services/files.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Authenticate the request
  await authenticate.admin(request);

  // Parse query parameters
  const url = new URL(request.url);
  const first = parseInt(url.searchParams.get("first") || "20", 10);
  const after = url.searchParams.get("after") || null;
  const query = url.searchParams.get("query") || "";

  try {
    const result = await filesService.getFiles(request, {
      first: Math.min(first, 50), // Cap at 50 to prevent abuse
      after,
      query,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Files API error:", error);
    return Response.json(
      {
        files: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        error: error instanceof Error ? error.message : "Failed to fetch files",
      },
      { status: 500 }
    );
  }
}
