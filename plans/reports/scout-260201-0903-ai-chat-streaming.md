# Scout Report: AI Chat/Response Mechanism, Section Generation, Liquid Extraction & Streaming

**Date:** 2026-02-01 | **Time:** 09:03
**Scope:** Complete mapping of AI chat infrastructure, streaming handlers, code extraction, and liquid processing
**Files Found:** 45 core files | **Categories:** 6

---

## Overview

Blocksmith's AI system consists of:
1. **AI Service** - Gemini API integration with streaming, CRO recipes, prompt enhancement
2. **Chat Service** - Conversation persistence, message management, version tracking
3. **Streaming Infrastructure** - SSE endpoints, real-time response handling, phase tracking
4. **Code Extraction** - Liquid parsing, validation, change detection
5. **Chat UI Components** - Real-time message display, streaming indicators, version management
6. **Utilities** - Input sanitization, prompt building, CRO reasoning parsing

---

## Core Files by Category

### 1. AI Service Layer

#### Primary AI Service
- **`/Users/lmtnolimit/projects/blocksmith/app/services/ai.server.ts`**
  - Gemini API integration via `@google/generative-ai`
  - Streaming generation with configurable output tokens (max 65536)
  - `generateSection()` - Main generation endpoint
  - `enhancePrompt()` - Prompt improvement with variations
  - `buildContinuation()` - Auto-completion for incomplete code
  - SYSTEM_PROMPT - 400+ line comprehensive Liquid/schema specification
  - CRO recipe support via `buildCROEnhancedPrompt()`
  - Streaming with fallback continuation logic
  - Token count tracking for billing

#### AI Adapter
- **`/Users/lmtnolimit/projects/blocksmith/app/services/adapters/ai-adapter.ts`**
  - Wrapper interface for AI service
  - Implements `AIServiceInterface`
  - Provides consistent abstraction layer

#### CRO Recipe Service
- **`/Users/lmtnolimit/projects/blocksmith/app/services/cro-recipe.server.ts`**
  - Manages CRO-focused recipe templates
  - `getActiveRecipes()` - Lists recipes by order
  - `getRecipeBySlug()` - Retrieves recipe definition
  - `buildRecipePrompt()` - Injects user context into recipe template
  - Interfaces: `ContextQuestion`, `RecipeContext`

### 2. Chat Service & Conversation Management

#### Chat Service
- **`/Users/lmtnolimit/projects/blocksmith/app/services/chat.server.ts`**
  - Conversation persistence (Prisma/MongoDB)
  - `getOrCreateConversation()` - Get/create per section
  - `addUserMessage()` - Persist user input
  - `addAssistantMessage()` - Persist AI response with duplicate prevention
  - `getContextMessages()` - Retrieve for context building
  - `createRestoreMessage()` - Version restoration
  - Message types: `UIMessage`, `ModelMessage`
  - Token tracking & message counting
  - Conversation metadata (title, messageCount, totalTokens, isArchived)

### 3. Streaming Endpoints

#### SSE Chat Stream Endpoint
- **`/Users/lmtnolimit/projects/blocksmith/app/routes/api.chat.stream.tsx`**
  - POST /api/chat/stream
  - Real-time streaming via Server-Sent Events
  - Input validation (10K char max for content, 100K for code)
  - Authorization & feature gating for refinement access
  - Handles continuation generation (auto-retry for incomplete code)
  - Conversation context building (recent + summarized history)
  - Error handling with upgrade information
  - Sanitization of user input
  - Duplicate message prevention
  - CRO reasoning extraction support
  - Constants: MAX_CONTINUATIONS=2, MAX_CONTENT_LENGTH=10000

#### Prompt Enhancement Endpoint
- **`/Users/lmtnolimit/projects/blocksmith/app/routes/api.enhance-prompt.tsx`**
  - POST /api/enhance-prompt
  - Prompt improvement with variations
  - Rate limiting (10 requests/minute per shop)
  - Input sanitization & validation
  - Returns enhanced prompt + variations array

