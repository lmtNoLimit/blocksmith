# ChatPanel Architecture Review

**Date:** 2026-01-04
**Reviewer:** Claude Code
**Scope:** ChatPanel system and all related components

---

## Executive Summary

ChatPanel is the AI conversation interface for generating/refining Shopify Liquid sections. It implements a **real-time streaming chat** with Google Gemini 2.5 Flash, **version tracking** for generated code, and **contextual suggestions**. The architecture follows React patterns (hooks/reducers) with Shopify Polaris Web Components for UI.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     app.sections.$id.tsx (Page)                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │   useEditorState hook - orchestrates all state              │   │
│  │   - section code, name, dirty state                          │   │
│  │   - version management (useVersionState)                     │   │
│  │   - theme selection for publishing                           │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                               │                                      │
│        ┌──────────────────────┼──────────────────────┐               │
│        ▼                      ▼                      ▼               │
│  ┌──────────────┐      ┌────────────────┐      ┌─────────────────┐  │
│  │ ChatPanel    │      │ CodePreviewPanel │    │ PreviewSettings  │  │
│  │              │◄────►│                  │◄──►│                  │  │
│  └──────────────┘      └──────────────────┘    └─────────────────┘  │
│        │ onCodeUpdate        │                                       │
└────────┼─────────────────────┼───────────────────────────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐     ┌──────────────────────────┐
│ /api/chat/stream│     │ SectionPreview (iframe)  │
│ (SSE endpoint)  │     │ - App Proxy rendering    │
└─────────────────┘     └──────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                        Backend Services                         │
│  ┌──────────────────┐          ┌─────────────────────────┐     │
│  │   ChatService    │◄────────►│      AIService          │     │
│  │   (chat.server)  │          │    (ai.server)          │     │
│  │   - Prisma DB    │          │   - Gemini 2.5 Flash    │     │
│  │   - Conversations│          │   - Streaming generator │     │
│  │   - Messages     │          │   - Prompt enhancement  │     │
│  └──────────────────┘          └─────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. ChatPanel.tsx (256 lines)
**Location:** `app/components/chat/ChatPanel.tsx`

**Purpose:** Main container orchestrating chat UI, message flow, version timeline, and suggestion chips.

**Props:**
```typescript
interface ChatPanelProps {
  conversationId: string;
  initialMessages?: UIMessage[];
  currentCode?: string;
  onCodeUpdate?: (code: string) => void;
  onMessagesChange?: (messages: UIMessage[]) => void;
  versions?: CodeVersion[];
  selectedVersionId?: string | null;
  activeVersionId?: string | null;
  onVersionSelect?: (versionId: string | null) => void;
  onVersionApply?: (versionId: string) => void;
}
```

**Key Behaviors:**
- Uses `useChat` hook for state management
- Auto-triggers AI generation when last message is user with no response
- Handles version timeline for code history
- Manages suggestion chips for context-aware follow-ups
- Syncs messages back to parent via `onMessagesChange`

**Layout Structure:**
```
┌─────────────────────────────────┐
│ Header (VersionTimeline + Clear)│ ← Fixed
├─────────────────────────────────┤
│ Error Banner (if error)         │
├─────────────────────────────────┤
│                                 │
│ MessageList (scrollable)        │ ← Flex-grow
│                                 │
├─────────────────────────────────┤
│ ChatInput                       │ ← Fixed
└─────────────────────────────────┘
```

---

### 2. useChat Hook (346 lines)
**Location:** `app/components/chat/hooks/useChat.ts`

**Purpose:** Core state management using reducer pattern for predictable state updates.

**State Shape:**
```typescript
interface ChatState {
  messages: UIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  pendingMessageId: string | null;
  error: string | null;
}
```

**Actions:**
| Action | Effect |
|--------|--------|
| SET_MESSAGES | Replace all messages (initial load) |
| ADD_USER_MESSAGE | Append user message, clear error |
| START_STREAMING | Set streaming=true, reset content |
| APPEND_CONTENT | Concatenate streaming token |
| COMPLETE_STREAMING | Add assistant message, reset streaming (with duplicate guard) |
| SET_ERROR | Set error, stop streaming |
| CLEAR_ERROR | Clear error state |

**Key Methods:**
- `sendMessage(content)` - Add user message, start streaming
- `triggerGeneration(content)` - Continue existing conversation (for auto-gen)
- `stopStreaming()` - Abort current stream, add cancelled message
- `retryFailedMessage()` - Retry last failed message

**Streaming Flow:**
```
1. POST /api/chat/stream (FormData)
2. Read SSE events via ReadableStream
3. Parse event types:
   - message_start → Start indicator
   - content_delta → Append to streamingContent
   - message_complete → Extract codeSnapshot, add message
   - error → Set error state
4. Update progress via useStreamingProgress hook
```

---

### 3. ChatInput.tsx (261 lines)
**Location:** `app/components/chat/ChatInput.tsx`

