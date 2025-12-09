# Phase 02: Implement Frontend Redirect

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Dependencies**: [Phase 01](./phase-01-backend-response.md)
- **Related Docs**: [code-standards.md](../../docs/code-standards.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-09 |
| Priority | P1 |
| Implementation Status | ✅ DONE |
| Review Status | ✅ DONE |

**Description**: Add useEffect hook to redirect to Edit Section page after successful save action.

## Key Insights

1. Shopify embedded apps must use `useNavigate` from react-router, not `redirect`
2. Edit page already exists at `/app/sections/:id` with full functionality
3. `actionData?.sectionId` will be available from Phase 01
4. Redirect should only happen on successful save (not template save)

## Requirements

1. After successful save, navigate to `/sections/:id`
2. Don't redirect on save errors
3. Don't redirect on template save (stay on page)
4. Show toast before redirect for feedback

## Architecture

```
Save Button Click
       │
       ▼
  Submit Form
       │
       ▼
  Action Response
       │
  ┌────┴────┐
  │ success │ success=false
  │  =true  │     │
  │    +    │     ▼
  │sectionId│ Stay on page
  └────┬────┘ (show error)
       │
       ▼
 useEffect trigger
       │
       ▼
 navigate(/sections/:id)
```

## Related Code Files

| File | Purpose |
|------|---------|
| `app/routes/app.sections.new.tsx` | Add redirect logic (component) |
| `app/routes/app.sections.$id.tsx` | Destination (no changes needed) |

## Implementation Steps

### Step 1: Import useNavigate

**File**: `app/routes/app.sections.new.tsx`

Add `useNavigate` to imports:

```typescript
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useSearchParams,
  useNavigate  // Add this
} from "react-router";
```

### Step 2: Initialize navigate hook

**File**: `app/routes/app.sections.new.tsx` (inside component)

```typescript
export default function CreateSectionPage() {
  // ... existing hooks ...
  const navigate = useNavigate();  // Add this
```

### Step 3: Add Redirect useEffect

**File**: `app/routes/app.sections.new.tsx` (after existing useEffects)

```typescript
// Redirect to edit page after successful save
useEffect(() => {
  if (actionData?.success && actionData?.sectionId && !actionData?.templateSaved) {
    // Show toast before redirect
    shopify.toast.show("Section saved! Redirecting to editor...");

    // Navigate to edit page
    navigate(`/app/sections/${actionData.sectionId}`);
  }
}, [actionData?.success, actionData?.sectionId, actionData?.templateSaved, navigate]);
```

### Step 4: Remove Success Banner (Optional)

Since user is redirected, the success banner in Create page is no longer needed for save success. Keep only for template saved:

```typescript
{/* Success banner after save - REMOVE THIS BLOCK */}
{/* User will be redirected, no need for banner */}

{/* Template saved banner - KEEP THIS */}
{actionData?.templateSaved && (
  <s-banner tone="success" dismissible>
    Template saved successfully! View your templates in the Templates Library.
  </s-banner>
)}
```

## Todo List

- [x] Import `useNavigate` from react-router
- [x] Initialize `navigate` hook in component
- [x] Add useEffect for redirect on successful save
- [x] Remove/update success banner for save
- [x] Code review passed

## Success Criteria

- After clicking "Save to theme", user is redirected to `/sections/:id`
- Toast notification confirms save before redirect
- Edit page loads with correct section data
- Error saves stay on current page
- Template saves stay on current page

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Redirect loop | Low | High | Check sectionId is defined |
| Lost unsaved changes | None | N/A | Data already saved to DB |
| Toast not visible | Low | Low | Quick transition is fine |

## Security Considerations

- No security implications
- User can only access their own sections (shop validation in edit page loader)

## Next Steps

After implementation:
1. Test full flow: generate → save → redirect → edit
2. Verify error handling (failed save stays on page)
3. Verify template save stays on page
