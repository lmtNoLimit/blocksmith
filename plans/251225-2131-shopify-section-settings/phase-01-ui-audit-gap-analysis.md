# Phase 01: UI Audit & Gap Analysis

## Context Links
- [Parent Plan](./plan.md)
- [Research: Shopify Input Settings](./research/researcher-01-shopify-input-settings.md)
- [Research: Polaris Web Components](./research/researcher-02-polaris-web-components.md)

## Overview
- **Priority**: P2
- **Effort**: 1h
- **Status**: Done
- **Description**: Audit current settings implementation against Shopify Theme Customizer UI and identify gaps

## Key Insights

1. All 7 input settings are already implemented
2. Radio component uses native HTML instead of Polaris web components
3. Range slider correctly uses custom implementation (Polaris lacks this)
4. Settings already trigger preview updates via onChange callback

## Requirements

### Functional
- Compare each setting UI with Theme Customizer
- Document visual/behavioral differences
- Identify missing features

### Non-functional
- No code changes in this phase
- Output: documented gaps report

## Architecture

```
Current Flow:
SettingsPanel.tsx → SettingField.tsx → [Setting Component]
                                                ↓
                                         onChange callback
                                                ↓
                                      Preview re-renders
```

## Related Code Files

| File | Action | Notes |
|------|--------|-------|
| `app/components/preview/settings/SettingsPanel.tsx` | Audit | Main panel container |
| `app/components/preview/settings/SettingField.tsx` | Audit | Type router |
| `app/components/preview/settings/CheckboxSetting.tsx` | Audit | Boolean toggle |
| `app/components/preview/settings/NumberSetting.tsx` | Audit | Number + Range |
| `app/components/preview/settings/RadioSetting.tsx` | Audit | Needs migration |
| `app/components/preview/settings/SelectSetting.tsx` | Audit | Dropdown/segmented |
| `app/components/preview/settings/TextSetting.tsx` | Audit | Text + Textarea |

## Implementation Steps

1. Open Shopify Theme Customizer in dev store
2. Take screenshots of each setting type
3. Compare with current implementation UI
4. Document differences in:
   - Visual styling (colors, spacing, borders)
   - Behavior (hover states, focus, disabled)
   - Labels and info text placement
   - Error state handling
5. Create gap report

## Todo List

- [x] Access Theme Customizer in dev store
- [x] Screenshot Checkbox setting
- [x] Screenshot Number setting
- [x] Screenshot Radio setting
- [x] Screenshot Range setting
- [x] Screenshot Select setting
- [x] Screenshot Text/Textarea settings
- [x] Document visual gaps
- [x] Document behavioral gaps
- [x] Create gap summary

## Success Criteria

- [x] All 7 setting types visually compared
- [x] Gap document created with specific issues
- [x] Priority ranking for fixes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Theme Customizer access issues | Low | Medium | Use documentation screenshots |
| Styling differences minor | High | Low | Focus on major UX gaps only |

## Security Considerations

None - audit only phase

## Next Steps

After completing audit, proceed to Phase 02 for Radio component migration
