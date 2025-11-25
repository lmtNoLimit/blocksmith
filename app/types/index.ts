/**
 * Central export for all type definitions
 */

// Shopify API Types
export type {
  Theme,
  ThemeEdge,
  ThemesQueryResponse,
  ThemeFile,
  ThemeFileMetadata,
  UserError,
  ThemeFilesUpsertResponse,
  ServiceResult,
} from './shopify-api.types';

// Service Types
export type {
  AIGenerationOptions,
  AIGenerationResult,
  AIServiceInterface,
  ThemeServiceInterface,
  GeneratedSectionRecord,
  GenerateActionData,
  SaveActionData,
} from './service.types';
