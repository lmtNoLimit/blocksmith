# Current Section Creation Workflow Research

## Overview
Two-stage workflow: create section with prompt → navigate to editor for AI chat & refinement. Clean separation between prompt submission and code generation.

## 1. Section Creation Screen (`/app/routes/app.sections.new.tsx`)

**Entry Point**: `/app/sections/new` route

**UI Components**:
- Text area: max 2000 chars, disabled during submit
- "Generate Section" button (primary action)
- Template chips for quick-start (6 featured templates)
- Aside panel with tips

**Keyboard Support**: Cmd/Ctrl + Enter submits

**Form Submission**:
```typescript
// POST handler validates & creates section
1. Sanitize prompt input
2. Create empty section (code: "")
3. Create conversation + add initial user message
4. Return sectionId on success
```

**Name Generation Logic**:
- Priority: user-provided name → schema name (extracted from code) → prompt truncation
- Used later when AI generates code (in `/app/services/section.server.ts`)

## 2. Navigation Flow After Submit

**Auto-Redirect**:
```typescript
useEffect(() => {
  if (actionData?.sectionId) {
    navigate(`/app/sections/${actionData.sectionId}`);
  }
}, [actionData, navigate]);
```

**Destination**: `/app/sections/$id` editor page (unified editor)

**Loader** fetches:
- Section record
- Shopify themes (for publish targets)
- Conversation + messages
- Shop domain

## 3. Prompt Input Mechanism

**Form Field**: `<s-text-area id="prompt-textarea">`
- Placeholder guides users
- Character counter (current/max)
- Disabled during submission

**Input Sanitization** via `sanitizeUserInput()`:
- Trims whitespace
- Escapes special chars
- Validates length (2000 char max)

**Validation**:
- Backend checks: non-empty & length ≤ 2000
- Frontend: submit button disabled if empty
- Error banner displays validation failures

## 4. Save Draft Button Implementation

**Location**: Editor page (`app.sections.$id.tsx`)

**Implementation**:
```typescript
// Secondary action button
<s-button onClick={handleSaveDraft} loading={isSavingDraft}>
  Save Draft
</s-button>

// Handler
const handleSaveDraft = useCallback(() => {
  const formData = new FormData();
  formData.append('action', 'saveDraft');
  formData.append('code', sectionCode);
  formData.append('name', sectionName);
  submit(formData, { method: 'post' });
}, [sectionCode, sectionName, submit]);
```

**Action Handler** (`action()` in route):
```typescript
if (actionType === 'saveDraft') {
  // Update section: status → DRAFT, save code
  // Returns success/error toast message
}
```

**Keyboard Shortcut**: Ctrl+S (enabled)

**Dirty State Indicator**: Name displays with "*" when changes exist

## 5. AI Generation Integration

**Trigger**: Submit prompt → creates section → conversation starts

**Generation Flow**:
1. **Conversation Created**: `chatService.getOrCreateConversation()`
2. **Initial Message**: User prompt stored as first message
3. **Editor Loads**: No AI output yet (code empty)
4. **Chat Requests**: User interacts with chat panel
   - Request sent to `/api/chat` endpoint (server-sent events)
   - AI generates/refines code via `aiService.generateSectionStream()`
   - Code pushed to editor via `handleCodeUpdate()`
   - New code version saved (versioning enabled)

**Code Update Sources**:
- Tracked via `lastCodeSource` (user vs chat)
- Versions stored in database
- Chat panel shows version history

**Preview Integration**:
- Real-time preview updates on code changes
- Settings extracted from schema (for section controls)
- Live rendering of Liquid code

## 6. Draft Behavior

**Initial State**: Section created with empty code (DRAFT status)

**Draft Lifecycle**:
1. User creates → status = DRAFT, code = ""
2. Chat generates code → code updated, status = DRAFT
3. User saves draft → persists current code, status = DRAFT
4. User publishes → saves to theme, status = ACTIVE

**Draft Persistence**: Only "Save Draft" button explicitly saves. Chat auto-apply doesn't auto-save.

## Key Files

- **Creation**: `app/routes/app.sections.new.tsx` (lines 51-92 action handler)
- **Editor**: `app/routes/app.sections.$id.tsx` (lines 75-97 saveDraft action)
- **Section Service**: `app/services/section.server.ts` (create/update methods)
- **Chat Service**: `app/services/chat.server.ts` (conversation/message mgmt)
- **AI Service**: `app/services/ai.server.ts` (generateSectionStream)
- **Editor State**: `app/components/editor/hooks/useEditorState.ts` (version management)

## Current UX Summary

**Strengths**:
- Clear two-stage flow: prompt → editor
- Empty draft ready for AI interaction immediately
- Explicit save actions (no magic auto-save)
- Version history tracking enabled
- Keyboard shortcuts support

**Potential Friction Points** (for refinement phase):
- Empty code on initial load (before chat generates anything)
- Draft save requires manual action (implicit draft state might confuse users)
- No indication of generation status in creation flow

## Unresolved Questions
- Auto-save behavior for chat-generated code?
- User expectations for draft vs published distinction?
- Should template selection auto-generate initial code?
