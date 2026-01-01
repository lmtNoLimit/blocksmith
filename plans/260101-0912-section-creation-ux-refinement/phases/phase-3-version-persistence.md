# Phase 3: URL-Based Version Persistence

## Objective
Persist active version in URL so page reload restores correct state.

## Current Behavior
- Version state is local React state
- Page reload loses selected version
- User returns to draft/latest version

## New Behavior
- Active version ID stored in URL: `/app/sections/123?v=abc`
- Reload restores version from URL param
- URL updates when version applied

## Implementation

### 1. Parse version from URL in loader

**File**: `app/routes/app.sections.$id.tsx`

```typescript
// Modify loader (lines 34-65)
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const sectionId = params.id;

  if (!sectionId) {
    throw data({ message: 'Section ID required' }, { status: 400 });
  }

  // Parse version from URL
  const url = new URL(request.url);
  const versionId = url.searchParams.get('v');

  // Load section
  const section = await sectionService.getById(sectionId, shop);
  if (!section) {
    throw data({ message: 'Section not found' }, { status: 404 });
  }

  // Load themes
  const themes = await themeAdapter.getThemes(request);

  // Load conversation
  const conversation = await chatService.getOrCreateConversation(sectionId, shop);
  const messages = await chatService.getMessages(conversation.id);

  return {
    section,
    themes,
    conversation: { id: conversation.id, messages },
    shopDomain: shop,
    initialVersionId: versionId, // NEW - pass to client
  };
}
```

### 2. Pass initialVersionId to useEditorState

**File**: `app/routes/app.sections.$id.tsx`

```typescript
// In component (line 199)
const { section, themes, conversation, shopDomain, initialVersionId } = useLoaderData<typeof loader>();

// Pass to hook (line 236)
} = useEditorState({
  section,
  themes: themes as Theme[],
  conversation: conversation as { id: string; messages: UIMessage[] },
  onAutoApply: handleAutoApply,
  initialVersionId, // NEW
});
```

### 3. Update useEditorState to accept initialVersionId

**File**: `app/components/editor/hooks/useEditorState.ts`

```typescript
// Add to interface (line 8)
interface UseEditorStateOptions {
  section: Section;
  themes: Theme[];
  conversation?: { id: string; messages: UIMessage[] } | null;
  onAutoApply?: () => void;
  initialVersionId?: string | null; // NEW
}

// Pass to useVersionState (line 101)
const { versions, /* ... */ } = useVersionState({
  messages: liveMessages,
  initialCode: sectionCode,
  onCodeChange: handleCodeUpdate,
  isDirty,
  onAutoApply,
  onAutoSave: handleAutoSave,
  initialVersionId, // NEW
});
```

### 4. Restore version from initialVersionId

**File**: `app/components/editor/hooks/useVersionState.ts`

```typescript
// Add to interface (line 4)
interface UseVersionStateOptions {
  messages: UIMessage[];
  initialCode: string;
  onCodeChange: (code: string) => void;
  isDirty?: boolean;
  onAutoApply?: () => void;
  onAutoSave?: (code: string) => void;
  initialVersionId?: string | null; // NEW
  onVersionChange?: (versionId: string | null) => void; // NEW - for URL update
}

// Initialize activeVersionId from prop (line 43)
const [activeVersionId, setActiveVersionId] = useState<string | null>(
  initialVersionId ?? null
);

// Add effect to restore version on mount (after line 73)
useEffect(() => {
  if (!initialVersionId || versions.length === 0) return;

  const version = versions.find(v => v.id === initialVersionId);
  if (version) {
    // Restore this version's code
    onCodeChange(version.code);
  }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty deps - restore only on initial load
```

### 5. Update URL when version applied

**File**: `app/components/editor/hooks/useEditorState.ts`

```typescript
// Add import
import { useSearchParams } from 'react-router';

// In hook body
const [searchParams, setSearchParams] = useSearchParams();

// Callback for URL update (pass to useVersionState)
const handleVersionChange = useCallback((versionId: string | null) => {
  setSearchParams(prev => {
    if (versionId) {
      prev.set('v', versionId);
    } else {
      prev.delete('v');
    }
    return prev;
  }, { replace: true }); // Don't add history entry
}, [setSearchParams]);
```

### 6. Wire up onVersionChange in useVersionState

**File**: `app/components/editor/hooks/useVersionState.ts`

```typescript
// In applyVersion callback (line 60)
const applyVersion = useCallback(
  (versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      setActiveVersionId(versionId);
      setSelectedVersionId(null);
      onCodeChange(version.code);
      onVersionChange?.(versionId); // NEW - update URL
    }
  },
  [versions, onCodeChange, onVersionChange]
);

// In auto-apply effect, also update URL
if (isFirstVersion || isNewVersion) {
  setActiveVersionId(latestVer.id);
  setSelectedVersionId(null);
  onCodeChange(latestVer.code);
  onAutoApply?.();
  onAutoSave?.(latestVer.code);
  onVersionChange?.(latestVer.id); // NEW - update URL
}
```

## Edge Cases

### Invalid version ID in URL
```typescript
// In restore effect
const version = versions.find(v => v.id === initialVersionId);
if (!version) {
  // Invalid version ID - clear from URL
  onVersionChange?.(null);
  return;
}
```

### Version not yet loaded
Messages load async. If URL has version ID but messages not loaded yet:
```typescript
// Wait for versions to be available
if (initialVersionId && versions.length === 0) {
  // Still loading - don't clear yet
  return;
}
```

## Testing

1. Create section, wait for AI
2. Apply a version (not latest)
3. Copy URL
4. Reload page
5. Verify same version is active
6. Apply different version
7. Check URL updated
8. Use browser back → verify previous version restored

## Rollback

Remove URL param logic. Version state reverts to local-only.
