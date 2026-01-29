---
title: "Phase 04: CRO Reasoning Panel"
status: done
effort: 4h
dependencies: [phase-03]
completed: 2026-01-29
---

# Phase 04: CRO Reasoning Panel

**Parent Plan**: [CRO-Focused Pivot](./plan.md)
**Dependencies**: [Phase 03: AI CRO Integration](./phase-03-ai-cro-integration.md)

---

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-26 |
| Priority | P1 |
| Implementation Status | Done |
| Review Status | Passed |
| Completed | 2026-01-29 |

---

## Key Insights (from Research)

- Reasoning panel differentiates from competitors ("CRO-powered" positioning)
- Show WHY design choices work, not just WHAT was generated
- Reference psychological principles (Cialdini) for authority
- Include A/B testing tips for actionable next steps
- Panel should be collapsible to not overwhelm

---

## Requirements

### Functional Requirements

1. New panel in section editor showing CRO reasoning
2. Display goal, design decisions, principles, explanations
3. Collapsible/expandable panel behavior
4. Visual design consistent with Polaris
5. Persist reasoning with section for future reference

### Acceptance Criteria

- [ ] `CROReasoningPanel.tsx` component created
- [ ] Panel displays in `app.sections.$id.tsx` editor
- [ ] Goal header + decision list rendered
- [ ] Each decision shows: element, choice, principle, explanation
- [ ] A/B testing tip displayed at bottom
- [ ] Panel collapsible with toggle
- [ ] Empty state when no reasoning available
- [ ] Reasoning stored in section model

---

## Architecture

### Component Structure

```
app/routes/app.sections.$id.tsx
└── EditorLayout
    ├── ChatPanel (existing)
    ├── CodePreview (existing)
    └── CROReasoningPanel.tsx (new)
```

### Data Flow

```
AI Response
    ↓
parseCROReasoning() → CROReasoning object
    ↓
Store in Section.croReasoning (JSON)
    ↓
Loader fetches section + reasoning
    ↓
CROReasoningPanel receives reasoning prop
    ↓
Render decision list
```

---

## Related Code Files

| File | Action | Purpose |
|------|--------|---------|
| `app/routes/app.sections.$id.tsx` | Modify | Add reasoning panel to layout |
| `app/components/reasoning/CROReasoningPanel.tsx` | Create | Main panel component |
| `app/components/reasoning/ReasoningDecision.tsx` | Create | Individual decision item |
| `prisma/schema.prisma` | Modify | Add croReasoning field to Section |
| `app/services/section.server.ts` | Modify | Store/retrieve reasoning |

---

## Implementation Steps

### Step 1: Update Section Model (15 min)

Add reasoning field to `prisma/schema.prisma`:

```prisma
model Section {
  // ... existing fields
  croReasoning Json? // Stores CROReasoning object
  croRecipeSlug String? // Reference to recipe used
}
```

Run migration:
```bash
npx prisma migrate dev --name add-cro-reasoning
```

### Step 2: Create ReasoningDecision Component (45 min)

`app/components/reasoning/ReasoningDecision.tsx`:

```tsx
interface ReasoningDecisionProps {
  decision: CRODecision;
  index: number;
}

export function ReasoningDecision({ decision, index }: ReasoningDecisionProps) {
  return (
    <s-box padding="base" background="subdued" borderRadius="base">
      <s-stack gap="extraSmall">
        <s-inline alignItems="center" gap="small">
          <s-badge tone="info">{decision.principle}</s-badge>
          <s-text fontWeight="semibold">{decision.element}</s-text>
        </s-inline>
        <s-text>{decision.choice}</s-text>
        <s-text type="subdued" size="small">
          {decision.explanation}
          {decision.source && ` (${decision.source})`}
        </s-text>
      </s-stack>
    </s-box>
  );
}
```

### Step 3: Create CROReasoningPanel Component (90 min)

`app/components/reasoning/CROReasoningPanel.tsx`:

