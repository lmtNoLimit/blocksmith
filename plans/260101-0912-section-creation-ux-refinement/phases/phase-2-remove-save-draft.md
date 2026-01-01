# Phase 2: Remove Save Draft & Revert Buttons

## Objective
Remove obsolete "Save Draft" and "Revert" buttons from UI. Auto-save handles persistence; version history handles rollback.

## Current State

**File**: `app/routes/app.sections.$id.tsx` (lines 443-450)

```tsx
<s-button
  slot="secondary-actions"
  onClick={handleSaveDraft}
  loading={isSavingDraft || undefined}
  disabled={isLoading || undefined}
>
  Save Draft
</s-button>
```

## Changes

### 1. Remove Save Draft button

**File**: `app/routes/app.sections.$id.tsx`

Delete lines 443-450 (the Save Draft button).

### 2. Keep Ctrl+S for manual edits

The keyboard shortcut remains useful when users manually edit code.

**File**: `app/routes/app.sections.$id.tsx` (lines 336-343)

```typescript
// KEEP this shortcut - still useful for manual code edits
{
  key: 's',
  ctrl: true,
  action: handleSaveDraft,
  description: 'Save draft',
},
```

### 3. Update isSavingDraft reference

Remove unused loading state check:

**File**: `app/routes/app.sections.$id.tsx` (line 276)

```typescript
// REMOVE - no longer needed for button
const isSavingDraft = isLoading && navigation.formData?.get('action') === 'saveDraft';
```

Actually, keep this if we want toast feedback on Ctrl+S saves.

### 4. Consider toast feedback

Two options:

**Option A**: Silent Ctrl+S (no feedback)
- Simpler, less disruptive
- User trusts auto-save

**Option B**: Toast on Ctrl+S only
- Keep current actionData toast handling (lines 393-402)
- Shows "Draft saved!" on manual save

Recommendation: **Option B** - keep toast for manual Ctrl+S saves only.

### 5. Remove Revert button

Per validation: rely on version history for rollback.

**File**: `app/routes/app.sections.$id.tsx`

Delete the Revert button block:
```tsx
{/* REMOVE this block */}
{canRevert && (
  <s-button
    slot="secondary-actions"
    onClick={revertToOriginal}
    disabled={isLoading || undefined}
  >
    Revert
  </s-button>
)}
```

Also remove related state/handlers:
- `canRevert` computed value
- `revertToOriginal` handler

## Final Code

```tsx
{/* Secondary actions - only More actions menu remains */}
<s-button slot="secondary-actions" commandFor="editor-more-actions">
  More actions
</s-button>
```

## Testing

1. Open existing section
2. Verify no "Save Draft" button
3. Edit code manually
4. Press Ctrl+S
5. Verify toast shows "Draft saved!"
6. Verify AI generation still auto-saves

## Rollback

Re-add the Save Draft button if auto-save proves unreliable.
