# Duplicate AI Message Generation - Root Cause Analysis

**Investigation ID:** debugger-260104-2016
**Date:** 2026-01-04 20:16
**Issue:** First prompt to a section creates 2 AI versions instead of 1

---

## Executive Summary

**Root Cause:** Race condition between `sendMessage` and auto-trigger logic in ChatPanel
- `sendMessage` calls `streamResponse(content, false)` which adds user message to DB
- Auto-trigger `useEffect` detects user message without assistant response
- Auto-trigger calls `triggerGeneration` → `streamResponse(content, true)`
- Result: **Two concurrent API calls streaming responses**

**Impact:** Duplicate AI responses, wasted API tokens, confusing UX

**Fix Priority:** HIGH - Core functionality broken, affects all new conversations

---

## Technical Analysis - Flow Trace

### 1. User Types First Message

**File:** `ChatPanel.tsx` (line 164-167)
```tsx
const handleSend = useCallback((message: string) => {
  sendMessage(message);
  setPrefilledInput("");
}, [sendMessage]);
```

### 2. sendMessage Executes

**File:** `useChat.ts` (line 261-279)

```tsx
const sendMessage = useCallback(async (content: string) => {
  // Add user message to state
  dispatch({ type: 'ADD_USER_MESSAGE', message: userMessage });
  dispatch({ type: 'START_STREAMING' });

  // Call API - skipAddMessage=false means API adds user msg to DB
  await streamResponse(content, false);
}, [conversationId, state.isStreaming, streamResponse, resetProgress]);
```

**Key actions:**
1. Optimistically adds user message to UI state
2. Starts streaming (sets `isStreaming=true`)
3. Calls `streamResponse(content, false)`

### 3. streamResponse Call #1 (from sendMessage)

**File:** `useChat.ts` (line 144-259)

```tsx
const streamResponse = useCallback(async (content: string, skipAddMessage: boolean) => {
  // Generation lock check
  if (isGeneratingRef.current) {
    console.warn('[useChat] Ignoring duplicate generation call');
    return;
  }
  isGeneratingRef.current = true;  // <-- Sets lock

  // ... FormData setup with continueGeneration='true' if skipAddMessage

  // Fetch stream
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    body: formData,
  });

  // ... process stream ...

  finally {
    isGeneratingRef.current = false;  // <-- Releases lock
  }
}, [conversationId, currentCode, onCodeUpdate, processToken]);
```

**Parameters for call #1:**
- `skipAddMessage = false`
- `continueGeneration = 'false'` sent to API
- API will add user message to DB (line 61-63 in api.chat.stream.tsx)

### 4. API Endpoint Processing

**File:** `api.chat.stream.tsx` (line 60-63)

```tsx
// Add user message to conversation (skip if continuing generation for existing message)
if (!continueGeneration) {
  await chatService.addUserMessage(conversationId, sanitizedContent);
}
```

**Result:** User message added to database

### 5. **THE RACE CONDITION** - Auto-Trigger Fires

**File:** `ChatPanel.tsx` (line 100-114)

```tsx
// Auto-trigger AI generation if last message is user with no assistant response
useEffect(() => {
  // Early exit for streaming or already triggered
  if (isStreaming || hasTriggeredAutoGenRef.current) return;
  if (messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  const hasAssistantResponse = messages.some((m) => m.role === "assistant");

  // Trigger generation if last message is from user and no assistant response yet
  if (lastMessage.role === "user" && !hasAssistantResponse) {
    hasTriggeredAutoGenRef.current = true;
    triggerGeneration(lastMessage.content);  // <-- DUPLICATE CALL
  }
}, [messages, isStreaming, triggerGeneration]);
```

**Why it fires:**
- `messages` array has user message (added by `ADD_USER_MESSAGE` action)
- `isStreaming` is `true` but check happens **before streaming state propagates**
- `hasTriggeredAutoGenRef.current` is still `false`
- `hasAssistantResponse` is `false` (no assistant message yet)
- **Condition met → fires `triggerGeneration`**

### 6. triggerGeneration Executes

**File:** `useChat.ts` (line 285-293)

```tsx
const triggerGeneration = useCallback(async (content: string) => {
  if (!content.trim() || state.isStreaming) return;

  resetProgress();
  dispatch({ type: 'START_STREAMING' });
  await streamResponse(content, true);  // <-- skipAddMessage=true
}, [state.isStreaming, streamResponse, resetProgress]);
```

### 7. streamResponse Call #2 (from triggerGeneration)

**Parameters for call #2:**
- `skipAddMessage = true`
- `continueGeneration = 'true'` sent to API
- API **skips** adding user message (already exists)

