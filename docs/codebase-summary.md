# Codebase Summary - AI Section Generator (Blocksmith)

**Last Updated**: 2026-01-27
**Version**: 1.9 (Phase 01 CRO Recipes Complete)
**Architecture**: Service-oriented, multi-tenant, React Router 7 SSR with TypeScript strict mode

## Overview

**AI Section Generator** (Blocksmith) is a production-ready Shopify embedded app enabling merchants to create custom Liquid theme sections using Google Gemini 2.5 Flash AI without coding. The system features a modern React Router 7 server-side rendering architecture with comprehensive AI chat, live preview via App Proxy native Shopify Liquid, multi-tenant billing, complete TypeScript strict mode throughout, and UI feedback for continuation events during generation.

**Codebase Stats**:
- **Application Files**: 242 (TypeScript/TSX, Prisma, CSS, JSON)
- **React Components**: 116 organized in 8 feature domains
- **Service Modules**: 20 server-only files (`.server.ts`)
- **Routes**: 29 file-based (protected/public/webhooks/API)
- **Database Models**: 12 Prisma models with relationships
- **Test Suites**: 33+ Jest test files
- **AI Chat Features**: Streaming SSE, phase tracking, structured change extraction (Phase 3), auto-continuation for truncated responses (Phase 3), UI feedback badges for completion status (Phase 4)

## Directory Structure