**Purpose:** User input with enhancement and targeting features.

**Features:**
- Enter to send, Shift+Enter for newline
- Prompt enhancer modal (AI-powered)
- Prompt templates (quick actions)
- Element targeting badge (Phase 03)
- Theme context badge
- Prefilled value support (from suggestion chips)

**Input Processing:**
```typescript
// If element is selected, prepend context
if (selectedElement) {
  const elementContext = `[Targeting: <${selectedElement.tagName}> at "${selectedElement.path.join(' > ')}"]\n\n`;
  messageToSend = elementContext + trimmed;
}
```

---

### 4. MessageList.tsx (208 lines)
**Location:** `app/components/chat/MessageList.tsx`

**Purpose:** Scrollable container rendering messages with auto-scroll.

**Key Features:**
- Empty state with suggestion chips
- Version info per message
- Build progress indicator during streaming
- Streaming code block preview
- Typing indicator

---

### 5. MessageItem.tsx (325 lines)
**Location:** `app/components/chat/MessageItem.tsx`

**Purpose:** Individual message renderer with code extraction and suggestions.

**Content Parsing:**
- Parses markdown code blocks using linear-time scanning (ReDoS-safe)
- Separates text and code parts
- AI code blocks hidden (shown in preview panel)
- User code blocks rendered inline

**Memoization:** Custom comparison function avoids unnecessary re-renders by checking:
- message.id, message.content
- isStreaming, versionNumber, isSelected, isActive
- messageCount, isLatestMessage (for suggestions)

---

### 6. API Route: api.chat.stream.tsx (187 lines)
**Location:** `app/routes/api.chat.stream.tsx`

**Purpose:** SSE streaming endpoint for chat messages.

**Security:**
- Shop authentication via Shopify session
- Conversation authorization check
- Input validation (10K char limit, 100K code limit)
- Input sanitization (prompt injection prevention)
- Output sanitization (XSS prevention in Liquid code)

**Flow:**
```
1. Validate input (conversationId, content)
2. Verify conversation belongs to shop
3. Sanitize user input
4. Add user message to DB (unless continuing)
5. Build conversation context (recent + summarized old)
6. Create ReadableStream for SSE
7. Stream Gemini response token by token
8. Extract code from response
9. Sanitize extracted code
10. Save assistant message
11. Send message_complete event
```

**SSE Events:**
```typescript
type StreamEvent = {
  type: 'message_start' | 'content_delta' | 'message_complete' | 'error';
  data: {
    messageId?: string;
    content?: string;
    codeSnapshot?: string;
    error?: string;
  };
}
```

---

### 7. ChatService (205 lines)
**Location:** `app/services/chat.server.ts`

**Purpose:** Conversation and message persistence via Prisma.

**Database Models:**
```prisma
model Conversation {
  id           String    @id @default(cuid())
  sectionId    String    @unique
  shop         String
  title        String?
  messageCount Int       @default(0)
  totalTokens  Int       @default(0)
  isArchived   Boolean   @default(false)
  messages     Message[]
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // 'user' | 'assistant' | 'system'
  content        String
  codeSnapshot   String?
  tokenCount     Int?
  isError        Boolean  @default(false)
  errorMessage   String?
}
```

---

### 8. AIService (426 lines)
**Location:** `app/services/ai.server.ts`

**Purpose:** Google Gemini integration with streaming support.

**Key Methods:**
- `generateSection(prompt)` - Non-streaming generation
- `generateSectionStream(prompt)` - Streaming AsyncGenerator
- `generateWithContext(userMessage, context)` - Context-aware streaming
- `enhancePrompt(prompt, context)` - Prompt enhancement for UX

**System Prompt:** 162-line comprehensive prompt covering:
- Section structure (schema, style, markup)
- Input types reference (20+ types)
- Validation rules (10 critical rules)
- Block/preset configuration
- CSS/markup rules
- Common error prevention

---

### 9. useEditorState Hook (174 lines)
**Location:** `app/components/editor/hooks/useEditorState.ts`

**Purpose:** Orchestrates all editor state including chat integration.

**Responsibilities:**
- Section code/name state
- Theme selection for publishing
- Dirty state tracking
- Version management (via useVersionState)
- Message sync with ChatPanel
- Auto-save on version auto-apply

**Version Flow:**
```
ChatPanel.onMessagesChange
    ↓
useEditorState.handleMessagesChange
    ↓
liveMessages state update
    ↓
useVersionState derives versions from messages
    ↓
version selection → previewCode update
```

---

## Data Flow Diagram