#### Chat Messages Loader
- **`/Users/lmtnolimit/projects/blocksmith/app/routes/api.chat.messages.tsx`**
  - GET /api/chat/messages?conversationId=xxx
  - Retrieves conversation history
  - Creates conversation if sectionId provided
  - Authorization checks

#### Restore Endpoint
- **`/Users/lmtnolimit/projects/blocksmith/app/routes/api.chat.restore.tsx`**
  - POST /api/chat/restore
  - Non-destructive version restoration
  - Creates new system message with restored code
  - Tracks source version number

### 4. Code Extraction & Liquid Processing

#### Server-Side Code Extractor
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/code-extractor.ts`**
  - `extractCodeFromResponse()` - Parses code blocks from AI text
  - `validateLiquidCompleteness()` - Checks for truncation/incomplete code
  - `mergeResponses()` - Combines continuation responses
  - Handles multiple code block patterns (```liquid, ```html, ```)
  - Validates schema JSON, HTML tags, Liquid tags
  - Detects truncation at Gemini limits
  - Returns: `CodeExtractionResult` with code, explanation, changes
  - Change comment pattern extraction: `<!-- CHANGES: [...] -->`
  - Error types: unclosed tags, invalid schema, missing schema
  - Max changes returned: 5

#### Client-Side Code Extraction
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/code-extraction.client.ts`**
  - `extractCodeFromContent()` - Client-side code parsing
  - Pure functions (no server dependencies)
  - Used by `useChat` hook after streaming
  - Sanitizes extracted code

#### Liquid Wrapper/Settings Injection
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/liquid-wrapper.server.ts`**
  - `wrapLiquidForProxy()` - Injects settings/blocks for preview
  - `parseProxyParams()` - Decodes app proxy context
  - Schema stripping for native rendering
  - Settings transformation for Liquid assigns
  - Block iteration transformation
  - Validation of handles & section IDs
  - Max settings size: 70KB base64

#### Input Sanitizer
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/input-sanitizer.ts`**
  - `sanitizeUserInput()` - Prevents prompt injection
  - `validateLiquidCode()` - XSS vulnerability detection
  - `sanitizeLiquidCode()` - Cleans AI-generated code
  - Injection pattern detection (ignore instructions, override prompt, etc.)
  - XSS pattern detection (script tags, onclick, eval, etc.)
  - Control character stripping
  - Returns warnings for filtered patterns

### 5. Prompt & Context Building

#### Prompt Templates
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/prompt-templates.ts`**
  - Pre-defined prompts for quick generation
  - 8 templates: hero, testimonials, productGrid, newsletter, faq, features, imageGallery, contactForm
  - Categories: marketing, content, commerce, navigation
  - Exports: `getTemplatesByCategory()`, `getTemplateEntries()`

#### Context Builder
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/context-builder.ts`**
  - `buildConversationPrompt()` - Constructs full prompt with context
  - `getChatSystemPrompt()` - Conversation mode system prompt
  - `buildContinuationPrompt()` - For auto-retry logic
  - `buildCROEnhancedPrompt()` - Injects CRO recipe context
  - `summarizeOldMessages()` - Compresses old conversation history
  - Handles: current code, recent messages, old messages, validation errors
  - CHANGES comment format enforcement for responses
  - Conversation extension rules (code changes vs questions)

#### CRO Reasoning Parser
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/cro-reasoning-parser.ts`**
  - `parseCROReasoning()` - Extracts CRO decision block from AI response
  - `extractCodeWithoutReasoning()` - Strips reasoning for code extraction
  - `hasCROReasoning()` - Checks if response includes CRO block
  - Types: `CRODecision`, `CROReasoning`
  - Markers: `<!-- CRO_REASONING_START -->` / `<!-- CRO_REASONING_END -->`
  - Validates decision structure (element, choice, principle, explanation, source)
  - JSON parsing with error handling

### 6. Chat UI Components & Hooks