```
ai-section-generator-app/
├── app/                                  # Application source code (235 files)
│   ├── routes/                          # 29 file-based React Router routes
│   │   ├── Protected Routes (auth required):
│   │   │   ├── app._index.tsx           # Dashboard/home (analytics, quick stats)
│   │   │   ├── app.sections._index.tsx  # Sections list (tabs: All/Draft/Active/Archive)
│   │   │   ├── app.sections.new.tsx     # Create section (template selection or AI generation)
│   │   │   ├── app.sections.$id.tsx     # Edit section (3-column: chat | code | preview)
│   │   │   ├── app.templates.tsx        # Template library (118 prebuilt templates)
│   │   │   ├── app.billing.tsx          # Plan management + usage dashboard
│   │   │   ├── app.settings.tsx         # User preferences
│   │   │   ├── app.tsx                  # App layout wrapper (navigation, auth)
│   │   │
│   │   ├── API Routes (data endpoints):
│   │   │   ├── api.chat.stream.tsx      # SSE streaming for chat (Phase 4 updated)
│   │   │   │   - Phase 3: Auto-continuation for truncated responses
│   │   │   │   - Phase 4: Emits continuation_start/continuation_complete events
│   │   │   │   - Phase 4: message_complete includes wasComplete, continuationCount
│   │   │   ├── api.chat.messages.ts     # Conversation message persistence
│   │   │   ├── api.enhance-prompt.ts    # Prompt optimization via Gemini
│   │   │   ├── api.preview.render.ts    # App Proxy rendering (native Liquid)
│   │   │   ├── api.feedback.ts          # Quality feedback collection
│   │   │   └── api.sections.*.ts        # Section CRUD endpoints
│   │   │
│   │   ├── Webhooks:
│   │   │   ├── webhooks.app.uninstalled.tsx     # App uninstall cleanup
│   │   │   ├── webhooks.app.subscriptions-update.tsx # Billing webhooks
│   │   │   └── webhooks.app.scopes-update.tsx   # Scope change handling
│   │   │
│   │   ├── Authentication:
│   │   │   ├── auth.callback.ts         # OAuth callback handler
│   │   │   ├── auth.login.ts            # Login initiation
│   │   │   └── auth.logout.ts           # Logout handler
│   │   │
│   │   └── _index/                      # Public landing page (non-embedded)
│   │
│   ├── components/                      # 111 React components (8 feature domains)
│   │   ├── editor/                      # 3-column editor layout
│   │   │   ├── PolarisEditorLayout.tsx  # Main layout container
│   │   │   ├── ChatPanelWrapper.tsx     # Chat column wrapper
│   │   │   ├── CodePreviewPanel.tsx     # Code column with syntax highlighting
│   │   │   ├── PublishModal.tsx         # Dual-action save dialog
│   │   │   ├── SettingsPanel.tsx        # Settings column with form controls
│   │   │   ├── SectionNameInput.tsx     # Section naming component
│   │   │   ├── StatusBadge.tsx          # Draft/Saved/Active status display
│   │   │   ├── hooks/
│   │   │   │   ├── useEditorState.ts    # State management for editor
│   │   │   │   ├── useVersionState.ts   # Version history + auto-apply logic
│   │   │   │   └── useAutoSave.ts       # Silent draft persistence
│   │   │   └── __tests__/               # 7 test suites
│   │   │
│   │   ├── chat/                        # AI chat interface (28 files, Phase 4 UI Feedback)
│   │   │   ├── ChatPanel.tsx            # Main chat container
│   │   │   │   - Phase 4: Receives generationStatus from useChat hook
│   │   │   │   - Passes generationStatus to MessageList for UI feedback
│   │   │   ├── ChatInput.tsx            # Message input with file support
│   │   │   ├── MessageList.tsx          # Scrollable message history (Phase 4 updated)
│   │   │   │   - Phase 4: Continuation indicator during auto-continuation
│   │   │   │   - Shows continuation attempt and reason (token_limit, incomplete_code)
│   │   │   │   - Displays as visual feedback banner
│   │   │   ├── MessageItem.tsx          # Individual message styling
│   │   │   ├── CodeBlock.tsx            # Code block rendering in chat (Phase 4 updated)
│   │   │   │   - Phase 4: completionStatus prop ('complete', 'potentially-incomplete', 'generating')
│   │   │   │   - 'potentially-incomplete': Warning badge with tooltip
│   │   │   │   - 'complete' + continuationCount > 0: 'Auto-completed' badge with continuation count
│   │   │   ├── AIResponseCard.tsx       # Unified streaming + completed AI responses (Phase 1)
│   │   │   │   - Phase indicators: Analyzing → Schema → Styling → Finalizing
│   │   │   │   - Change bullets: Extracted from AI response structured comments
│   │   │   │   - Collapsible code accordion (collapsed by default)
│   │   │   │   - CSS transitions for smooth state changes
│   │   │   │   - Memoized for performance
│   │   │   ├── VersionCard.tsx          # AI version suggestion cards
│   │   │   ├── VersionBadge.tsx         # Version number badge display
│   │   │   ├── VersionTimeline.tsx      # Version history timeline
│   │   │   ├── BuildProgressIndicator.tsx # Generation progress display
│   │   │   ├── StreamingCodeBlock.tsx   # Code rendering during streaming
│   │   │   ├── SuggestionChips.tsx      # Quick action suggestion chips
│   │   │   ├── LoadingIndicator.tsx     # Streaming state indicator
│   │   │   ├── TypingIndicator.tsx      # Typing animation
│   │   │   ├── hooks/
│   │   │   │   ├── useChat.ts           # Chat message management (Phase 4 updated)
│   │   │   │   │   - Stores generationStatus state: isGenerating, isContinuing, etc.
│   │   │   │   │   - Handles continuation_start/continuation_complete events
│   │   │   │   │   - Tracks wasComplete and continuationCount from message_complete
│   │   │   │   ├── useAutoScroll.ts     # Auto-scroll on new messages
│   │   │   │   ├── useStreamingMessage.ts # SSE stream handling
│   │   │   │   ├── useStreamingProgress.ts # Streaming phase tracking
│   │   │   │   └── useChatSuggestions.ts # Quick action suggestions
│   │   │   ├── utils/
│   │   │   │   ├── parseStreamedResponse.ts # Response parsing
│   │   │   │   ├── formatChatMessage.ts     # Message formatting
│   │   │   │   ├── extractCodeBlocks.ts     # Code extraction from chat
│   │   │   │   ├── code-extractor.ts        # Extract code + changes from AI response (Phase 3)
│   │   │   │   │   - Structured CHANGES comment parsing: <!-- CHANGES: [...] -->
│   │   │   │   │   - Fallback: bullet/numbered list extraction
│   │   │   │   │   - Max 5 changes enforced (UX: scannable display)
│   │   │   │   ├── section-type-detector.ts # Detect section category from prompt
│   │   │   │   └── suggestion-engine.ts     # Generate quick action suggestions
│   │   │   └── __tests__/               # 7 test suites (added CodeBlock completion badges)
│   │   │
│   │   ├── generate/                    # Generation workflow (14 files)
│   │   │   ├── GenerateLayout.tsx       # Two-column layout (input | preview)
│   │   │   ├── GenerateInputColumn.tsx  # Left column (prompt + options)
│   │   │   ├── GeneratePreviewColumn.tsx # Right column (code preview + actions)
│   │   │   ├── PromptInput.tsx          # Main prompt text area
│   │   │   ├── ThemeSelector.tsx        # Theme selection dropdown
│   │   │   ├── FileNameInput.tsx        # Section filename input
│   │   │   ├── CodePreview.tsx          # Code display with syntax highlight
│   │   │   ├── GenerateActions.tsx      # Save Draft + Publish buttons
│   │   │   ├── TemplateSuggestions.tsx  # Suggested templates
│   │   │   ├── SaveTemplateModal.tsx    # Save as template dialog
│   │   │   ├── LoadingSpinner.tsx       # Generation progress indicator
│   │   │   ├── ErrorBanner.tsx          # Error message display
│   │   │   └── __tests__/               # 4 test suites
│   │   │
│   │   ├── preview/                     # Live preview system (45+ files)
│   │   │   ├── AppProxyPreviewFrame.tsx # Main preview renderer with password integration
│   │   │   ├── PasswordConfigModal.tsx  # Storefront password entry
│   │   │   ├── PreviewHeader.tsx        # Preview title + refresh button
│   │   │   ├── PreviewLoader.tsx        # Loading state
│   │   │   ├── PreviewError.tsx         # Error recovery UI
│   │   │   ├── hooks/
│   │   │   │   ├── useNativePreviewRenderer.ts # Server-side fetch wrapper
│   │   │   │   ├── usePreviewRefresh.ts       # Manual refresh trigger
│   │   │   │   ├── usePreviewState.ts         # Preview state management
│   │   │   │   └── usePasswordIntegration.ts  # Password modal coordination
│   │   │   ├── targeting/              # Element selection system (Phase 3)
│   │   │   │   └── iframe-injection-script.ts # Click-to-select script
│   │   │   ├── schema/                 # Schema parsing & defaults (Phase 2+)
│   │   │   │   ├── parseSchema.ts      # Parse schema JSON (31 Shopify types)
│   │   │   │   ├── buildDefaultValues.ts # Generate default values for settings
│   │   │   │   ├── extractBlockDefinitions.ts # Extract block metadata
│   │   │   │   ├── buildBlockInstances.ts    # Initialize block instances
│   │   │   │   └── shopify-setting-types.ts  # Type definitions (25+ types)
│   │   │   ├── settings/               # Settings form components
│   │   │   │   ├── SettingsForm.tsx          # Main form container
│   │   │   │   ├── SettingsSection.tsx       # Grouped settings section
│   │   │   │   ├── SettingInput/             # Individual setting controls (20+)
│   │   │   │   │   ├── TextInput.tsx         # text type
│   │   │   │   │   ├── SelectInput.tsx       # select/radio types
│   │   │   │   │   ├── CheckboxInput.tsx     # checkbox type
│   │   │   │   │   ├── ColorInput.tsx        # color picker
│   │   │   │   │   ├── FontInput.tsx         # font selector
│   │   │   │   │   ├── RangeInput.tsx        # range slider
│   │   │   │   │   ├── ImagePicker.tsx       # Image selection
│   │   │   │   │   ├── ProductPicker.tsx     # Product selector
│   │   │   │   │   ├── CollectionPicker.tsx  # Collection selector
│   │   │   │   │   └── ... (15+ more)
│   │   │   │   └── SettingValue.tsx          # Value display component
│   │   │   ├── context-drops/          # Context data renderers (18 types)
│   │   │   │   ├── ShopContextDrop.tsx       # shop. variables
│   │   │   │   ├── ProductContextDrop.tsx    # product. variables
│   │   │   │   ├── CollectionContextDrop.tsx # collection. variables
│   │   │   │   ├── ArticleContextDrop.tsx    # article. variables
│   │   │   │   ├── CustomerContextDrop.tsx   # customer. variables
│   │   │   │   ├── CartContextDrop.tsx       # cart. variables
│   │   │   │   ├── ... (12+ more)
│   │   │   │   └── resource-picker/  # Resource selection components
│   │   │   │       ├── ProductResourcePicker.tsx
│   │   │   │       ├── CollectionResourcePicker.tsx
│   │   │   │       └── ... (8+ more pickers)
│   │   │   ├── filters/                # Shopify Liquid filter renderers (25+)
│   │   │   │   ├── StringFilterRenderers.tsx  # size, upcase, downcase, etc.
│   │   │   │   ├── ArrayFilterRenderers.tsx   # first, last, map, sort, etc.
│   │   │   │   ├── MathFilterRenderers.tsx    # abs, ceil, floor, round, etc.
│   │   │   │   ├── ColorFilterRenderers.tsx   # color_modify, color_lighten, etc.
│   │   │   │   ├── MediaFilterRenderers.tsx   # img_url, video_tag, etc.
│   │   │   │   ├── FontFilterRenderers.tsx    # font_url, font_modify, etc.
│   │   │   │   ├── MetafieldFilterRenderers.tsx # metafield_json, etc.
│   │   │   │   └── CustomFilterRenderers.tsx   # Custom filter support
│   │   │   └── __tests__/              # 8 test suites
│   │   │
│   │   ├── sections/                   # Section management (6 files)
│   │   │   ├── SectionList.tsx         # Sections table/grid
│   │   │   ├── SectionListItem.tsx     # Individual section card
│   │   │   ├── SectionStats.tsx        # Statistics card
│   │   │   ├── SectionActionsMenu.tsx  # Edit/Delete/Archive menu
│   │   │   ├── SectionStatusFilter.tsx # Tab filter
│   │   │   └── __tests__/              # 2 test suites
│   │   │
│   │   ├── templates/                  # Template library (5 files)
│   │   │   ├── TemplateLibrary.tsx     # Template grid view
│   │   │   ├── TemplateCard.tsx        # Template preview card
│   │   │   ├── TemplatePreview.tsx     # Template detail view
│   │   │   ├── TemplateCategories.tsx  # Category filter
│   │   │   └── __tests__/              # 1 test suite
│   │   │
│   │   ├── billing/                    # Billing UI (8 files)
│   │   │   ├── PlanSelector.tsx        # Plan comparison + selection
│   │   │   ├── UsageDashboard.tsx      # Current usage display
│   │   │   ├── BillingHistory.tsx      # Invoice table
│   │   │   ├── FeatureGate.tsx         # Plan-feature availability
│   │   │   ├── QuotaAlert.tsx          # Usage warning banner
│   │   │   ├── PlanCard.tsx            # Individual plan display
│   │   │   └── __tests__/              # 2 test suites
│   │   │
│   │   ├── home/                       # Home/dashboard (5 files)
│   │   │   ├── Dashboard.tsx           # Main dashboard
│   │   │   ├── Analytics.tsx           # Usage analytics
│   │   │   ├── QuickActions.tsx        # Action shortcuts
│   │   │   ├── RecentSections.tsx      # Recent activity
│   │   │   └── __tests__/              # 1 test suite
│   │   │
│   │   └── common/                     # Shared components (9 files)
│   │       ├── Button.tsx              # Primary button
│   │       ├── Card.tsx                # Card container
│   │       ├── Modal.tsx               # Modal dialog
│   │       ├── Toast.tsx               # Toast notifications
│   │       ├── Banner.tsx              # Notification banners
│   │       ├── SkeletonLoader.tsx      # Loading skeleton
│   │       ├── EmptyState.tsx          # Empty state display
│   │       └── __tests__/              # 1 test suite
│   │
│   ├── services/                       # 19 server-only modules (business logic)
│   │   ├── ai.server.ts               # Gemini 2.5 Flash integration (330 LOC, Phase 3 Auto-Continuation)
│   │   │   - GENERATION_CONFIG: maxOutputTokens 65536 (prevents silent truncation at ~8K default)
│   │   │   - generateWithContext(prompt, context, options) → async generator streaming tokens (Phase 3)
│   │   │   - onFinishReason callback → reports MAX_TOKENS or STOP reason (Phase 3)
│   │   │   - Feature flag: FLAG_MAX_OUTPUT_TOKENS for rollback
│   │   │   - generateSection(prompt, context) → Liquid code (legacy alias)
│   │   │   - enhancePrompt(prompt) → improved prompt
│   │   │   - Mock fallback for development
│   │   │
│   │   ├── chat.server.ts             # Conversation management (220 LOC)
│   │   │   - createConversation(sectionId, shop)
│   │   │   - addMessage(conversationId, role, content)
│   │   │   - getConversation(id) → full history
│   │   │
│   │   ├── section.server.ts          # Section CRUD (430 LOC, Phase 02 Complete)
│   │   │   - create(shop, prompt, code) → Section (DRAFT status)
│   │   │   - update(id, shop, { code, status, themeId, fileName })
│   │   │   - delete(id, shop) → CASCADE DELETE (Phase 01, atomic transaction)
│   │   │   - bulkDelete(ids, shop) → Transactional cascade delete (Phase 02)
│   │   │     - Single Prisma transaction for all-or-nothing semantics
│   │   │     - Ownership validation via shop domain
│   │   │     - Max 50 ids per request (enforced in route action)
│   │   │     - Cascade order: messages → conversations → usage/feedback/charges → sections
│   │   │     - Returns count of deleted sections
│   │   │   - Cascade: Messages, Conversation, UsageRecord, SectionFeedback, FailedUsageCharge
│   │   │   - Preserves: GenerationLog (audit trail, sectionId becomes orphan)
│   │   │   - publish(id, shop, { themeId, themeName, fileName })
│   │   │   - unpublish(id, shop) → reverts to DRAFT
│   │   │   - archive(id, shop) → INACTIVE status
│   │   │   - restore(id, shop) → DRAFT status
│   │   │   - listSections(shop, { page, limit, status? })
│   │   │   - getById(id, shop)
│   │   │   - getMostRecent(shop)
│   │   │   - countByStatus(shop)
│   │   │   - Status lifecycle: DRAFT → ACTIVE → INACTIVE (archive/restore)
│   │   │   - Status transitions validated via SECTION_STATUS.isValidTransition()
│   │   │   - All delete operations wrapped in Prisma transactions for data integrity
│   │   │
│   │   ├── billing.server.ts          # Shopify App Billing (450 LOC)
│   │   │   - getSubscription(shop) → active plan
│   │   │   - createSubscriptionIntent(shop, planName)
│   │   │   - confirmSubscription(chargeId) → activate
│   │   │   - calculateUsageCharge(shop, usage)
│   │   │   - Hybrid: recurring + usage-based charges
│   │   │
│   │   ├── feature-gate.server.ts     # Plan-based access (180 LOC)
│   │   │   - isFeatureEnabled(shop, feature) → boolean
│   │   │   - getFeatureLimit(shop, feature) → quota
│   │   │   - Features: live_preview, publish_theme, chat_refinement
│   │   │
│   │   ├── shopify-data.server.ts     # GraphQL Admin API (340 LOC)
│   │   │   - fetchThemes(adminClient) → list themes
│   │   │   - fetchProducts(adminClient, first, query) → paginated
│   │   │   - fetchCollections(adminClient) → list
│   │   │   - fetchArticles(adminClient) → blog articles
│   │   │   - Handles pagination and field selection
│   │   │
│   │   ├── theme.server.ts            # Theme publishing (290 LOC)
│   │   │   - saveToTheme(adminClient, themeId, fileName, code)
│   │   │   - Uses themeFilesUpsert mutation
│   │   │   - Error handling: GraphQL userErrors, rate limits
│   │   │
│   │   ├── encryption.server.ts       # AES-256-GCM (170 LOC)
│   │   │   - encryptPassword(password, key) → ciphertext
│   │   │   - decryptPassword(ciphertext, key) → plaintext
│   │   │   - For storefront password protection
│   │   │
│   │   ├── storefront-auth.server.ts  # Storefront access (210 LOC)
│   │   │   - createStorefrontSession(shop, password)
│   │   │   - validateStorefrontToken(shop, token)
│   │   │   - For password-protected preview access (Phase 2)
│   │   │
│   │   ├── usage-tracking.server.ts   # Quota tracking (280 LOC)
│   │   │   - recordUsage(shop, feature, amount)
│   │   │   - getUsage(shop, feature, period) → current/monthly
│   │   │   - checkQuota(shop, feature) → { used, limit, available }
│   │   │   - isOverQuota(shop, feature) → boolean
│   │   │
│   │   ├── generation-log.server.ts   # Audit trail (150 LOC)
│   │   │   - logGeneration(shop, prompt, code, result)
│   │   │   - Immutable append-only log
│   │   │   - For compliance & debugging
│   │   │
│   │   ├── cro-recipe.server.ts       # CRO recipes (180 LOC, Phase 01)
│   │   │   - getActiveRecipes() → all active recipes ordered by display order
│   │   │   - getRecipeBySlug(slug) → single recipe by URL-safe identifier
│   │   │   - getRecipeById(id) → single recipe by ID
│   │   │   - buildPrompt(recipe, context) → inject context into prompt template
│   │   │   - Conversion-optimized section generation prompts
│   │   │   - Stores business problem context + CRO principles
│   │   │
│   │   ├── shopify.server.ts          # Shopify app config (280 LOC)
│   │   │   - OAuth configuration
│   │   │   - Session storage (online/offline)
│   │   │   - API client initialization
│   │   │
│   │   └── (10+ additional services: database, auth, utils)
│   │
│   ├── utils/                          # Utility functions (17 files, Phase 3 Auto-Continuation)
│   │   ├── code-extractor.ts          # Extract code + changes from AI responses (Phase 3 + Phase 2)
│   │   │   - extractCodeFromResponse() → code + changes + explanation
│   │   │   - extractChanges() → structured comment or fallback parsing
│   │   │   - stripChangesComment() → clean code for display
│   │   │   - isCompleteLiquidSection() → validation
│   │   │   - validateLiquidCompleteness() → comprehensive Liquid validation (Phase 2)
│   │   │     * Stack-based Liquid tag validation (if, for, case, form, etc.)
│   │   │     * Stack-based HTML tag validation with truncation detection
│   │   │     * Schema block and JSON validation
│   │   │     * Feature flag: FLAG_VALIDATE_LIQUID
│   │   │   - findOverlap(str1, str2) → detect overlapping content from continuation (Phase 3)
│   │   │   - mergeResponses(original, continuation) → intelligent merge avoiding duplication (Phase 3)
│   │   │     * Detects overlapping text between responses
│   │   │     * Removes duplicated content when merging continuations
│   │   │     * Prevents mangled Liquid output from consecutive generations
│   │   ├── context-builder.ts         # Build conversation context + CHANGES instruction
│   │   │   - CHAT_SYSTEM_EXTENSION → AI prompt with structured CHANGES format
│   │   │   - buildConversationPrompt() → full context assembly
│   │   │   - getChatSystemPrompt() → system prompt with extension
│   │   │   - buildContinuationPrompt(originalPrompt, partialResponse, errors) → prompt for truncated response (Phase 3)
│   │   │     * Provides context about truncated response
│   │   │     * Hints for missing closing tags
│   │   │     * Instructs AI to continue exactly where it left off
│   │   │     * Feature flag: FLAG_AUTO_CONTINUE
│   │   ├── input-sanitizer.ts         # XSS/injection prevention
│   │   ├── liquid-wrapper.server.ts   # App Proxy context injection
│   │   ├── settings-transform.server.ts # Liquid assigns generation
│   │   ├── blocks-iteration.server.ts  # Block loop rewriting
│   │   ├── prompt-template.ts         # System prompt building
│   │   ├── error-handler.server.ts    # Centralized error handling
│   │   ├── retry-logic.server.ts      # Exponential backoff
│   │   ├── logger.server.ts           # Structured logging
│   │   ├── validators.ts              # Input validation helpers
│   │   ├── formatters.ts              # Output formatting
│   │   └── __tests__/                 # 3 test suites
│   │
│   ├── types/                          # TypeScript definitions (8 files, Phase 4 UI Feedback)
│   │   ├── ai.types.ts                # AI request/response types (updated Phase 3)
│   │   │   - StreamingOptions → onToken, onComplete, onError callbacks
│   │   │   - ExtendedStreamingOptions → extends with onFinishReason callback (Phase 3)
│   │   │   - ContinuationResult → content, finishReason, continuationCount, wasComplete (Phase 3)
│   │   │   - ConversationContext → currentCode, recentMessages, summarizedHistory
│   │   │   - CodeExtractionResult → code extraction + structured changes
│   │   ├── chat.types.ts              # Chat message types (updated Phase 4)
│   │   │   - GenerationStatus → isGenerating, isContinuing, continuationAttempt, wasComplete, continuationCount
│   │   │   - CompletionStatus → 'complete' | 'potentially-incomplete' | 'generating'
│   │   │   - ContinuationStartData → attempt, reason, errors
│   │   │   - ContinuationCompleteData → attempt, isComplete, totalLength
│   │   │   - MessageCompleteData → wasComplete, continuationCount metadata
│   │   ├── section.types.ts           # Section model types
│   │   ├── service.types.ts           # Service interfaces
│   │   ├── section-status.ts          # Status enum (DRAFT, ACTIVE, ARCHIVE)
│   │   ├── billing.types.ts           # Billing/usage types
│   │   ├── shopify-api.types.ts       # Admin API response types
│   │   └── dashboard.types.ts         # Dashboard data types
│   │
│   ├── styles/                        # CSS & Tailwind (8 files)
│   │   ├── globals.css                # Global resets + utilities
│   │   ├── layout.css                 # Layout utilities
│   │   ├── components.css             # Component-specific styles
│   │   ├── new-section.css            # New section page layout
│   │   ├── editor.css                 # Editor panel styling
│   │   ├── chat.css                   # Chat interface styles
│   │   ├── preview.css                # Preview panel styles
│   │   └── animations.css             # Transitions + keyframes
│   │
│   ├── shopify.server.ts             # Shopify app initialization
│   ├── db.server.ts                   # Prisma client singleton
│   ├── root.tsx                       # HTML root + global layout
│   ├── entry.server.tsx               # Server entry point
│   └── remix.config.js                # Build configuration
│
├── prisma/                            # Database schema
│   ├── schema.prisma                  # 11 models + relationships
│   └── migrations/                    # Schema migration history
│
├── tests/                             # Test suite root
│   └── __tests__/                     # 30+ Jest test files
│
├── public/                            # Static assets
│   ├── favicon.ico                    # App icon
│   └── assets/                        # Images, fonts
│
├── .github/                           # GitHub workflows
│   └── workflows/                     # CI/CD pipelines
│
├── .claude/                           # Claude Code workflows
│   └── workflows/                     # Development orchestration
│
├── docs/                              # Documentation
│   ├── project-overview-pdr.md        # Product requirements
│   ├── code-standards.md              # Dev guidelines
│   ├── codebase-summary.md            # This file
│   ├── system-architecture.md         # Technical design
│   ├── deployment-guide.md            # Production setup
│   └── project-roadmap.md             # Future enhancements
│
├── .env.example                       # Environment template
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript strict mode config
├── vite.config.ts                     # Vite build config
├── README.md                          # Quick start guide
└── CLAUDE.md                          # AI assistant guidance
```

