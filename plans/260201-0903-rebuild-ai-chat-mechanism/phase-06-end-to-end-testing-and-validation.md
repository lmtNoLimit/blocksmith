---
phase: 06
title: "End-to-End Testing and Validation"
status: in_progress
effort: 1h
---

# Phase 06: End-to-End Testing and Validation

## Context Links

- [Plan Overview](./plan.md)
- [All Phase Files](.)

## Overview

**Priority:** P1 - Validation before merge
**Current Status:** Pending
**Depends On:** All previous phases complete

Comprehensive testing of rebuilt AI chat mechanism. Verify marker-based output, direct storage, streaming, and preserved features.

## Key Insights

- Must test both new generation and refinement flows
- CRO recipe flow needs separate verification
- Version restore functionality should be unaffected
- Environment variables FLAG_AUTO_CONTINUE and FLAG_VALIDATE_LIQUID should be removed

## Requirements

### Functional
- New section generation produces valid Liquid
- Refinement chat updates code correctly
- CRO recipes include reasoning block
- Version history works
- Preview updates on code change

### Non-Functional
- No console errors during streaming
- Response time comparable to before
- No duplicate messages in chat

## Test Cases

### TC-01: New Section Generation

**Steps:**
1. Navigate to /sections/new
2. Enter prompt: "Create a hero section with heading and CTA button"
3. Submit and observe streaming
4. Verify preview updates

**Expected:**
- AI streams response with markers
- Code extracted correctly (between markers)
- Preview shows rendered section
- No console errors

**Verification:**
```javascript
// Check response format in Network tab
// Should see: ===START LIQUID=== ... ===END LIQUID===
```

### TC-02: Chat Refinement

**Steps:**
1. From TC-01, type: "Make the heading larger"
2. Submit refinement
3. Verify code updates

**Expected:**
- AI outputs complete section with markers
- Preview updates with larger heading
- Previous version accessible in history

### TC-03: CRO Recipe Generation

**Steps:**
1. Navigate to /sections/new
2. Select a CRO recipe (e.g., "Urgency Banner")
3. Fill context fields
4. Generate section

**Expected:**
- AI outputs Liquid with markers
- CRO reasoning block appears after ===END LIQUID===
- Reasoning panel displays decisions
- Code stored without reasoning block

**Verification:**
```javascript
// Check for CRO reasoning in response
// <!-- CRO_REASONING_START --> ... <!-- CRO_REASONING_END -->
```

### TC-04: Version Restore

**Steps:**
1. Generate section (TC-01)
2. Make 2-3 refinements
3. Open version history
4. Restore version 1

**Expected:**
- Version 1 code restored
- New version created (not overwrite)
- Preview shows restored code

### TC-05: Error Handling

**Steps:**
1. Disconnect network mid-stream
2. Observe error handling
3. Reconnect and retry

**Expected:**
- Error message displayed
- Retry button available
- Successful retry works

### TC-06: Edge Cases

**Markers not found:**
- If AI doesn't include markers, fallback behavior
- Should store full content or show error

**Empty response:**
- Handle gracefully with user message

**Very long section:**
- Verify no truncation issues
- maxOutputTokens = 65536 should handle

## Environment Cleanup

### Variables to REMOVE

| Variable | File | Action |
|----------|------|--------|
| FLAG_AUTO_CONTINUE | `.env`, `.env.example` | Delete |
| FLAG_VALIDATE_LIQUID | `.env`, `.env.example` | Delete |

### Verification

```bash
# Check no references remain
grep -r "FLAG_AUTO_CONTINUE" . --include="*.ts" --include="*.tsx" --include="*.env*"
grep -r "FLAG_VALIDATE_LIQUID" . --include="*.ts" --include="*.tsx" --include="*.env*"
```

## Implementation Steps

1. **Run TypeScript compilation**
   ```bash
   npm run typecheck
   ```

2. **Run existing tests**
   ```bash
   npm test
   ```

3. **Fix any failing tests**
   - Update tests that referenced deleted modules
   - Remove tests for deleted functionality

4. **Manual testing in browser**
   - Execute TC-01 through TC-06
   - Document any issues

5. **Remove environment variables**
   - Delete from `.env`
   - Delete from `.env.example`
   - Update `docs/code-standards.md` if documented

6. **Run linting**
   ```bash
   npm run lint
   ```

7. **Create test section samples**
   - Save example outputs for regression testing

## Todo List

- [x] Run TypeScript compilation - fix errors
- [x] Run test suite - fix failures (fixed SYSTEM_PROMPT test assertion)
- [x] Delete/update tests for removed modules
- [ ] TC-01: New section generation (manual browser test)
- [ ] TC-02: Chat refinement (manual browser test)
- [ ] TC-03: CRO recipe generation (manual browser test)
- [ ] TC-04: Version restore (manual browser test)
- [ ] TC-05: Error handling (manual browser test)
- [ ] TC-06: Edge cases (manual browser test)
- [x] Remove FLAG_AUTO_CONTINUE from env files (.env.example done, .env needs manual removal)
- [x] Remove FLAG_VALIDATE_LIQUID from env files (.env.example done, .env needs manual removal)
- [x] Verify no grep results for removed flags (no ts/tsx references)
- [x] Run linting - fix issues (fixed unused generationStatus variable)
- [ ] Document any behavior changes

## Success Criteria

- [x] TypeScript compiles with no errors
- [x] All existing tests pass (or updated) - 916/916 pass
- [ ] TC-01 through TC-06 pass (requires manual browser testing)
- [x] No FLAG_AUTO_CONTINUE references (in code)
- [x] No FLAG_VALIDATE_LIQUID references (in code)
- [x] Linting passes (0 errors, 4 pre-existing warnings)
- [ ] No console errors in browser (requires manual testing)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tests fail on removed modules | Medium | Update/delete affected tests |
| Manual tests reveal issues | High | Fix before merge |
| Edge cases not covered | Medium | Add more test cases as needed |

## Security Considerations

- Verify XSS sanitization still applied
- Check no raw user input in stored code
- Confirm form sanitization works

## Rollback Plan

If critical issues found:
1. Revert all phase commits
2. Restore deleted files from git
3. Re-add environment variables
4. Document issues for next attempt

## Documentation Updates

After successful testing:
- Update `docs/system-architecture.md` - remove extraction layer
- Update `docs/code-standards.md` - remove env vars
- Update README if AI flow documented

## Next Steps

After this phase:
- Code review
- Merge to main
- Monitor production for issues
