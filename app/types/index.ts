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

// Chat Types
export type {
  MessageRole,
  UIMessage,
  ModelMessage,
  ConversationState,
  SendMessageRequest,
  SendMessageResponse,
  StreamEventType,
  StreamEvent,
  ConversationMeta,
  CodeVersion,
  MessageCompleteData,
  GenerationStatus,
  CompletionStatus,
} from './chat.types';

// AI Streaming Types
export type {
  StreamingOptions,
  ConversationContext,
  CodeExtractionResult,
} from './ai.types';

// Section Status Types
export {
  SECTION_STATUS,
  VALID_STATUSES,
  VALID_TRANSITIONS,
  isValidStatus,
  isValidTransition,
  getStatusDisplayName,
  getStatusBadgeTone,
  getTransitionErrorMessage,
} from './section-status';
export type { SectionStatus } from './section-status';