#### Chat Panel (Container)
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/ChatPanel.tsx`**
  - Main chat container using Polaris Web Components
  - Flex layout: Header | Scrollable Messages | Fixed Input
  - Integrates: `useChat` hook, `MessageList`, `ChatInput`, `VersionTimeline`
  - Version display & selection support
  - Suggestion chips integration
  - Error handling with `ErrorType`

#### useChat Hook
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/hooks/useChat.ts`**
  - Client-side chat state management
  - `chatReducer()` for state transitions
  - Handles: message streaming, error tracking, duplicate prevention
  - Integrates `useStreamingProgress` for phase tracking
  - Extracts code using `extractCodeFromContent()`
  - Sanitizes Liquid with `sanitizeLiquidCode()`
  - Features: retry logic, upgrade prompt for limits
  - Message deduplication guard

#### useStreamingProgress Hook
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/hooks/useStreamingProgress.ts`**
  - Tracks 5 generation phases: analyzing → schema → styles → markup → complete
  - Phase triggers based on Liquid pattern detection
  - Percentage calculation: max of (phase%, token%)
  - Token count tracking (estimated ~2000 tokens typical)
  - Returns: `StreamingProgress` with phases, percentage, isComplete

#### AI Response Card
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/AIResponseCard.tsx`**
  - Unified display for streaming + completed states
  - Phase indicators (Analyzing, Schema, Styling, Finalizing)
  - Change bullets from AI response
  - Collapsible code accordion
  - Version badge support
  - Smooth CSS transitions

#### Streaming Code Block
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/StreamingCodeBlock.tsx`**
  - Code display with typing animation
  - requestAnimationFrame for 60fps smooth rendering
  - Auto-scroll behavior
  - Cursor blink effect
  - Chunked updates prevent DOM thrashing
  - Dark theme styling

#### Message Components
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/MessageItem.tsx`** - Individual message display
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/MessageList.tsx`** - Scrollable message list
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/ChatInput.tsx`** - User input field
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/VersionCard.tsx`** - Version display card
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/VersionTimeline.tsx`** - Version history timeline

#### Additional Chat Components
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/PromptTemplates.tsx`** - Template selector UI
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/PromptEnhancer.tsx`** - Prompt improvement UI
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/SuggestionChips.tsx`** - Suggestion pill buttons
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/RestoreMessage.tsx`** - Restore action UI
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/TypingIndicator.tsx`** - Streaming indicator
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/ThemeContextBadge.tsx`** - Context display
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/CodeBlock.tsx`** - Code rendering
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/BuildProgressIndicator.tsx`** - Phase progress bar

### 7. Chat Utilities

#### Changes Extractor
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/utils/changes-extractor.ts`**
  - `extractChanges()` - Parses change descriptions from AI response
  - Detects: bullet points, numbered lists, action verbs
  - Max 5 changes returned
  - Keywords: added, changed, updated, removed, created, modified, etc.
  - DoS protection: 50KB max input size

#### Section Type Detector
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/utils/section-type-detector.ts`**
  - `detectSectionType()` - Analyzes Liquid code patterns
  - 9 types: hero, productGrid, testimonials, newsletter, faq, features, gallery, header, footer, generic
  - Weighted pattern matching (min score: 2)
  - ReDoS protection: length-limited character classes
  - Used for context-aware suggestions

