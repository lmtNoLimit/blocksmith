/**
 * Shopify Admin GraphQL API Response Types
 * These types match the structure of Shopify GraphQL API responses
 */

// Theme Types
export interface Theme {
  id: string;
  name: string;
  role: 'MAIN' | 'UNPUBLISHED' | 'DEVELOPMENT';
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeEdge {
  node: Theme;
}

export interface ThemesQueryResponse {
  data?: {
    themes?: {
      edges: ThemeEdge[];
    };
  };
  errors?: Array<{ message: string }>;
}

// Theme File Types
export interface ThemeFile {
  filename: string;
  body?: {
    type: 'TEXT';
    value: string;
  };
}

export interface ThemeFileMetadata {
  filename: string;
  size?: number;
  contentType?: string;
  checksum?: string;
}

export interface UserError {
  message: string;
  field?: string[];
}

export interface ThemeFilesUpsertResponse {
  data?: {
    themeFilesUpsert?: {
      upsertedThemeFiles?: ThemeFileMetadata[];
      userErrors?: UserError[];
    };
  };
  errors?: Array<{ message: string }>;
}

// Generic Service Response
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
