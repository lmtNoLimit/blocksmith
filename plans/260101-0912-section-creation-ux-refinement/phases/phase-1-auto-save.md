---
title: "Phase 1: Auto-Save on Version Apply"
description: "Auto-persist draft to database when AI generates and applies a version"
status: completed
priority: P1
effort: 45m
branch: main
tags: [auto-save, version-apply, persistence]
created: 2026-01-01
completed: 2026-01-01
---

# Phase 1: Auto-Save on Version Apply

## Objective
Auto-persist draft to database when AI generates and applies a version.

## Current Behavior
- AI generates code → creates version in conversation messages
- `useVersionState` auto-applies to preview (lines 96-113)
- Draft only saved when user clicks "Save Draft" button

## New Behavior
- AI generates code → version auto-applied → auto-save to Section.code
- No user action required for persistence

## Implementation

### 1. Add onAutoSave callback to useVersionState

**File**: `app/components/editor/hooks/useVersionState.ts`

```typescript
// Add to UseVersionStateOptions interface (line 4)
interface UseVersionStateOptions {
  messages: UIMessage[];
  initialCode: string;
  onCodeChange: (code: string) => void;
  isDirty?: boolean;
  onAutoApply?: () => void;
  onAutoSave?: (code: string) => void; // NEW
}
```

### 2. Call onAutoSave when auto-applying

**File**: `app/components/editor/hooks/useVersionState.ts`

```typescript
// Modify auto-apply effect (lines 96-113)
useEffect(() => {
  if (versions.length === 0 || isDirty || selectedVersionId) return;

  const latestVer = versions[versions.length - 1];
  if (!latestVer) return;

  const isFirstVersion = versions.length === 1 && !activeVersionId;
  const isNewVersion = versions.length > prevVersionCountRef.current;

  if (isFirstVersion || isNewVersion) {
    setActiveVersionId(latestVer.id);
    setSelectedVersionId(null);
    onCodeChange(latestVer.code);
    onAutoApply?.();
    onAutoSave?.(latestVer.code); // NEW - trigger auto-save
  }
}, [versions, isDirty, activeVersionId, selectedVersionId, onCodeChange, onAutoApply, onAutoSave]);
```

### 3. Add auto-save handler in useEditorState

**File**: `app/components/editor/hooks/useEditorState.ts`

```typescript
// Add import at top
import { useFetcher } from 'react-router';

// Add inside useEditorState hook, after line 30
const fetcher = useFetcher();

// Add auto-save handler after handleCodeUpdate (line 74)
const handleAutoSave = useCallback((code: string) => {
  // Silent save - no toast, just persist
  const formData = new FormData();
  formData.append('action', 'saveDraft');
  formData.append('code', code);
  formData.append('name', sectionName);
  fetcher.submit(formData, { method: 'post' });
}, [sectionName, fetcher]);

// Pass to useVersionState (line 101)
const {
  versions,
  // ...
} = useVersionState({
  messages: liveMessages,
  initialCode: sectionCode,
  onCodeChange: handleCodeUpdate,
  isDirty,
  onAutoApply,
  onAutoSave: handleAutoSave, // NEW
});
```

### 4. Update action handler for silent save

**File**: `app/routes/app.sections.$id.tsx`

Current saveDraft action (lines 75-97) already works. No changes needed.

## Testing Steps

1. Create new section with prompt
2. Wait for AI to generate
3. Verify code appears in preview
4. Reload page
5. Confirm code persists (not empty)

## Edge Cases

- **Streaming incomplete**: Only saves when message completes with codeSnapshot
- **Multiple rapid saves**: Fetcher queues, last value wins
- **Network failure**: Silent fail, user can manual save

## Rollback

Remove `onAutoSave` callback and related code. Re-add explicit Save Draft button.