#### Suggestion Engine
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/utils/suggestion-engine.ts`**
  - 3-tier suggestion system
  - Tier 1: Always visible (Copy, Apply)
  - Tier 2: Section-specific refinements
  - Tier 3: Conversation next-steps (after 2+ exchanges)
  - 4 suggestions per section type
  - Returns section-specific prompts for refinement

### 8. Type Definitions

#### AI Types
- **`/Users/lmtnolimit/projects/blocksmith/app/types/ai.types.ts`**
  - `StreamingOptions` - Callback options for streaming
  - `ConversationContext` - Context for conversation-aware generation
  - `CodeExtractionResult` - Extraction result type
  - `ExtendedStreamingOptions` - With finish reason callback
  - `ContinuationResult` - Auto-completion result

#### Chat Types
- **`/Users/lmtnolimit/projects/blocksmith/app/types/chat.types.ts`**
  - `UIMessage` - Full message for display
  - `ModelMessage` - Stripped for API calls
  - `ConversationState` - Client conversation state
  - `SendMessageRequest/Response` - API types
  - Stream event types: message_start, content_delta, continuation_start, message_complete, error
  - `ContinuationStartData` - Retry metadata
  - `ContinuationCompleteData` - Completion metadata
  - Message roles: 'user' | 'assistant' | 'system'

### 9. Section & Generation Services

#### Section Service
- **`/Users/lmtnolimit/projects/blocksmith/app/services/section.server.ts`**
  - `createSection()` - Persists new section with code
  - `sanitizeLiquidCode()` - Fixes AI hallucinations (removes new_comment forms, fixes product forms)
  - `extractSchemaName()` - Parses section name from schema
  - `generateDefaultName()` - Fallback name from prompt
  - Validation: Liquid structure, schema JSON
  - Status tracking: draft, published, deleted

#### Generation Log Service
- **`/Users/lmtnolimit/projects/blocksmith/app/services/generation-log.server.ts`**
  - `logGeneration()` - Immutable audit trail
  - Tracks: shop, sectionId, prompt, tokens, modelId, user tier, charging
  - Billing cycle calculation
  - Usage analytics support

### 10. Test Files

- **`/Users/lmtnolimit/projects/blocksmith/app/services/__tests__/ai.server.test.ts`** - AI service tests
- **`/Users/lmtnolimit/projects/blocksmith/app/services/__tests__/chat.server.test.ts`** - Chat service tests
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/__tests__/code-extractor.test.ts`** - Code extraction tests
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/__tests__/code-extractor-validation.test.ts`** - Validation tests
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/__tests__/context-builder.test.ts`** - Context building tests
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/__tests__/cro-reasoning-parser.test.ts`** - CRO parsing tests
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/__tests__/input-sanitizer.test.ts`** - Sanitization tests
- **`/Users/lmtnolimit/projects/blocksmith/app/utils/__tests__/liquid-wrapper.server.test.ts`** - Liquid wrapper tests
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/__tests__/useChat.test.ts`** - useChat tests
- **`/Users/lmtnolimit/projects/blocksmith/app/components/chat/__tests__/changes-extractor.test.ts`** - Changes extraction tests

---

## Key Data Flows

### 1. Initial Section Generation
```
User Prompt
  ↓
[sanitizeUserInput] → [buildConversationPrompt]
  ↓
[api.chat.stream] POST endpoint
  ↓
[aiService.generateSection] (Gemini API with streaming)
  ↓
SSE stream tokens → [useStreamingProgress] → phase tracking
  ↓
[extractCodeFromResponse] → parse code blocks
  ↓
[validateLiquidCompleteness] → check for truncation
  ↓
[chatService.addAssistantMessage] → persist + code snapshot
  ↓
[logGeneration] → audit trail + billing
```

### 2. Refinement/Conversation
```
User Message
  ↓
[sanitizeUserInput]
  ↓
[getContextMessages] → recent (full) + old (summarized)
  ↓
[buildConversationPrompt] with CHAT_SYSTEM_EXTENSION
  ↓
[api.chat.stream] with continuation logic
  ↓
If auto-continuation needed:
  [validateLiquidCompleteness] detects incomplete
  ↓
  [buildContinuationPrompt] + auto-retry (max 2x)
  ↓
Final merge via [mergeResponses]
```

### 3. CRO Recipe Generation
```
Recipe Selection
  ↓
[getRecipeBySlug]
  ↓
User provides context answers
  ↓
[buildRecipePrompt] → inject context into template
  ↓
[buildCROEnhancedPrompt] → Gemini API call
  ↓
Response contains:
  - Liquid code
  - CRO reasoning block (markers)
  ↓
[parseCROReasoning] → extract decisions
[extractCodeWithoutReasoning] → clean code
  ↓
Display in AIResponseCard with CRO explanations
```

### 4. Streaming UI Updates
```
SSE Event Stream
  ↓
'message_start' → clear streaming state
  ↓
'content_delta' → [useStreamingProgress.processToken]
  ↓
Detect phase triggers ({% schema %}, {% style %}, etc.)
  ↓
Update BuildPhase + percentage
  ↓
AIResponseCard displays phase progress
  ↓
'message_complete' → show changes, enable actions
  ↓
[extractChanges] → parse bullet points
  ↓
