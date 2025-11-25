/**
 * Service Layer Type Definitions
 * Interfaces for AI and Theme services
 */

import type { Theme, ThemeFileMetadata } from './shopify-api.types';

// AI Service Types
export interface AIGenerationOptions {
  prompt: string;
  model?: string;
  temperature?: number;
}

export interface AIGenerationResult {
  code: string;
  prompt: string;
  modelUsed: string;
  timestamp: Date;
}

export interface AIServiceInterface {
  generateSection(prompt: string): Promise<string>;
  getMockSection(prompt: string): string;
}

// Theme Service Types
export interface ThemeServiceInterface {
  getThemes(request: Request): Promise<Theme[]>;
  createSection(
    request: Request,
    themeId: string,
    fileName: string,
    content: string
  ): Promise<ThemeFileMetadata>;
}

// Database Types
export interface GeneratedSectionRecord {
  id: string;
  shop: string;
  prompt: string;
  content: string;
  createdAt: Date;
}

// Action Data Types for Routes
export interface GenerateActionData {
  success?: boolean;
  code?: string;
  prompt?: string;
  message?: string;
}

export interface SaveActionData {
  success: boolean;
  message: string;
}
