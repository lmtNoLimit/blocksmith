import { authenticate } from "../shopify.server";
import type {
  Theme,
  ThemesQueryResponse,
  ThemeFilesUpsertResponse,
  ThemeFileMetadata,
  ThemeServiceInterface
} from "../types";

export class ThemeService implements ThemeServiceInterface {
  async getThemes(request: Request): Promise<Theme[]> {
    const { admin } = await authenticate.admin(request);
    const response = await admin.graphql(
      `#graphql
      query getThemes {
        themes(first: 10) {
          edges {
            node {
              id
              name
              role
            }
          }
        }
      }`
    );

    const data = await response.json() as ThemesQueryResponse;
    return data.data?.themes?.edges.map(edge => edge.node) || [];
  }

  async createSection(
    request: Request,
    themeId: string,
    fileName: string,
    content: string
  ): Promise<ThemeFileMetadata> {
    const { admin } = await authenticate.admin(request);

    // Ensure filename ends with .liquid and is in sections/ folder if not specified
    const filename = fileName.includes('/') ? fileName : `sections/${fileName}`;
    const fullFilename = filename.endsWith('.liquid') ? filename : `${filename}.liquid`;

    const mutation = `
      mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: {
        themeId: themeId,
        files: [
          {
            filename: fullFilename,
            body: {
              type: "TEXT",
              value: content
            }
          }
        ]
      }
    });

    const data = await response.json() as ThemeFilesUpsertResponse;

    // Check for errors
    if (data.data?.themeFilesUpsert?.userErrors?.length) {
      const errors = data.data.themeFilesUpsert.userErrors;
      throw new Error(`Failed to save theme file: ${errors.map(e => e.message).join(', ')}`);
    }

    const file = data.data?.themeFilesUpsert?.upsertedThemeFiles?.[0];
    if (!file) {
      throw new Error('No file returned from upsert');
    }

    return file;
  }
}

export const themeService = new ThemeService();
