# GitHub Actions Lint Failure Analysis

**Run ID:** 21165118647
**PR:** docs/update-env-example #1
**Date:** 2026-01-20
**Status:** Failed
**Failed Jobs:** test (22.x), test (20.x)
**Failed Stage:** Lint

---

## Executive Summary

Workflow failed during lint stage with 126 ESLint violations (122 errors, 4 warnings). Both Node.js 22.x and 20.x jobs failed at same point. All errors are code quality issues - no runtime/environment failures. Type check passed; only lint blocked progression.

**Impact:** PR blocked from merge. No tests executed due to lint gate failure.

**Root Cause:** Accumulated ESLint violations across multiple files violating configured rules.

---

## Technical Analysis

### Failed Jobs
1. **test (22.x)** - Failed at Lint step (44s runtime)
2. **test (20.x)** - Canceled due to strategy configuration after 22.x failure (45s runtime)

### Completed Steps (Both Jobs)
- ✓ Set up job
- ✓ Checkout code
- ✓ Setup Node.js
- ✓ Install dependencies
- ✓ Type check **← PASSED**
- ✗ Lint **← FAILED HERE**
- Unit tests not executed
- Coverage upload skipped (no coverage files generated)

### Error Distribution

Total violations: **126 problems** (122 errors, 4 warnings)

**By Category:**

1. **TypeScript unused vars** (68 errors)
   - `@typescript-eslint/no-unused-vars`
   - Unused imports, variables, function parameters

2. **TypeScript explicit any** (51 errors)
   - `@typescript-eslint/no-explicit-any`
   - Concentrated in test files

3. **React unescaped entities** (4 errors)
   - `react/no-unescaped-entities`
   - Apostrophes and quotes in JSX

4. **React hooks violations** (2 errors + 4 warnings)
   - `react-hooks/rules-of-hooks` - conditional hook usage
   - `react-hooks/exhaustive-deps` - missing dependencies

5. **Misc** (1 error)
   - `no-useless-escape` - unnecessary escape character

---

## Files Affected (18 files)

### Critical Errors (Must Fix)

**1. app/components/chat/VersionTimeline.tsx** (2 errors)
- Line 34: Conditional `useCallback` call (CRITICAL - breaks React rules)
- Line 42: Unused `displayLabel` variable

**2. app/components/chat/MessageItem.tsx** (1 error)
- Line 235: Unescaped apostrophe in JSX text

**3. app/components/editor/diff/diff-engine.ts** (4 errors)
- Lines 132-134: Unused vars `currentHunk`, `lastChangeIndex`, `hasChange`
- Line 173: Unused param `startOffset`

**4. app/components/editor/validation/__tests__/validation-rules.test.ts** (3 errors)
- Lines 94, 137, 197: `any` types in test mocks

**5. app/components/preview/ElementInfoPanel.tsx** (2 errors)
- Line 56: Unescaped quotes around "data-section-id"

**6. app/components/preview/settings/SettingField.tsx** (2 errors)
- Line 1: Unused `SettingType` import
- Line 44: Unescaped apostrophe

**7. app/utils/settings-transform.server.ts** (1 error)
- Line 29: Unnecessary escape `\%`

**8. app/routes/app._index.tsx** (1 error)
- Line 137: Unused `navigate` variable

### High Volume Test Files (51+ errors each)

**9. app/routes/__tests__/api.feedback.test.tsx** (51 errors)
- All `any` types in mock functions/objects
- Lines 30, 31, 39, 72, 78, 85, 92, 98, 107, 114-327, 335-371

**10. app/routes/__tests__/api.preview.configure-password.test.tsx** (59 errors)
- All `any` types in mock functions/objects
- Lines 25, 26, 34, 64-298

### Unused Import Cleanup Needed (9 errors)

**11. app/components/editor/__tests__/SchemaValidation.test.tsx**
- Line 5: Unused `screen` import

**12. app/components/editor/__tests__/FeedbackWidget.test.tsx**
- Lines 5-6: Unused `screen`, `waitFor`, `userEvent` imports

**13. app/components/chat/__tests__/MessageItem.test.tsx**
- Lines 133, 210: Unused `container` destructure

**14. app/components/chat/__tests__/CodeBlock.test.tsx**
- Line 6: Unused `userEvent` import

**15. app/components/editor/validation/__tests__/schema-validator.test.ts**
- Line 5: Unused `SchemaValidationResult` import

**16. app/components/preview/schema/__tests__/parseSchema.test.ts**
- Line 15: Unused `SettingType` import

### Warnings Only (Non-blocking if errors fixed)

**17. app/routes/app.sections.$id.tsx** (3 warnings)
- Lines 368, 378: Missing `shopify.toast` in useCallback deps
- Line 462: Missing `shopify.toast` in useEffect deps