## Component Inventory by Feature

### Editor (7 components)
- PolarisEditorLayout - Main 3-column layout
- ChatPanelWrapper - Left panel wrapper
- CodePreviewPanel - Center column with syntax highlighting
- PublishModal - Dual-action save dialog
- SettingsPanel - Right panel for schema settings
- SectionNameInput - Title input
- StatusBadge - Status indicator

### Chat (28 components, Phase 4 UI Feedback)
- ChatPanel, ChatInput, MessageList, CodeBlock (Phase 4: completion badges), VersionCard
- AIResponseCard, MessageItem, LoadingIndicator, TypingIndicator
- BuildProgressIndicator, StreamingCodeBlock, VersionBadge, VersionTimeline
- SuggestionChips, EmptyChatState
- Custom hooks: useChat (Phase 4: generationStatus), useAutoScroll, useStreamingMessage, useStreamingProgress, useChatSuggestions
- Phase 4 UI Feedback: Completion status badges, continuation indicators, generation status tracking
- Utilities: code-extractor (extractCodeFromResponse, extractChanges), detectSectionType, getSuggestions

### Generate (14 components)
- GenerateLayout, GenerateInputColumn, GeneratePreviewColumn
- PromptInput, ThemeSelector, FileNameInput, CodePreview
- GenerateActions, TemplateSuggestions, SaveTemplateModal
- LoadingSpinner, ErrorBanner

