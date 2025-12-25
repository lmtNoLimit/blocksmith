# Phase 03: Theme Customizer UI Polish

## Context Links
- [Parent Plan](./plan.md)
- [Phase 01: UI Audit](./phase-01-ui-audit-gap-analysis.md)
- [Phase 02: Radio Migration](./phase-02-radio-component-migration.md)

## Overview
- **Priority**: P2
- **Effort**: 1.5h
- **Status**: Done
- **Description**: Apply UI polish to match Shopify Theme Customizer styling

## Key Insights

1. Theme Customizer uses consistent spacing (16px between settings)
2. Labels use 14px font weight 500
3. Info text uses 12px font, muted color
4. Settings grouped with headers (already supported via `header` schema type)
5. Focus states use Shopify's blue accent color

## Requirements

### Functional
- Match Theme Customizer visual styling
- Consistent spacing between settings
- Proper focus/hover states

### Non-functional
- Minimize CSS changes
- Use Polaris design tokens where possible
- Maintain accessibility

## Architecture

```
Styling Hierarchy:
SettingsPanel.tsx
├── Preview controls (device size, refresh)
├── Settings header (count, reset, collapse)
├── Settings form
│   └── SettingField (gap: 16px)
│       └── [Component] (consistent internal spacing)
└── Blocks section
```

## Related Code Files

| File | Action | Notes |
|------|--------|-------|
| `app/components/preview/settings/SettingsPanel.tsx` | Modify | Container styling |
| `app/components/preview/settings/NumberSetting.tsx` | Modify | Range slider styling |
| `app/components/preview/settings/SelectSetting.tsx` | Modify | Segmented control styling |

## Implementation Steps

### 1. SettingsPanel Container Polish

```tsx
// Update container styles
<div style={{
  backgroundColor: '#fff',
  border: '1px solid #e1e3e5',
  borderRadius: '8px',
  padding: '16px',
  fontSize: '14px' // Base font size
}}>
```

### 2. Range Slider Enhancement

- Current: Custom black slider thumb
- Theme Customizer: Similar but with subtle shadow
- Keep current implementation (already good match)

### 3. Segmented Control Polish

- Current: Black selected, white unselected
- Theme Customizer: Similar styling
- Minor: Add subtle hover state

### 4. Spacing Standardization

- Setting to setting gap: 16px ✅ (already correct)
- Label to input gap: 8px ✅ (already correct)
- Info text: 4px below input

### 5. Focus State Enhancement

```tsx
// Add focus-visible styles for accessibility
<style>{`
  s-text-field:focus-within,
  s-select:focus-within {
    outline: 2px solid #005bd3;
    outline-offset: 2px;
  }
`}</style>
```

## Todo List

- [x] Review SettingsPanel container styles
- [x] Add focus state CSS for form elements
- [x] Polish segmented control hover state
- [x] Verify Range slider matches Theme Customizer
- [x] Test all settings in preview mode
- [x] Verify real-time preview updates
- [x] Run final UI comparison

## Success Criteria

- [x] Settings visually match Theme Customizer
- [x] Consistent spacing throughout
- [x] Proper focus states for accessibility
- [x] Settings change triggers preview update
- [x] No visual regressions

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Over-styling | Medium | Low | Keep changes minimal |
| Breaking existing UI | Low | High | Test all setting types |
| Polaris component limitations | Low | Medium | Use inline styles as fallback |

## Security Considerations

None - styling only

## Next Steps

After completing polish:
1. Full integration test with various section schemas
2. Test on different screen sizes
3. Document any remaining differences from Theme Customizer