[suggestionEngine] → context-aware refinement prompts
```

---

## Key Constants & Limits

| Constant | Value | Purpose |
|----------|-------|---------|
| GENERATION_CONFIG.maxOutputTokens | 65536 | Gemini max output (prevents silent truncation) |
| MAX_CONTENT_LENGTH | 10000 | User message char limit |
| MAX_CODE_LENGTH | 100000 | Liquid code char limit |
| MAX_CONTINUATIONS | 2 | Auto-retry hard limit |
| MAX_CHANGES | 5 | Max changes bullets displayed |
| MAX_INPUT_LENGTH (sanitizer) | 50000 | DoS protection |
| MAX_SETTINGS_LENGTH | 70000 | App proxy settings size |
| RATE_LIMIT_PER_MINUTE | 10 | Enhance prompt API limit |
| Estimated tokens (streaming) | 2000 | Progress calculation baseline |
| Min score for section type | 2 | Pattern matching threshold |

---

## Security Considerations

1. **Prompt Injection** - Detected & filtered via `sanitizeUserInput()` patterns
2. **XSS** - Validated in generated Liquid via `validateLiquidCode()` patterns
3. **Authorization** - Shop isolation checked on all API endpoints
4. **Input Size** - Limits on content (10K), code (100K), settings (70K)
5. **Rate Limiting** - Prompt enhancement: 10/min per shop
6. **Control Characters** - Stripped from input
7. **Consecutive Newlines** - Limited to 3 max
8. **Base64 Encoding** - Checked for data: URIs with scripts

---

## File Organization Summary

```
app/
├── services/
│   ├── ai.server.ts (main AI integration)
│   ├── chat.server.ts (conversation management)
│   ├── cro-recipe.server.ts (recipe templates)
│   ├── section.server.ts (persistence)
│   ├── generation-log.server.ts (audit trail)
│   ├── adapters/ai-adapter.ts
│   └── __tests__/
├── routes/
│   ├── api.chat.stream.tsx (SSE streaming endpoint)
│   ├── api.chat.messages.tsx (history loader)
│   ├── api.chat.restore.tsx (version restore)
│   └── api.enhance-prompt.tsx (prompt improvement)
├── utils/
│   ├── code-extractor.ts (server-side parsing)
│   ├── code-extraction.client.ts (client-side parsing)
│   ├── context-builder.ts (prompt composition)
│   ├── cro-reasoning-parser.ts (CRO extraction)
│   ├── prompt-templates.ts (quick prompts)
│   ├── liquid-wrapper.server.ts (settings injection)
│   ├── input-sanitizer.ts (security)
│   └── __tests__/
├── components/chat/
│   ├── ChatPanel.tsx (container)
│   ├── AIResponseCard.tsx (unified display)
│   ├── StreamingCodeBlock.tsx (code viewer)
│   ├── MessageList.tsx & MessageItem.tsx
│   ├── ChatInput.tsx
│   ├── VersionCard.tsx & VersionTimeline.tsx
│   ├── PromptTemplates.tsx & PromptEnhancer.tsx
│   ├── RestoreMessage.tsx
│   ├── SuggestionChips.tsx
│   ├── hooks/
│   │   ├── useChat.ts (state management)
│   │   ├── useStreamingProgress.ts (phase tracking)
│   │   └── useAutoScroll.ts
│   ├── utils/
│   │   ├── changes-extractor.ts
│   │   ├── section-type-detector.ts
│   │   └── suggestion-engine.ts
│   └── __tests__/
└── types/
    ├── ai.types.ts
    └── chat.types.ts
```

---

## Integration Points

- **Gemini API** - Via `@google/generative-ai` in `ai.server.ts`
- **Prisma ORM** - All persistence (conversations, messages, sections, logs)
- **React Router** - API endpoints for streaming, messages, enhancement
- **Shopify Admin API** - Theme publishing (separate flow)
- **Feature Gates** - Refinement access checks via `feature-gate.server.ts`
- **Billing** - Usage tracking via `usage-tracking.server.ts` & generation logs

---

## Unresolved Questions

None identified - architecture is well-documented and structured.