**Generation Lock Issue:**
- Call #1 is **async and ongoing** (network request in flight)
- `isGeneratingRef.current` was set to `true` by call #1
- **BUT:** Call #1's lock check happens at line 146-149
- Call #2 reaches the lock check **while call #1 is awaiting network response**
- Timeline:
  1. Call #1: Sets `isGeneratingRef.current = true` → starts `fetch()` → awaits response
  2. Call #2: Checks `isGeneratingRef.current` → sees `true` → **should block**
  3. **BUT** if Call #2 runs before Call #1 sets the lock, both proceed

**Actual Race:**
```
T0: sendMessage → streamResponse(false) starts
T1: streamResponse #1 sets isGeneratingRef = true
T2: streamResponse #1 starts fetch (async)
T3: React re-render triggers useEffect
T4: useEffect sees isStreaming=true → SHOULD early return
T5: BUT if isStreaming state hasn't propagated, useEffect continues
T6: triggerGeneration → streamResponse(true) starts
T7: streamResponse #2 checks isGeneratingRef → sees true → returns early
```

**Wait, the lock SHOULD work... unless:**

Looking closer at line 103 in ChatPanel:
```tsx
if (isStreaming || hasTriggeredAutoGenRef.current) return;
```

The issue is **React state batching**:
- `dispatch({ type: 'START_STREAMING' })` is called in `sendMessage`
- But `isStreaming` state update is **batched** by React
- `useEffect` runs **before** `isStreaming` reflects the new value
- So `isStreaming` is still `false` when auto-trigger checks it

### 8. Result: Two Concurrent Streams

Both `streamResponse` calls proceed:
1. Call #1: Adds user message, streams response, creates assistant message
2. Call #2: Skips user message (already exists), streams response, creates **second** assistant message

---

## Evidence from Code

### Generation Lock (useChat.ts:146-150)
```tsx
if (isGeneratingRef.current) {
  console.warn('[useChat] Ignoring duplicate generation call');
  return;
}
isGeneratingRef.current = true;
```

**Why it fails:**
- Both calls reach this check **before either sets the lock**
- JavaScript is single-threaded but async operations interleave
- Without `await` before the lock check, race condition occurs

### Auto-Trigger Guard (ChatPanel.tsx:103)
```tsx
if (isStreaming || hasTriggeredAutoGenRef.current) return;
```

**Why it fails:**
- `isStreaming` is derived from React state (line 48)
- React batches state updates for performance
- `dispatch({ type: 'START_STREAMING' })` doesn't immediately update `isStreaming`
- By the time `useEffect` runs, `isStreaming` is still `false`

### Duplicate Prevention (useChat.ts:59-79)
```tsx
case 'COMPLETE_STREAMING': {
  // Prevent duplicate messages - check if an assistant message already exists
  // after the last user message (guards against race conditions)
  let lastUserIndex = -1;
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }
  const hasAssistantAfterUser = state.messages.slice(lastUserIndex + 1).some((m: UIMessage) => m.role === 'assistant');
  const messageExists = state.messages.some((m: UIMessage) => m.id === action.message.id);

  if (messageExists || hasAssistantAfterUser) {
    // Already have an assistant response, just clear streaming state
    return { ...state, isStreaming: false, streamingContent: '' };
  }
  // ... add message
}
```

**This guard prevents duplicate UI messages but:**
- It runs **after** streaming completes
- Both API calls already created separate assistant messages in **database**
- UI only shows one, but DB has two versions
- Code versions table has two entries

---

## Root Cause Summary

**Primary Issue:** React state batching delays `isStreaming` update
- `sendMessage` calls `dispatch({ type: 'START_STREAMING' })`
- Auto-trigger `useEffect` runs before `isStreaming` reflects new value
- Auto-trigger sees `isStreaming=false` → fires `triggerGeneration`

**Secondary Issue:** Generation lock insufficient
- `isGeneratingRef` is checked but not set atomically
- Both calls can pass the check before either sets the lock
- Async `fetch()` means lock is held during network I/O only

**Result:**
1. Two concurrent `streamResponse` calls
2. Two API requests to `/api/chat/stream`
3. Two assistant messages saved to database
4. Two code versions created
5. UI duplicate guard prevents showing both, but DB has duplicates

---

## Recommended Fix

### Option 1: Synchronous Lock Before Dispatch (Preferred)

**File:** `useChat.ts` - Modify `sendMessage` and `triggerGeneration`

```tsx
const sendMessage = useCallback(async (content: string) => {
  if (!content.trim() || state.isStreaming || isGeneratingRef.current) return;

  // Set lock IMMEDIATELY before any async operations
  isGeneratingRef.current = true;

  try {
    resetProgress();

    const userMessage: UIMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    };
    dispatch({ type: 'ADD_USER_MESSAGE', message: userMessage });
    dispatch({ type: 'START_STREAMING' });

    await streamResponse(content, false);
  } finally {
    // Keep lock until streaming completes
    // streamResponse already manages lock, but we guard entry
  }
}, [conversationId, state.isStreaming, streamResponse, resetProgress]);

const triggerGeneration = useCallback(async (content: string) => {
  if (!content.trim() || state.isStreaming || isGeneratingRef.current) return;

  // Set lock IMMEDIATELY
  isGeneratingRef.current = true;

  try {
    resetProgress();
    dispatch({ type: 'START_STREAMING' });
    await streamResponse(content, true);
  } finally {
    // Lock managed by streamResponse
  }
}, [state.isStreaming, streamResponse, resetProgress]);
```