### Preview (45+ components)
- AppProxyPreviewFrame (main renderer)
- PasswordConfigModal (password entry)
- PreviewHeader, PreviewLoader, PreviewError
- 20+ SettingInput components (text, select, checkbox, color, font, range, image, product, collection, etc.)
- 18 context drop renderers (shop, product, collection, article, customer, cart, etc.)
- 25+ filter renderers (string, array, math, color, media, font, metafield, custom)
- 8+ resource pickers

### Sections (6 components)
- SectionList, SectionListItem, SectionStats
- SectionActionsMenu, SectionStatusFilter

### Templates (5 components)
- TemplateLibrary, TemplateCard, TemplatePreview
- TemplateCategories

### Billing (8 components)
- PlanSelector, UsageDashboard, BillingHistory
- FeatureGate, QuotaAlert, PlanCard

### Home/Dashboard (5 components)
- Dashboard, Analytics, QuickActions, RecentSections

### Common (9 components)
- Button, Card, Modal, Toast, Banner
- SkeletonLoader, EmptyState

## Service Layer Overview

### Core AI Service
- `ai.server.ts` - Google Gemini 2.5 Flash integration (Phase 3 compatible)
  - Streaming response handling with change extraction
  - System prompt with 137 lines + CHANGES instruction (Phase 3)
  - Instruction: AI outputs <!-- CHANGES: [...] --> comment with 3-5 user-visible changes
  - Mock fallback for development
  - Error recovery with retry logic

