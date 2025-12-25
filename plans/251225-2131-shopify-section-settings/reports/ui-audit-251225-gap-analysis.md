# UI Audit: Section Settings vs Theme Customizer

**Date**: 2025-12-25 | **Phase**: 01 | **Status**: Complete

## Executive Summary

Audited 7 input settings against Shopify Theme Customizer standards. **6/7 use Polaris web components correctly**. **1 critical gap**: RadioSetting uses native HTML instead of `<s-choice-list>`. Range slider correctly uses custom implementation (Polaris lacks `<s-range-slider>`).

---

## Component Audit Results

### ✅ CheckboxSetting (PASS)
- **Component**: `<s-checkbox>`
- **Implementation**: Correct Polaris usage
- **Props mapped**: `label`, `checked`, `disabled`, `details` (for info)
- **Event handling**: `onChange` → `e.currentTarget.checked`
- **Gap**: None

### ✅ NumberSetting - Number Input (PASS)
- **Component**: `<s-number-field>`
- **Implementation**: Correct Polaris usage
- **Props mapped**: `label`, `value`, `min`, `max`, `step`, `disabled`
- **Event handling**: `onInput` → `parseFloat(e.target.value)`
- **Gap**: Minor - info text rendered separately (Polaris has `details` prop)

### ✅ NumberSetting - Range Slider (PASS - Custom Correct)
- **Component**: Custom `<input type="range">` with styled thumb
- **Implementation**: Correctly custom - **Polaris lacks `<s-range-slider>`**
- **Features**:
  - Visual slider with percentage fill
  - Value badge display
  - Min/max labels
  - Styled thumb (black, rounded, shadow)
- **Gap**: None - proper fallback for missing Polaris component

### ⚠️ RadioSetting (CRITICAL GAP)
- **Component**: Native `<input type="radio">`
- **Should be**: `<s-choice-list>` with `<s-choice>` children
- **Current issues**:
  - Uses native HTML radio inputs
  - Custom styling doesn't match Polaris design system
  - Missing built-in ARIA accessibility
  - No Polaris focus/hover states
- **Fix required**: Migrate to Polaris choice-list
- **Priority**: **P1 - Required for Phase 02**

### ✅ SelectSetting - Dropdown (PASS)
- **Component**: `<s-select>` with `<option>` children
- **Implementation**: Correct Polaris usage
- **Props mapped**: `label`, `value`, `disabled`
- **Event handling**: `onChange` → `e.target.value`
- **Gap**: None

### ✅ SelectSetting - Segmented Control (PASS - Custom Correct)
- **Component**: Custom button group (≤5 options, ungrouped)
- **Implementation**: Smart UI selection matches Shopify behavior
- **Features**:
  - Black selected, white unselected
  - Proper border/overflow styling
  - Transition animations
- **Gap**: Minor - could add subtle hover state

### ✅ TextSetting - Text Field (PASS)
- **Component**: `<s-text-field>`
- **Implementation**: Correct Polaris usage
- **Props mapped**: `label`, `value`, `placeholder`, `disabled`, `details`
- **Event handling**: `onInput` → `e.target.value`
- **Gap**: None

### ✅ TextSetting - Textarea (PASS)
- **Component**: `<s-text-area>`
- **Implementation**: Correct Polaris usage
- **Props mapped**: `label`, `value`, `placeholder`, `disabled`, `rows`
- **Event handling**: `onInput` → `e.target.value`
- **Gap**: Minor - info text rendered separately for url/multiline

---

## Gap Summary

| Setting | Status | Gap Level | Action |
|---------|--------|-----------|--------|
| Checkbox | ✅ PASS | None | None |
| Number | ✅ PASS | Minor | Consider using `details` prop |
| Range | ✅ PASS | None | Custom correct |
| Radio | ⚠️ FAIL | **Critical** | **Migrate to `<s-choice-list>`** |
| Select | ✅ PASS | None | None |
| Segmented | ✅ PASS | Minor | Add hover state |
| Text | ✅ PASS | None | None |
| Textarea | ✅ PASS | Minor | Consider using `details` prop |

---

## Priority Actions

### P1 - Critical (Phase 02)
1. **RadioSetting Migration**: Replace native HTML with `<s-choice-list>`
   - File: `app/components/preview/settings/RadioSetting.tsx`
   - Change: Full component rewrite using Polaris
   - Effort: ~30 min

### P2 - Minor Polish (Phase 03)
2. **Segmented Control Hover**: Add subtle hover effect
   - File: `app/components/preview/settings/SelectSetting.tsx`
   - Change: Add `:hover` state to buttons
   - Effort: ~10 min

3. **Info Text Consolidation**: Use Polaris `details` prop where available
   - Files: `NumberSetting.tsx`, `TextSetting.tsx`
   - Change: Move info to component prop instead of separate span
   - Effort: ~15 min

---

## Technical Notes

### Polaris Web Component Availability

| Setting Type | Polaris Component | Status |
|--------------|-------------------|--------|
| Checkbox | `<s-checkbox>` | ✅ Available |
| Number | `<s-number-field>` | ✅ Available |
| Range | `<s-range-slider>` | ❌ **NOT Available** |
| Radio | `<s-choice-list>` | ✅ Available |
| Select | `<s-select>` | ✅ Available |
| Text | `<s-text-field>` | ✅ Available |
| Textarea | `<s-text-area>` | ✅ Available |

### Event Handling Pattern

All Polaris components use:
- `onInput` - Real-time updates (recommended for preview)
- `onChange` - Blur/Enter press (committed value)
- `e.currentTarget` or `e.target` for value access

### Accessibility Compliance

| Setting | ARIA Labels | Keyboard Nav | Focus States |
|---------|------------|--------------|--------------|
| Checkbox | ✅ Auto | ✅ Native | ✅ Polaris |
| Number | ✅ Auto | ✅ Native | ✅ Polaris |
| Range | ⚠️ Manual | ✅ Native | ✅ Custom |
| Radio | ❌ Missing | ⚠️ Native | ❌ Custom |
| Select | ✅ Auto | ✅ Native | ✅ Polaris |
| Text | ✅ Auto | ✅ Native | ✅ Polaris |

---

## Conclusion

Current implementation is **86% compliant** (6/7 settings). RadioSetting migration is the only blocking issue. Range slider custom implementation is the correct approach until Polaris adds `<s-range-slider>`.

**Recommendation**: Proceed to Phase 02 for RadioSetting migration.

---

## Unresolved Questions

None - all gaps identified with clear remediation paths.
