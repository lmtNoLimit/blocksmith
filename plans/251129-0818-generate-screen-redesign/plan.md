# Generate Screen Redesign - Implementation Plan

**Plan ID**: 251129-0818-generate-screen-redesign
**Created**: 2025-11-29
**Status**: Ready for Implementation
**Estimated Duration**: 3-4 phases

---

## Executive Summary

Redesign the Generate screen (`app/routes/app.generate.tsx`) following Shopify Polaris design patterns and competitor best practices. Implement Settings pattern layout, progressive disclosure, template suggestions, enhanced previews, and improved feedback mechanisms.

**Key Improvements**:
- Two-column Settings pattern layout (input left, preview right)
- Progressive disclosure for advanced options
- Template suggestions and prompt examples
- Enhanced loading states and error handling
- Better code preview with copy/download features
- Improved accessibility and mobile responsiveness

---

## Context & Research

**Research Reports**:
- [Shopify Design Guidelines](/Users/lmtnolimit/working/ai-section-generator/plans/251129-0818-generate-screen-redesign/research/researcher-01-shopify-design-guidelines.md)
- [Competitor Analysis](/Users/lmtnolimit/working/ai-section-generator/plans/251129-0818-generate-screen-redesign/research/researcher-02-competitor-analysis.md)

**Current Implementation**: `app/routes/app.generate.tsx` (189 lines)
- Single-column card-based layout
- Basic prompt input, code preview, theme selection
- Components: PromptInput, ThemeSelector, CodePreview, SectionNameInput, GenerateActions
- No template suggestions or progressive disclosure
- Basic loading/error states

**Technology Stack**:
- React Router 7, React 18, TypeScript
- Polaris Web Components (s-page, s-card, s-stack, s-text-field, s-button)
- Services: aiAdapter, themeAdapter (mock/real via feature flags)

**Design Decisions** (resolved):
- Code preview: Dedicated page route (not modal)
- Prompt textarea height: 250px
- Batch generation: Defer to v2
- Long-running generations: V1 shows progress indicator, no timeout
- AI vs templates usage: 65% AI, 35% templates

---

## Phase Breakdown

### Phase 1: Layout Restructuring & Settings Pattern
**Status**: ✅ Complete
**Progress**: 100%
**File**: [phase-01-layout-restructuring.md](./phase-01-layout-restructuring.md)

**Scope**: Implement two-column Settings pattern layout with responsive design
- Migrate from single-column to two-column layout (left: input, right: preview/actions)
- Use `s-layout-section` with variants for proper spacing
- Extract layout logic into reusable components
- Ensure mobile responsiveness (stack vertically on small screens)

**Key Deliverables**:
- Updated `app.generate.tsx` with two-column layout
- New components: `GenerateLayout.tsx`, `GenerateInputColumn.tsx`, `GeneratePreviewColumn.tsx`
- Mobile-responsive design (breakpoint handling)

---

### Phase 2: Enhanced Input Experience
**Status**: ✅ Complete
**Progress**: 100%
**File**: [phase-02-enhanced-input-experience.md](./phase-02-enhanced-input-experience.md)

**Scope**: Add template suggestions, prompt examples, and progressive disclosure
- Template gallery (hero, product grid, testimonials, FAQ, CTA sections)
- Quick prompt suggestions (contextual examples)
- Progressive disclosure for advanced options (tone, style, include schema)
- Character counter for prompt input
- Prompt validation and helpful error messages

**Key Deliverables**:
- New components: `TemplateSuggestions.tsx`, `PromptExamples.tsx`, `AdvancedOptions.tsx`
- Enhanced `PromptInput.tsx` with character counter
- Template data structure and selection handler

---

### Phase 3: Improved Preview & Feedback
**Status**: ✅ Complete
**Progress**: 100%
**File**: [phase-03-improved-preview-feedback.md](./phase-03-improved-preview-feedback.md)

**Scope**: Better code display, loading states, success/error handling
- Enhanced code preview (syntax highlighting, line numbers, copy button)
- Download generated code as file
- Loading state with spinner and progress indicator
- Improved banner feedback (info/success/critical tones)
- Empty state when no code generated
- Preview/edit toggle (future: inline editing)