### Data Management
- `section.server.ts` - Section CRUD with status lifecycle, transactional bulk delete (Phase 02)
- `chat.server.ts` - Conversation and message persistence
- `generation-log.server.ts` - Immutable audit trail

### External Integrations
- `shopify-data.server.ts` - GraphQL queries (themes, products, collections)
- `theme.server.ts` - Theme file publishing
- `shopify.server.ts` - OAuth session management

### Feature Control
- `billing.server.ts` - Hybrid pricing (recurring + usage)
- `feature-gate.server.ts` - Plan-based feature access
- `usage-tracking.server.ts` - Quota management

### Security & Privacy
- `encryption.server.ts` - AES-256-GCM for passwords
- `storefront-auth.server.ts` - Storefront password tokens
- `input-sanitizer.ts` - XSS/injection prevention

### Utilities
- `code-extractor.ts` - Parse AI responses + extract structured changes (Phase 3 + Phase 2)
  - Handles <!-- CHANGES: [...] --> comment format
  - Fallback: bullet/numbered list extraction from explanation
  - Max 5 changes enforced for scannable display
  - validateLiquidCompleteness() validates Liquid code structure (Phase 2)
    * Errors: unclosed_liquid_tag, unclosed_html_tag, invalid_schema_json, missing_schema
    * Stack-based tag matching for proper nesting validation
    * Heuristic HTML detection (reports only if multiple tags unclosed, likely truncation)
    * Controlled by FLAG_VALIDATE_LIQUID feature flag