**18. app/components/billing/UsageAlertBanner.tsx** (1 warning)
- Line 45: Missing `activeThreshold` in useEffect deps

---

## Root Cause Analysis

**Primary Cause:** Code quality debt - violations introduced before lint enforcement tightened or during rapid feature development.

**Contributing Factors:**

1. **Test file technical debt** - 110/126 errors (87%) in test files using `any` types for mocks
2. **Incomplete cleanup** - Unused imports/vars from refactoring not removed
3. **JSX escaping oversight** - 4 unescaped entities in user-facing text
4. **React hooks misuse** - 1 critical conditional hook call

**Timeline Evidence:**

Recent commits show template work (Phase 2-4), suggesting these errors preexisted or were introduced during parallel development.

```
7f98be5 feat(templates): enable Use As-Is flow
848443b feat(scripts): add template integration
685eedf feat(scripts): add template validation
```

---

## Recommended Fixes

### Immediate (Block PR merge)

**Priority 1: Fix Critical React Violation**

File: `app/components/chat/VersionTimeline.tsx`

```typescript
// Line 34 - BEFORE (WRONG - conditional hook):
if (condition) {
  const handler = useCallback(() => {...}, []);
}

// AFTER (CORRECT - unconditional hook):
const handler = useCallback(() => {
  if (!condition) return;
  ...
}, [condition]);
```

**Priority 2: Fix JSX Unescaped Entities** (4 files)

```typescript
// Replace literal quotes/apostrophes:
<Text>User's data</Text>          // ❌
<Text>User&apos;s data</Text>     // ✅
<Text>{"User's data"}</Text>      // ✅ (alternative)

<Text>"data-section-id"</Text>    // ❌
<Text>&quot;data-section-id&quot;</Text>  // ✅
<Text>{'"data-section-id"'}</Text>        // ✅
```

**Priority 3: Remove Unused Code** (18 instances)

Use ESLint autofix where safe:
```bash
npm run lint -- --fix
```

Manual review needed for:
- `app/components/editor/diff/diff-engine.ts` vars (lines 132-134, 173)
- `app/routes/app._index.tsx` navigate var (line 137)

**Priority 4: Fix Test Mock Types** (110 errors in 2 files)

Approach A (Quick): Type parameters explicitly
```typescript
// BEFORE:
const mockRequest = vi.fn((params: any) => {...});

// AFTER:
const mockRequest = vi.fn((params: RequestParams) => {...});
```

Approach B (Thorough): Create proper mock types
```typescript
type MockShopifyAdmin = {
  request: (query: string, options?: RequestOptions) => Promise<Response>;
  // ... other methods
};
```

**Priority 5: Fix Regex Escape**

File: `app/utils/settings-transform.server.ts` line 29
```typescript
// BEFORE:
const regex = /\%/g;

// AFTER:
const regex = /%/g;  // % doesn't need escaping outside character class
```

### Long-term Improvements

1. **Pre-commit Hooks** - Add lint check to git hooks
   ```json
   // package.json
   "husky": {
     "hooks": {
       "pre-commit": "npm run lint"
     }
   }
   ```

2. **CI Optimization** - Run lint before type check (fail faster)
   ```yaml
   # .github/workflows/test.yml
   - name: Lint
   - name: Type check  # swap order
   ```

3. **Incremental Adoption** - If violations too many, use:
   ```json
   // .eslintrc
   "rules": {
     "@typescript-eslint/no-explicit-any": "warn"  // downgrade to warning
   }
   ```

4. **Type Coverage Tracking** - Add `type-coverage` to monitor `any` usage trends

5. **Automated Cleanup** - Schedule refactor sprints to address test mock types

---

## Verification Steps

After fixes:

1. Run lint locally:
   ```bash
   npm run lint
   ```

2. Verify type check still passes:
   ```bash
   npm run typecheck
   ```

3. Run tests to ensure no behavioral changes:
   ```bash
   npm test
   ```

4. Push and verify CI passes

---

## Prevention Measures

1. **Enable VSCode ESLint Extension** - Show violations in editor
2. **Add CI Status Badge** - Make build status visible in README
3. **Require Lint Pass** - Enforce in PR merge requirements
4. **Code Review Checklist** - Include "Lint passes locally" item
5. **Developer Onboarding** - Document lint rules and rationale

---

## Unresolved Questions

1. Are the unused test utilities (`screen`, `waitFor`, `userEvent`) actually needed for future test expansion?
2. Should `shopify.toast` dependency warnings be fixed by including in deps array or by memoizing toast instance?
3. Is there a timeline/strategy for removing `any` types from test mocks, or is technical debt accepted for tests?
4. Why was `navigate` assigned but unused in `app._index.tsx` - incomplete feature or dead code?