```tsx
interface CROReasoningPanelProps {
  reasoning: CROReasoning | null;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function CROReasoningPanel({
  reasoning,
  isCollapsed = false,
  onToggle
}: CROReasoningPanelProps) {
  if (!reasoning) {
    return <EmptyReasoningState />;
  }

  return (
    <s-card>
      <s-card-header>
        <s-inline alignItems="center" gap="base">
          <s-icon source="ChartIcon" />
          <s-heading level="3">CRO Reasoning</s-heading>
          <s-button variant="plain" onClick={onToggle}>
            {isCollapsed ? 'Expand' : 'Collapse'}
          </s-button>
        </s-inline>
      </s-card-header>

      {!isCollapsed && (
        <s-card-body>
          <s-stack gap="base">
            {/* Goal */}
            <s-box>
              <s-text type="subdued" size="small">Goal</s-text>
              <s-text fontWeight="semibold">{reasoning.goal}</s-text>
            </s-box>

            {/* Decisions */}
            <s-stack gap="small">
              <s-text fontWeight="semibold">Design Decisions</s-text>
              {reasoning.decisions.map((decision, index) => (
                <ReasoningDecision
                  key={index}
                  decision={decision}
                  index={index}
                />
              ))}
            </s-stack>

            {/* Tip */}
            {reasoning.tip && (
              <s-banner tone="info" icon="LightbulbIcon">
                <s-text>{reasoning.tip}</s-text>
              </s-banner>
            )}
          </s-stack>
        </s-card-body>
      )}
    </s-card>
  );
}

function EmptyReasoningState() {
  return (
    <s-card>
      <s-card-body>
        <s-empty-state
          heading="No CRO Reasoning"
          body="Generate a section using a CRO recipe to see design reasoning."
        />
      </s-card-body>
    </s-card>
  );
}
```

### Step 4: Update Editor Layout (60 min)

Modify `app.sections.$id.tsx` to include reasoning panel:

```tsx
// In loader
const section = await getSection(sectionId);
const reasoning = section.croReasoning
  ? (section.croReasoning as CROReasoning)
  : null;

// In component
const [reasoningCollapsed, setReasoningCollapsed] = useState(false);

// In JSX - add panel to right side or below preview
<s-grid gridTemplateColumns="1fr 300px" gap="large">
  <s-grid-item>
    {/* Existing: Chat + Preview */}
  </s-grid-item>
  <s-grid-item>
    <CROReasoningPanel
      reasoning={reasoning}
      isCollapsed={reasoningCollapsed}
      onToggle={() => setReasoningCollapsed(!reasoningCollapsed)}
    />
  </s-grid-item>
</s-grid>
```

### Step 5: Store Reasoning on Generation (30 min)

Update section creation/update flow:
1. After AI generates, parse reasoning
2. Store in section.croReasoning
3. Store recipe slug in section.croRecipeSlug

```typescript
// In action or AI completion handler
const { code, reasoning } = await generateSection({
  prompt,
  recipe,
  recipeContext
});

await updateSection(sectionId, {
  code,
  croReasoning: reasoning,
  croRecipeSlug: recipe?.slug
});
```

### Step 6: Update Reasoning on Refinement (30 min)

When user refines via chat:
- AI may update reasoning if design changes significantly
- Parse new reasoning from response
- Update stored reasoning
- UI reflects latest reasoning

### Step 7: Visual Polish (30 min)

Styling refinements:
- Principle badges with appropriate colors
- Decision separators (subtle borders)
- Smooth collapse/expand animation
- Mobile-responsive layout
- Tooltip for long explanations

---

## UI Design Reference

```
┌─────────────────────────────────────┐
│ 📊 CRO Reasoning          [Collapse]│
├─────────────────────────────────────┤
│ Goal: Reduce Cart Abandonment       │
│                                     │
│ Design Decisions                    │
│ ┌─────────────────────────────────┐ │
│ │ [Urgency] CTA Placement         │ │
│ │ Above-the-fold, F-pattern       │ │
│ │ 80% of viewing time above fold  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ [Scarcity] Urgency Element      │ │
│ │ Stock counter with low inventory│ │
│ │ Triggers loss aversion          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ [Trust] Guarantee Badge         │ │
│ │ Near CTA, 30-day money back     │ │
│ │ Reduces perceived risk          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 💡 A/B test urgency vs social proof │
└─────────────────────────────────────┘
```

---

## Success Criteria

1. Panel renders with all reasoning data
2. Decisions display with principle badges
3. Collapse/expand works smoothly
4. Empty state shows when no reasoning
5. Reasoning persists after page refresh
6. Reasoning updates on regeneration
7. Responsive on mobile (full width)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Panel takes too much space | Medium | Medium | Collapsible by default on mobile |
| Reasoning not parsed | Low | Medium | Empty state fallback |
| Stale reasoning after edits | Medium | Low | Update on AI regeneration only |
| Performance with large reasoning | Low | Low | JSON size minimal (~1KB) |
