/**
 * Barrel export file for all UI components
 * Provides centralized imports for shared and feature-specific components
 */

// Shared components
export { Button } from './shared/Button';
export { Card } from './shared/Card';
export { Banner, SuccessBanner, ErrorBanner } from './shared/Banner';

// Generate feature components - Layout
export { GenerateLayout } from './generate/GenerateLayout';
export { GeneratePreviewColumn } from './generate/GeneratePreviewColumn';

// Generate feature components - Recipe Selection (CRO)
export { RecipeCard } from './generate/RecipeCard';
export { RecipeSelector } from './generate/RecipeSelector';
export { RecipeContextModal } from './generate/RecipeContextModal';

// Generate feature components - Individual
export { ThemeSelector } from './generate/ThemeSelector';
export { CodePreview } from './generate/CodePreview';
export { SectionNameInput } from './generate/SectionNameInput';
export { GenerateActions } from './generate/GenerateActions';
export { AdvancedOptions } from './generate/AdvancedOptions';
export { LoadingState } from './generate/LoadingState';
export { EmptyState } from './generate/EmptyState';

// Types
export type { ButtonProps } from './shared/Button';
export type { CardProps } from './shared/Card';
export type { BannerProps } from './shared/Banner';
export type { GenerateLayoutProps } from './generate/GenerateLayout';
export type { GeneratePreviewColumnProps } from './generate/GeneratePreviewColumn';
export type { RecipeCardProps } from './generate/RecipeCard';
export type { RecipeSelectorProps } from './generate/RecipeSelector';
export type { RecipeContextModalProps, RecipeContext } from './generate/RecipeContextModal';
export type { ThemeSelectorProps } from './generate/ThemeSelector';
export type { CodePreviewProps } from './generate/CodePreview';
export type { SectionNameInputProps } from './generate/SectionNameInput';
export type { GenerateActionsProps } from './generate/GenerateActions';
export type { AdvancedOptionsProps, AdvancedOptionsState } from './generate/AdvancedOptions';
export type { LoadingStateProps } from './generate/LoadingState';
export type { EmptyStateProps } from './generate/EmptyState';

// Chat feature components
export { ChatPanel } from './chat/ChatPanel';
export { MessageList } from './chat/MessageList';
export { MessageItem } from './chat/MessageItem';
export { ChatInput } from './chat/ChatInput';
export { CodeBlock } from './chat/CodeBlock';
export { TypingIndicator } from './chat/TypingIndicator';
export { useChat } from './chat/hooks/useChat';
export { useAutoScroll } from './chat/hooks/useAutoScroll';

// Chat types
export type { ChatPanelProps } from './chat/ChatPanel';
export type { MessageListProps } from './chat/MessageList';
export type { MessageItemProps } from './chat/MessageItem';
export type { ChatInputProps } from './chat/ChatInput';
export type { CodeBlockProps } from './chat/CodeBlock';
export type { UseChatOptions, ChatState, ChatAction } from './chat/hooks/useChat';
export type { UseAutoScrollOptions } from './chat/hooks/useAutoScroll';