**Key Deliverables**:
- Enhanced `CodePreview.tsx` with copy/download buttons
- New components: `LoadingState.tsx`, `EmptyState.tsx`, `GenerationProgress.tsx`
- Improved banner messaging with actionable next steps

---

### Phase 4: Advanced Features (Optional)
**Status**: ✅ Partial (History Feature Complete)
**Progress**: 25% (Phase 4C complete)
**File**: [phase-04-advanced-features.md](./phase-04-advanced-features.md)

**Scope**: Section templates library, brand kit integration, generation history
- Pre-built section templates library (persistent storage)
- Brand kit configuration (colors, fonts, tone)
- Generation history viewer (recent prompts and results)
- Section favorites/bookmarks
- Export options (JSON, ZIP with assets)

**Key Deliverables**:
- New route: `app.templates.tsx` (template library)
- New route: `app.settings.tsx` (brand kit configuration)
- Database models: `SectionTemplate`, `BrandKit`, `GenerationHistory`
- New components: `TemplateLibrary.tsx`, `BrandKitEditor.tsx`, `HistoryViewer.tsx`

**Note**: Phase 4 features are optional enhancements. Implement only if time/resources allow.

---

## Implementation Order

1. **Phase 1** (Foundation): Layout restructuring enables better UX for subsequent phases
2. **Phase 2** (Core UX): Template suggestions and progressive disclosure improve generation quality
3. **Phase 3** (Polish): Enhanced previews and feedback improve merchant confidence
4. **Phase 4** (Optional): Advanced features differentiate from competitors but not MVP-critical

---

## Success Criteria

**Phase 1**: Two-column layout functional on desktop and mobile, no regressions
**Phase 2**: Template suggestions visible, progressive disclosure works, prompts validated
**Phase 3**: Code preview enhanced with copy/download, loading states smooth, error handling improved
**Phase 4**: Templates library accessible, brand kit configurable, history viewable

**Overall Success**:
- Faster generation workflow (fewer clicks from prompt to save)
- Higher generation quality (better prompts via templates/suggestions)
- Better merchant experience (clearer feedback, more control)
- Accessibility compliant (WCAG AA)
- Mobile-responsive design
- No performance regressions

---

## Risk Assessment

**Low Risk**:
- Layout changes (Polaris components well-documented)
- Component extraction (existing pattern established in Phase 04)

**Medium Risk**:
- Progressive disclosure complexity (state management across components)
- Template suggestions data structure (needs careful design)
- Mobile responsiveness edge cases (testing required)

**High Risk (Phase 4 only)**:
- Database schema changes (migrations required)
- New routes and navigation (auth/routing considerations)
- Brand kit integration (complex configuration UI)

**Mitigation**:
- Incremental implementation (phase-by-phase)
- Thorough testing at each phase
- Feature flags for new features (rollback capability)
- Code review after each phase completion

---

## Dependencies

**Phase 1**: None (can start immediately)
**Phase 2**: Depends on Phase 1 (needs two-column layout)
**Phase 3**: Depends on Phase 1 (uses preview column), can run parallel with Phase 2
**Phase 4**: Depends on all previous phases (builds on complete redesign)

**External Dependencies**:
- Polaris Web Components (already integrated)
- Existing service layer (aiAdapter, themeAdapter)
- Feature flag system (already implemented)

---

## Documentation Updates Required

After completion, update:
- `docs/codebase-summary.md`: New components and layout structure
- `docs/system-architecture.md`: Updated component architecture diagram
- `README.md`: Updated screenshots (if applicable)

---

## Phase Files

1. [Phase 01: Layout Restructuring & Settings Pattern](./phase-01-layout-restructuring.md)
2. [Phase 02: Enhanced Input Experience](./phase-02-enhanced-input-experience.md)
3. [Phase 03: Improved Preview & Feedback](./phase-03-improved-preview-feedback.md)
4. [Phase 04: Advanced Features (Optional)](./phase-04-advanced-features.md)

---

**Plan Status**: Ready for implementation approval
**Next Step**: Review plan, approve, begin Phase 1 implementation