**Issue with this approach:** `streamResponse` already manages the lock, so we'd have redundant lock management. Better approach below.

### Option 2: Remove Auto-Trigger for User-Initiated Messages (RECOMMENDED)

**File:** `ChatPanel.tsx` - Fix the auto-trigger logic

The auto-trigger should **only** fire when:
1. Messages are loaded from initial state (route navigation)
2. NOT when user actively sends a message

```tsx
// Track if this is a user-initiated send vs. loaded state
const isUserInitiatedSendRef = useRef(false);

const handleSend = useCallback((message: string) => {
  isUserInitiatedSendRef.current = true;  // Mark as user-initiated
  sendMessage(message);
  setPrefilledInput("");
}, [sendMessage]);

// Auto-trigger AI generation if last message is user with no assistant response
useEffect(() => {
  // Skip auto-trigger if user just sent a message (sendMessage handles generation)
  if (isUserInitiatedSendRef.current) {
    isUserInitiatedSendRef.current = false;  // Reset flag
    return;
  }

  // Early exit for streaming or already triggered
  if (isStreaming || hasTriggeredAutoGenRef.current) return;
  if (messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  const hasAssistantResponse = messages.some((m) => m.role === "assistant");

  // Trigger generation if last message is from user and no assistant response yet
  if (lastMessage.role === "user" && !hasAssistantResponse) {
    hasTriggeredAutoGenRef.current = true;
    triggerGeneration(lastMessage.content);
  }
}, [messages, isStreaming, triggerGeneration]);
```

**Why this works:**
- Auto-trigger is meant for **route navigation** (e.g., /new → /sections/:id)
- When user types and clicks send, `sendMessage` **already** triggers generation
- No need for auto-trigger to fire after `sendMessage`
- Ref flag ensures auto-trigger is suppressed for user-initiated sends

### Option 3: Make sendMessage NOT Trigger Generation

**File:** `useChat.ts` - Separate concerns

```tsx
const sendMessage = useCallback(async (content: string) => {
  if (!content.trim() || state.isStreaming) return;

  // ONLY add user message, don't trigger generation
  const userMessage: UIMessage = {
    id: `temp-${Date.now()}`,
    conversationId,
    role: 'user',
    content: content.trim(),
    createdAt: new Date(),
  };
  dispatch({ type: 'ADD_USER_MESSAGE', message: userMessage });

  // Let auto-trigger handle generation
}, [conversationId, state.isStreaming]);
```

**Then rely on auto-trigger for ALL generation.**

**Issue:** This changes the mental model - `sendMessage` becomes "add message only", requires auto-trigger for ALL cases. Less explicit.

---

## Recommended Solution: Option 2

**Why:**
1. Minimal code change
2. Clear intent: Auto-trigger is for route navigation only
3. Preserves existing `sendMessage` → `streamResponse` flow
4. Uses ref flag (immune to React batching) instead of state

**Implementation:**
1. Add `isUserInitiatedSendRef` to `ChatPanel.tsx`
2. Set flag in `handleSend` before calling `sendMessage`
3. Check and reset flag at start of auto-trigger `useEffect`
4. Reset auto-trigger flag when conversation changes (already done at line 72-76)

---

## Testing Plan

1. **First message to new section:**
   - Send message
   - Verify only 1 assistant message in DB
   - Verify only 1 code version created

2. **Route navigation with existing message:**
   - Create section with message but no response
   - Navigate away and back
   - Verify auto-trigger fires once
   - Verify only 1 response created

3. **Concurrent sends (rapid clicking):**
   - Click send multiple times quickly
   - Verify generation lock prevents duplicates
   - Verify only 1 response per user message

4. **Error recovery:**
   - Force API error
   - Retry failed message
   - Verify no duplicates on retry

---

## Unresolved Questions

1. Should we add server-side duplicate prevention?
   - Check if assistant message exists for conversation before streaming
   - Pros: Defense in depth
   - Cons: Adds DB query overhead

2. Should we log when generation lock prevents duplicates?
   - Currently warns to console (line 147)
   - Should we track metrics for how often this happens?

3. Should auto-trigger be removed entirely?
   - Rely on explicit "Generate" button for edge cases
   - Pros: Simpler, more predictable
   - Cons: Extra click for user

4. Database cleanup needed?
   - How many duplicate messages exist in production?
   - Should we add migration to deduplicate?
