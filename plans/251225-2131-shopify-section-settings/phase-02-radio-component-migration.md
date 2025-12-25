# Phase 02: Radio Component Migration

## Context Links
- [Parent Plan](./plan.md)
- [Phase 01: UI Audit](./phase-01-ui-audit-gap-analysis.md)
- [Research: Polaris Web Components](./research/researcher-02-polaris-web-components.md)

## Overview
- **Priority**: P2
- **Effort**: 1.5h
- **Status**: Pending
- **Description**: Migrate RadioSetting from native HTML to Polaris `<s-choice-list>` for consistency

## Key Insights

1. Current implementation uses native `<input type="radio">` with custom styling
2. Polaris provides `<s-choice-list>` for radio button groups
3. Migration improves:
   - Visual consistency with other Polaris components
   - Built-in accessibility (ARIA labels)
   - Theme Customizer-like appearance

## Requirements

### Functional
- Replace native radio inputs with `<s-choice-list>`
- Maintain same onChange callback interface
- Support `disabled`, `info`, `label` props

### Non-functional
- Keep component under 80 lines
- Event handling should match existing pattern

## Architecture

```
Before:
RadioSetting.tsx
├── <span> (label)
├── <div> (container)
│   └── <label> (for each option)
│       ├── <input type="radio">
│       └── <span> (option label)
└── <span> (info text)

After:
RadioSetting.tsx
├── <div> (container)
│   └── <s-choice-list label={...}>
│       └── <s-choice value={...}> (for each option)
└── <span> (info text)
```

## Related Code Files

| File | Action | Notes |
|------|--------|-------|
| `app/components/preview/settings/RadioSetting.tsx` | Modify | Main target |
| `app/components/preview/settings/SettingField.tsx` | None | No changes needed |

## Implementation Steps

1. Read current `RadioSetting.tsx` implementation
2. Create new implementation using `<s-choice-list>`
3. Map props:
   - `setting.label` → `label` prop on choice-list
   - `setting.options` → `<s-choice>` children
   - `value` → `values` prop (single selection)
   - `onChange` → handle `change` event
4. Add `info` text display after choice-list
5. Test with disabled state
6. Verify onChange callback works

## Code Example

```tsx
// New implementation pattern
export function RadioSetting({ setting, value, onChange, disabled }: RadioSettingProps) {
  const options = setting.options || [];

  const handleChange = (e: Event) => {
    const target = e.currentTarget as HTMLElement & { values: string[] };
    if (target.values?.length > 0) {
      onChange(target.values[0]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <s-choice-list
        label={setting.label}
        values={value ? [value] : []}
        disabled={disabled || undefined}
        onChange={handleChange}
      >
        {options.map((option) => (
          <s-choice key={option.value} value={option.value}>
            {option.label}
          </s-choice>
        ))}
      </s-choice-list>
      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}
    </div>
  );
}
```

## Todo List

- [ ] Read current RadioSetting implementation
- [ ] Test `<s-choice-list>` behavior in isolation
- [ ] Update RadioSetting.tsx with new implementation
- [ ] Verify onChange works correctly
- [ ] Test disabled state
- [ ] Test with section schema that uses radio type
- [ ] Run code review

## Success Criteria

- [ ] RadioSetting uses `<s-choice-list>`
- [ ] All existing radio settings still work
- [ ] Styling matches other Polaris components
- [ ] No TypeScript errors
- [ ] onChange callback triggers preview update

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Event handling differs | Medium | Medium | Test change event thoroughly |
| Values prop array handling | Low | Low | Documented in Polaris docs |

## Security Considerations

None - UI component only

## Next Steps

After completing migration, proceed to Phase 03 for UI polish