- `context-builder.ts` - Build conversation prompts with CHANGES instruction
- `liquid-wrapper.server.ts` - App Proxy injection
- `settings-transform.server.ts` - Generate Liquid assigns
- `blocks-iteration.server.ts` - Rewrite block loops

## Route Structure

### Protected Routes (Authenticated)
- `/app` - Dashboard
- `/app/sections` - List sections
- `/app/sections/new` - Create new
- `/app/sections/:id` - Edit section
- `/app/templates` - Template library
- `/app/billing` - Billing management
- `/app/settings` - User preferences

### API Routes (JSON endpoints)
- `POST /api/chat/stream` - SSE streaming (Phase 4: continuation feedback events)
- `GET /api/chat/messages` - Get conversation
- `POST /api/enhance-prompt` - Optimize prompt
- `POST /api/preview/render` - Render preview
- `POST /api/feedback` - Submit quality feedback
- `POST /api/sections` - Create section
- `PATCH /api/sections/:id` - Update section
- `DELETE /api/sections/:id` - Delete section

### Webhook Routes
- `POST /webhooks/app/uninstalled` - Cleanup
- `POST /webhooks/app/subscriptions_update` - Billing
- `POST /webhooks/app/scopes_update` - Permissions

### Auth Routes
- `GET /auth/login` - Initiate OAuth
- `GET /auth/callback` - OAuth callback
- `POST /auth/logout` - Logout

