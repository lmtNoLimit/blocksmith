import { authenticate } from "../shopify.server";

export class ThemeService {
  async getThemes(request: Request) {
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
    
    const data = await response.json();
    return data.data.themes.edges.map((edge: any) => edge.node);
  }

  async createSection(request: Request, themeId: string, fileName: string, content: string) {
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

    const data = await response.json();
    
    // Check for errors
    if (data.data?.themeFilesUpsert?.userErrors?.length > 0) {
      const errors = data.data.themeFilesUpsert.userErrors;
      throw new Error(`Failed to save theme file: ${errors.map((e: any) => e.message).join(', ')}`);
    }

    return data.data?.themeFilesUpsert?.upsertedThemeFiles?.[0];
  }
}

export const themeService = new ThemeService();
