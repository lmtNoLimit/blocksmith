---
title: "Shopify Section Settings Enhancement"
description: "Enhance 7 input setting components to match Theme Customizer UI using Polaris web components"
status: done
priority: P2
effort: 4h
branch: main
tags: [frontend, ui, polaris, settings]
created: 2025-12-25
---

# Shopify Section Settings Enhancement

## Overview

Enhance Section Preview settings to match Shopify Theme Customizer look using Polaris web components. The 7 basic input settings (Checkbox, Number, Radio, Range, Select, Text, Textarea) are already implemented but need UI polish.

## Current State Analysis

| Setting | Status | Component File | Notes |
|---------|--------|----------------|-------|
| Checkbox | ✅ Done | `CheckboxSetting.tsx` | Uses `<s-checkbox>` |
| Number | ✅ Done | `NumberSetting.tsx` | Uses `<s-number-field>` |
| Radio | ⚠️ Needs Polish | `RadioSetting.tsx` | Uses native HTML, should use `<s-choice-list>` |
| Range | ✅ Done | `NumberSetting.tsx` | Custom styled slider (Polaris lacks `<s-range-slider>`) |
| Select | ✅ Done | `SelectSetting.tsx` | Uses `<s-select>` + segmented control |
| Text | ✅ Done | `TextSetting.tsx` | Uses `<s-text-field>` |
| Textarea | ✅ Done | `TextSetting.tsx` | Uses `<s-text-area>` |

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | UI Audit & Gap Analysis | Done | 1h | [phase-01](./phase-01-ui-audit-gap-analysis.md) |
| 2 | Radio Component Migration | Done | 1.5h | [phase-02-radio-component-migration.md](./phase-02-radio-component-migration.md) |
| 3 | Theme Customizer UI Polish | Done | 1.5h | [phase-03-theme-customizer-ui-polish.md](./phase-03-theme-customizer-ui-polish.md) |

## Dependencies

- Polaris Web Components (already installed)
- Existing settings infrastructure (`SettingsPanel.tsx`, `SettingField.tsx`)

## Key Research Findings

1. **RangeSlider NOT available** in Polaris web components - current custom implementation is correct approach
2. **Radio should use `<s-choice-list>`** for Polaris consistency
3. **Settings already update preview** via `onChange` callback - working correctly
4. **Select uses smart UI** - segmented control for ≤5 options, dropdown for 6+

## Validation Summary

**Validated:** 2025-12-25
**Questions asked:** 3

### Confirmed Decisions
- **Audit Phase**: Keep Phase 01 - perform UI audit before making changes
- **Radio Migration**: Use Polaris `<s-choice-list>` when available; keep native HTML only when Polaris lacks equivalent component (e.g., Range slider)
- **UI Fidelity**: Close match - functional equivalence, not pixel-perfect

### Action Items
- [x] Plan validated, ready for implementation