## Database Models (12 Prisma Models)

```prisma
// Core business models
Section {
  id, shop, prompt, content, status
  themeId?, themeName?, fileName?
  conversationId?, createdAt, updatedAt
  feedback?, generationLogId
}

Conversation {
  id, shop, sectionId
  messages (relation)
  createdAt, updatedAt
}

Message {
  id, conversationId, role, content
  codeSnapshot?, changes?, createdAt  // Phase 3: structured change extraction
}

// Billing models
Subscription {
  id, shop, planId, chargeId, status
  billingCycle, nextBillingDate, cancelledAt
}

UsageRecord {
  id, shop, feature, amount, billingPeriod
  createdAt
}

PlanConfiguration {
  id, planName, basePrice, features
  limits (JSON), quotas (JSON)
}

// Template models
SectionTemplate {
  id, name, category, code, schema
  previewCode?, tags, downloads, rating
  createdBy, createdAt
}

// Supporting models
ShopSettings {
  shop, timezone, defaultTheme, preferences (JSON)
}

GenerationLog {
  id, shop, prompt, code, result (JSON), createdAt
}

FailedUsageCharge {
  id, shop, amount, reason, retryCount, createdAt
}

SectionFeedback {
  id, sectionId, rating, comment, createdAt
}

CRORecipe {
  id, slug, name, icon
  businessProblem, croPrinciples[]
  promptTemplate, requiredElements[]
  contextQuestions (JSON), active, order
  createdAt, updatedAt
}
```