```
User Input → ChatInput
                ↓
         ChatPanel.handleSend
                ↓
         useChat.sendMessage
                ↓
    ┌──── Optimistic UI Update ────┐
    │  ADD_USER_MESSAGE            │
    │  START_STREAMING             │
    └──────────────────────────────┘
                ↓
         POST /api/chat/stream
                ↓
    ┌──── Server Processing ───────┐
    │  1. Auth + validation        │
    │  2. chatService.addUserMsg   │
    │  3. Build context            │
    │  4. aiService.generateWith   │
    │     Context (streaming)      │
    └──────────────────────────────┘
                ↓
         SSE Events to Client
                ↓
    ┌──── Client Processing ───────┐
    │  content_delta → APPEND      │
    │  message_complete →          │
    │    - COMPLETE_STREAMING      │
    │    - onCodeUpdate callback   │
    └──────────────────────────────┘
                ↓
    ┌──── Parent State Update ─────┐
    │  useEditorState.handleCode   │
    │  Update → sectionCode        │
    │  useVersionState updates     │
    │  Preview panel refreshes     │
    └──────────────────────────────┘
```

---

## Type System

### Core Types (chat.types.ts)

```typescript
// Message for display
interface UIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  codeSnapshot?: string;
  tokenCount?: number;
  isError?: boolean;
  errorMessage?: string;
  createdAt: Date;
}

// Message for AI API calls
interface ModelMessage {
  role: MessageRole;
  content: string;
}

// Code version from messages
interface CodeVersion {
  id: string;           // message ID
  versionNumber: number;
  code: string;
  createdAt: Date;
  messageContent: string;
}
```

---

## Supporting Components

| Component | Purpose |
|-----------|---------|
| VersionTimeline | Horizontal version dots with tooltips |
| VersionCard | Version info with Preview/Apply buttons |
| BuildProgressIndicator | Phase tracking during generation |
| StreamingCodeBlock | Real-time code preview while streaming |
| SuggestionChips | Context-aware follow-up prompts |
| PromptEnhancer | AI-powered prompt improvement modal |
| PromptTemplates | Quick-start template buttons |
| ThemeContextBadge | Shows detected theme context |
| CodeBlock | Syntax-highlighted code display |
| TypingIndicator | Animated loading dots |

---

## Security Measures

1. **Authentication:** All requests verify Shopify session
2. **Authorization:** Conversation shop must match session shop
3. **Input Validation:** Length limits, type checks
4. **Sanitization:** `sanitizeUserInput` for prompt injection, `sanitizeLiquidCode` for XSS
5. **Error Handling:** Internal errors logged server-side, generic messages to client
6. **Content Parsing:** Linear-time algorithms to prevent ReDoS

---

## Performance Optimizations

1. **Memoization:** MessageItem uses custom comparison to skip re-renders
2. **Auto-scroll:** useAutoScroll hook with debounced scroll handling
3. **Streaming:** Real SSE instead of polling
4. **Context Management:** Old messages summarized to reduce token usage
5. **Duplicate Prevention:** Generation lock prevents concurrent calls
6. **Version Caching:** Versions derived from messages with useMemo

---

## Integration Points

| From | To | Method |
|------|-----|--------|
| ChatPanel | Parent Page | onCodeUpdate, onMessagesChange callbacks |
| Parent Page | ChatPanel | versions, selectedVersionId props |
| useChat | API | POST /api/chat/stream (FormData → SSE) |
| API | ChatService | DB operations |
| API | AIService | Streaming generation |
| MessageItem | SuggestionChips | getSuggestions utility |

---

## File Inventory

### Core Components (9)
- ChatPanel.tsx, ChatInput.tsx, MessageList.tsx, MessageItem.tsx
- ChatStyles.tsx, CodeBlock.tsx, StreamingCodeBlock.tsx
- TypingIndicator.tsx, index.ts

### Version Components (3)
- VersionTimeline.tsx, VersionCard.tsx, VersionBadge.tsx

### Enhancement Components (4)
- SuggestionChips.tsx, PromptEnhancer.tsx
- PromptTemplates.tsx, ThemeContextBadge.tsx

### Progress Component (1)
- BuildProgressIndicator.tsx

### Hooks (3)
- useChat.ts, useAutoScroll.ts, useStreamingProgress.ts

### Utilities (2)
- suggestion-engine.ts, section-type-detector.ts

### Backend (2)
- chat.server.ts, ai.server.ts

### API Routes (2)
- api.chat.stream.tsx, api.chat.messages.tsx

### Types (1)
- chat.types.ts

---

## Quality Assessment

**Strengths:**
- Clean separation of concerns (UI/state/API/service)
- Comprehensive type safety
- Security-conscious design
- Real-time streaming UX
- Version tracking for code history

**Areas for Improvement:**
- Some components exceed 200-line guideline (MessageItem: 325, useChat: 346, AIService: 426)
- Hardcoded model name "gemini-2.5-flash" could be configurable
- Could benefit from more unit tests on hooks

---

## Unresolved Questions

1. How is conversation cleanup/archival handled for old sections?
2. Is there rate limiting on the streaming endpoint?
3. How are long-running conversations handled (token limits)?

---

*Report generated by Claude Code - 2026-01-04*
