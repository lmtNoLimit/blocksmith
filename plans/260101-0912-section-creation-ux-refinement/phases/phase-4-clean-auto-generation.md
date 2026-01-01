# Phase 4: Clean Auto-Generation Flow

## Objective
Ensure auto-generation triggers exactly once on new section creation.

## Current Behavior

**File**: `app/components/chat/ChatPanel.tsx` (lines 85-98)

Auto-generation already implemented:
```typescript
// Auto-trigger AI generation if last message is user with no assistant response
useEffect(() => {
  if (isStreaming || hasTriggeredAutoGenRef.current) return;
  if (messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  const hasAssistantResponse = messages.some((m) => m.role === "assistant");

  if (lastMessage.role === "user" && !hasAssistantResponse) {
    hasTriggeredAutoGenRef.current = true;
    triggerGeneration(lastMessage.content);
  }
}, [messages, isStreaming, triggerGeneration]);
```

This works correctly for new sections where:
1. User message exists (prompt from creation)
2. No assistant response yet

## Improvements Needed

### 1. Add loading indicator during generation

When navigating from `/sections/new` to `/sections/$id`, user sees empty state briefly.

**File**: `app/components/editor/ChatPanelWrapper.tsx`

Add a prop to show initial loading state:

```typescript
interface ChatPanelWrapperProps {
  // ... existing props
  isInitialGeneration?: boolean; // NEW
}

export function ChatPanelWrapper({
  // ... existing props
  isInitialGeneration = false,
}: ChatPanelWrapperProps) {
  return (
    <div className="chat-panel-wrapper">
      {isInitialGeneration && (
        <s-box padding="base" background="subdued">
          <s-stack gap="small" alignItems="center">
            <s-spinner size="small" />
            <s-text color="subdued">Generating your section...</s-text>
          </s-stack>
        </s-box>
      )}
      <ChatPanel /* ... */ />
    </div>
  );
}
```

### 2. Detect initial generation state

**File**: `app/routes/app.sections.$id.tsx`

```typescript
// In component body
const isInitialGeneration = useMemo(() => {
  // Initial generation if: has user message, no assistant message, no code yet
  if (!conversation?.messages) return false;
  const hasUserMessage = conversation.messages.some(m => m.role === 'user');
  const hasAssistantMessage = conversation.messages.some(m => m.role === 'assistant');
  const hasCode = section.code.length > 0;
  return hasUserMessage && !hasAssistantMessage && !hasCode;
}, [conversation?.messages, section.code]);

// Pass to ChatPanelWrapper
<ChatPanelWrapper
  conversationId={conversationId}
  initialMessages={initialMessages}
  currentCode={sectionCode}
  onCodeUpdate={handleCodeUpdate}
  onMessagesChange={handleMessagesChange}
  versions={versions}
  selectedVersionId={selectedVersionId}
  activeVersionId={activeVersionId}
  onVersionSelect={selectVersion}
  onVersionApply={handleVersionApply}
  isInitialGeneration={isInitialGeneration} // NEW
/>
```

### 3. Optional: Add autoGenerate URL param

For explicit control (not strictly necessary given current auto-trigger):

**File**: `app/routes/app.sections.new.tsx` (line 107)

```typescript
// Current
navigate(`/app/sections/${actionData.sectionId}`);

// Optional explicit param
navigate(`/app/sections/${actionData.sectionId}?autoGenerate=true`);
```

This is optional since ChatPanel already auto-triggers based on message state.

### 4. Ensure ref resets on conversation change

Already implemented:

**File**: `app/components/chat/ChatPanel.tsx` (lines 68-70)

```typescript
useEffect(() => {
  hasTriggeredAutoGenRef.current = false;
}, [conversationId]);
```

## No Changes Needed

After review, the current auto-generation logic is robust:
- Checks for user message with no response
- Uses ref to prevent duplicate triggers
- Resets on conversation change

Only enhancement needed: loading indicator during initial generation.

## Testing

1. Create new section with prompt
2. Verify loading indicator shows
3. Verify AI generates automatically
4. Verify indicator hides when generation starts streaming
5. Edit existing section (reload)
6. Verify no auto-generation (has assistant response already)

## Edge Cases

- **User navigates away during generation**: No special handling needed
- **Multiple rapid creations**: Each section gets own conversation, isolated
- **Network failure**: Error banner shows with retry option

## Rollback

Remove isInitialGeneration prop and loading indicator. Auto-trigger still works.