## Supported Settings & Context

### Schema Settings (31 Shopify Types)
- **Text Controls**: text, textarea, richtext, html
- **Selection**: select, radio, checkbox
- **Color**: color (with swatches)
- **Numbers**: number, range (0-100)
- **Images**: image_picker
- **Resources**: product, collection, article, blog, page, metafield
- **Advanced**: font, url, margin, padding, border_style, gradient
- Plus 8+ more specialized types

### Context Drops (18 Types)
- shop, product, collection, article
- blog, customer, order, cart
- image, linklists, pages, theme
- current_page, localization, request
- theme_asset, search, recommendations

### Filters (25+)
- **String**: size, upcase, downcase, capitalize, replace, split, strip, etc.
- **Array**: first, last, map, join, sort, uniq, where, etc.
- **Math**: abs, ceil, floor, round, plus, minus, times, divided_by, modulo
- **Color**: color_modify, color_lighten, color_darken, color_saturate, etc.
- **Media**: img_url, video_tag, external_video_tag
- **Font**: font_url, font_modify
- **Metafield**: metafield_json

### Tags (9+)
- form, paginate, style, tablerow, assign, capture
- if/elsif/else, unless, case/when

## Key Technologies

### Frontend Stack
- **React Router 7.9.3** - Server-side routing
- **React 18.3.1** - Component framework
- **TypeScript 5.9.3** - Strict mode throughout
- **Vite 6.3.6** - Build tool
- **Polaris Web Components 13.9.5** - Native Shopify admin UI

### Backend & Database
- **Node.js >= 20.19** - Runtime
- **Prisma 6.16.3** - ORM with 11 models
- **MongoDB** - Production database
- **GraphQL** - Shopify Admin API client

### AI Integration
- **Google Generative AI SDK** - Gemini 2.5 Flash
- **Streaming** - Server-Sent Events for real-time responses

### Shopify Integration
- **@shopify/shopify-app-react-router 1.0+** - Framework
- **App Proxy** - Native Liquid preview rendering
- **OAuth 2.0** - Authentication
- **GraphQL Admin API** - Data queries

### Build & Quality
- **Vite 6** - Bundler
- **TypeScript 5.9** - Type safety
- **ESLint + Prettier** - Code quality
- **Jest 29+** - Testing (30+ test suites)
- **Shopify CLI** - Development & deployment

## Feature Status

### Completed (Phase 4 UI Feedback + Phase 3 Auto-Continuation + Phase 2 Validation - 100%)
- ✅ Full 3-column editor layout
- ✅ AI chat with streaming (SSE)
- ✅ Live preview with 18 context + 25+ filters
- ✅ 20+ schema setting UI controls
- ✅ Theme selection and direct save
- ✅ Dual-action save (Draft + Publish)
- ✅ Section editing with auto-save
- ✅ Hybrid billing (recurring + usage)
- ✅ TypeScript strict mode
- ✅ 33+ test suites
- ✅ Comprehensive documentation
- ✅ Phase 4: UI Feedback for generation status
  - Completion status badges (complete, potentially-incomplete, generating)
  - Continuation indicators with attempt count and reason (token_limit, incomplete_code)
  - Auto-completed badge showing continuation count
  - GenerationStatus tracking (isGenerating, isContinuing, wasComplete)
- ✅ Phase 3: Structured change extraction from AI responses (<!-- CHANGES: [...] -->)
- ✅ Phase 3: Auto-continuation for truncated responses with MAX_TOKENS detection
- ✅ Phase 2: Liquid completeness validation (truncation detection, tag matching)

### Pending
- ⏳ Shopify write_themes scope approval
- ⏳ Production deployment

### Future (Phase 5+)
- Template library
- Section versioning
- Marketplace sharing
- Advanced framework preferences
- Batch generation
- Analytics dashboard

## Performance Characteristics

**Generation**: < 10s (95th percentile)
**Theme Fetch**: < 2s (95th percentile)
**Section Save**: < 3s (95th percentile)
**App Load**: < 1s (3G connection)
**Uptime Target**: 99.5% availability

## Multi-Tenant Architecture

- Shop domain (FQDN) as tenant identifier
- Isolated sessions, data, billing per shop
- Session verification on all protected routes
- Webhook-driven scope + plan updates
- GraphQL API calls authenticated per shop

---

**Document Version**: 1.7
**Last Updated**: 2026-01-26
**Maintainer**: Documentation Manager
