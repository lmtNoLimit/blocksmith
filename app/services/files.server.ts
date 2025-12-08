/**
 * Files API Service
 * Fetches files/images from Shopify using GraphQL Files API
 */

import { authenticate } from "../shopify.server";

// Types
export interface ShopifyFile {
  id: string;
  alt: string | null;
  createdAt: string;
  image: {
    url: string;
    width: number;
    height: number;
  } | null;
  filename?: string;
}

export interface FilesQueryResult {
  files: ShopifyFile[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

interface FilesQueryResponse {
  data?: {
    files?: {
      edges: Array<{
        node: {
          id: string;
          alt?: string | null;
          createdAt: string;
          image?: {
            url: string;
            width: number;
            height: number;
          } | null;
          originalSource?: {
            url: string;
          };
        };
        cursor: string;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

const FILES_QUERY = `#graphql
  query getFiles($first: Int!, $after: String, $query: String) {
    files(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          ... on MediaImage {
            id
            alt
            createdAt
            image {
              url
              width
              height
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export class FilesService {
  /**
   * Fetch images from Shopify Files
   */
  async getFiles(
    request: Request,
    options: {
      first?: number;
      after?: string | null;
      query?: string;
    } = {}
  ): Promise<FilesQueryResult> {
    const { admin } = await authenticate.admin(request);

    const { first = 20, after = null, query = "" } = options;

    // Build query string - filter to images only
    let searchQuery = "media_type:IMAGE";
    if (query.trim()) {
      searchQuery = `${query.trim()} AND media_type:IMAGE`;
    }

    const response = await admin.graphql(FILES_QUERY, {
      variables: {
        first,
        after,
        query: searchQuery,
      },
    });

    const data = (await response.json()) as FilesQueryResponse;

    if (data.errors?.length) {
      console.error("Files query errors:", data.errors);
      throw new Error(data.errors[0].message);
    }

    const edges = data.data?.files?.edges || [];
    const pageInfo = data.data?.files?.pageInfo || {
      hasNextPage: false,
      endCursor: null,
    };

    // Transform edges to files array, filtering out non-image results
    const files: ShopifyFile[] = edges
      .filter((edge) => edge.node.image?.url) // Only include nodes with images
      .map((edge) => {
        const node = edge.node;
        // Extract filename from URL or use ID
        const urlParts = node.image?.url?.split("/") || [];
        const filename = urlParts[urlParts.length - 1]?.split("?")[0] || node.id;

        return {
          id: node.id,
          alt: node.alt || null,
          createdAt: node.createdAt,
          image: node.image || null,
          filename,
        };
      });

    return {
      files,
      pageInfo,
    };
  }
}

// Singleton instance
export const filesService = new FilesService();
