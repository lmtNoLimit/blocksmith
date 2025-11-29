# Phase 04: Advanced Features (Optional)

**Phase ID**: phase-04-advanced-features
**Date**: 2025-11-29
**Status**: ✅ Partial (Phase 4C - History Complete)
**Priority**: Low (Differentiation)
**Estimated Effort**: 12-16 hours
**Partial Completion**: 2025-11-29 (Phase 4C only)

---

## Context

**Parent Plan**: [Generate Screen Redesign Plan](./plan.md)
**Dependencies**: Phase 01, Phase 02, Phase 03 (all previous phases complete)
**Blocks**: None

**Related Documentation**:
- [Competitor Analysis Research](./research/researcher-02-competitor-analysis.md)
- [System Architecture](../../docs/system-architecture.md)
- [Code Standards](../../docs/code-standards.md)

**⚠️ IMPORTANT**: This phase is **optional** and should only be implemented if:
- Phases 01-03 are complete and stable
- Time and resources available
- User feedback indicates demand for these features
- Competitive differentiation required

**Design Decision**: Batch generation is deferred to v2 (not included in this phase)

---

## Overview

Add advanced features to differentiate from competitors: persistent section templates library, brand kit configuration, generation history viewer, section favorites, and enhanced export options.

**Current State** (Post-Phase 03): Functional generation with templates, examples, enhanced preview
**Target State**: Full-featured platform with template management, brand customization, history tracking

**Market Gaps Addressed** (from research):
- No unified section library management → **Section Templates Library**
- No brand kit enforcement → **Brand Kit Configuration**
- No version control → **Generation History Viewer**
- No reusability → **Section Favorites/Bookmarks**

---

## Key Insights from Research

**Competitor Analysis** (research/researcher-02):
- **Sectional**: Brand-aware styling, one-click installation
- **Shogun**: Reusable sections across campaigns
- **Tapita**: Hybrid model (pre-built + AI)
- **Market Gaps**: No collaborative workflows, no advanced customization UI, no version control

**High-Impact Opportunities**:
1. Template library → Reduce generation friction, improve consistency
2. Brand kit → Enforce merchant brand identity across all sections
3. History → Enable iteration, rollback, reuse
4. Favorites → Quick access to best-performing sections

---

## Requirements

### Functional Requirements

#### Feature 1: Section Templates Library

**Description**: Persistent storage and management of section templates (pre-built and user-created)

**Capabilities**:
- Browse templates by category (marketing, product, content, layout)
- Search templates by keyword
- Preview template code before use
- Edit existing templates
- Create custom templates from generated sections
- Delete templates
- Duplicate templates

**Data Model**:
```prisma
model SectionTemplate {
  id          String   @id @default(uuid())
  shop        String   // Merchant who owns template
  title       String
  description String
  category    String   // marketing, product, content, layout
  icon        String   // Emoji or icon identifier
  prompt      String   // Original generation prompt
  code        String   // Liquid code
  isPublic    Boolean  @default(false) // If true, visible to all merchants
  isFavorite  Boolean  @default(false) // Bookmarked by merchant
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shop])
  @@index([category])
}
```

**UI Components**:
- `app/routes/app.templates.tsx` - Template library page
- `app/components/templates/TemplateLibrary.tsx` - Grid of templates
- `app/components/templates/TemplateCard.tsx` - Individual template display
- `app/components/templates/TemplateEditor.tsx` - Edit/create template form
- `app/components/templates/TemplatePreview.tsx` - Code preview modal

---

#### Feature 2: Brand Kit Configuration

**Description**: Merchant-defined brand identity (colors, fonts, tone) applied to all generations

**Capabilities**:
- Define brand colors (primary, secondary, accent, background, text)
- Select brand fonts (heading, body)
- Set tone of voice (professional, casual, friendly, playful)
- Configure default section style (minimal, bold, elegant, modern)
- Enable/disable brand enforcement on generation
- Preview brand kit before saving

**Data Model**:
```prisma
model BrandKit {
  id          String   @id @default(uuid())
  shop        String   @unique // One brand kit per merchant

  // Colors
  primaryColor    String  @default("#000000")
  secondaryColor  String  @default("#FFFFFF")
  accentColor     String?
  backgroundColor String  @default("#FFFFFF")
  textColor       String  @default("#000000")

  // Fonts
  headingFont String  @default("sans-serif")
  bodyFont    String  @default("sans-serif")

  // Tone & Style
  tone        String  @default("professional") // professional, casual, friendly, playful
  style       String  @default("minimal") // minimal, bold, elegant, modern

  // Settings
  enforceOnGeneration Boolean @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**UI Components**:
- `app/routes/app.settings.tsx` - Brand kit configuration page
- `app/components/settings/BrandKitEditor.tsx` - Color picker, font selector, tone/style options
- `app/components/settings/BrandPreview.tsx` - Preview how brand kit affects sections

**Integration**:
- Modify AI service to include brand kit parameters in generation prompt
- Pass brand colors/fonts to AI for CSS customization
- Auto-apply brand kit to templates when enabled

---

#### Feature 3: Generation History Viewer

**Description**: Track all generated sections with ability to view, reuse, and rollback

**Capabilities**:
- View list of all generated sections (reverse chronological)
- Filter by date, prompt keyword, theme
- Preview historical code
- Reuse historical section (re-save to theme)
- Compare versions (diff view)
- Delete history entries

**Data Model**:
```prisma
model GenerationHistory {
  id          String   @id @default(uuid())
  shop        String
  prompt      String
  code        String   // Generated Liquid code
  themeId     String?  // Theme it was saved to (if saved)
  themeName   String?
  fileName    String?

  // Generation metadata
  aiModel     String   @default("gemini-2.0-flash-exp")
  tone        String?  // If advanced options used
  style       String?

  // Status
  status      String   @default("generated") // generated, saved, error
  errorMessage String?

  createdAt   DateTime @default(now())

  @@index([shop])
  @@index([createdAt])
  @@index([status])
}
```

**UI Components**:
- `app/routes/app.history.tsx` - Generation history page
- `app/components/history/HistoryList.tsx` - List view with filters
- `app/components/history/HistoryItem.tsx` - Individual history entry
- `app/components/history/HistoryPreview.tsx` - Code preview modal
- `app/components/history/HistoryDiff.tsx` - Compare two versions (optional)

---

#### Feature 4: Section Favorites/Bookmarks

**Description**: Bookmark best-performing sections for quick access

**Capabilities**:
- Mark template or history entry as favorite
- View all favorites in dedicated tab
- Unfavorite/remove from favorites
- Quick access from generate page (favorites sidebar)

**Data Model**:
- Add `isFavorite` boolean to `SectionTemplate` model (already in schema above)
- Add `isFavorite` boolean to `GenerationHistory` model

**UI Components**:
- `app/components/generate/FavoritesSidebar.tsx` - Quick access to favorites (optional)
- Favorites tab in template library
- Favorites tab in history viewer

---

#### Feature 5: Enhanced Export Options

**Description**: Export sections in multiple formats for portability

**Capabilities**:
- Download as .liquid file (already implemented in Phase 03)
- Export as JSON (schema + code + metadata)
- Export as ZIP (with assets if any)
- Export multiple sections at once (batch)
- Import section from JSON (future)

**UI Components**:
- `app/components/generate/ExportOptions.tsx` - Export format selector
- Update `CodePreview.tsx` to include export options

---

### Non-Functional Requirements

1. **Performance**:
   - Template library pagination (20 templates per page)
   - History pagination (50 entries per page)
   - Database indexes on frequently queried fields

2. **Security**:
   - Shop-scoped data (merchants only see their own templates/history)
   - Input validation for brand kit colors (hex format)
   - Sanitize template/history search queries

3. **Code Quality**:
   - Components under 200 lines each
   - TypeScript strict mode
   - Follow existing architecture patterns

4. **Scalability**:
   - Support up to 1000 templates per merchant
   - Support up to 10000 history entries per merchant
   - Consider pagination, lazy loading, search indexing

---

## Architecture

### Route Structure

```
app/
├── routes/
│   ├── app.generate.tsx              # MODIFIED: Link to templates/history/settings
│   ├── app.templates.tsx             # NEW: Template library page
│   ├── app.templates.$id.tsx         # NEW: Template detail/edit page
│   ├── app.history.tsx               # NEW: Generation history page
│   ├── app.settings.tsx              # NEW: Brand kit settings page
│   └── api/
│       ├── templates.create.tsx      # NEW: Create template API
│       ├── templates.update.tsx      # NEW: Update template API
│       ├── templates.delete.tsx      # NEW: Delete template API
│       └── history.delete.tsx        # NEW: Delete history API
```

### Component Structure

```
app/components/
├── templates/
│   ├── TemplateLibrary.tsx
│   ├── TemplateCard.tsx
│   ├── TemplateEditor.tsx
│   └── TemplatePreview.tsx
├── history/
│   ├── HistoryList.tsx
│   ├── HistoryItem.tsx
│   ├── HistoryPreview.tsx
│   └── HistoryDiff.tsx (optional)
├── settings/
│   ├── BrandKitEditor.tsx
│   └── BrandPreview.tsx
└── generate/
    ├── ExportOptions.tsx
    └── FavoritesSidebar.tsx (optional)
```

### Database Schema Updates

**File**: `prisma/schema.prisma`

Add new models:
- `SectionTemplate`
- `BrandKit`
- Update `GenerationHistory` (already exists, add fields)

Run migration:
```bash
npx prisma migrate dev --name add-advanced-features
```

---

## Implementation Steps

### Phase 4A: Section Templates Library (6-8 hours)

**Step 1**: Update database schema
- Add `SectionTemplate` model to `prisma/schema.prisma`
- Run migration: `npx prisma migrate dev`

**Step 2**: Create template service layer
- `app/services/template.server.ts` - CRUD operations for templates

**Step 3**: Create template library route
- `app/routes/app.templates.tsx` - Main template library page
  - Loader: Fetch all templates for merchant
  - Action: Handle create/delete operations

**Step 4**: Create template components
- `TemplateLibrary.tsx` - Grid view of templates
- `TemplateCard.tsx` - Individual template card (title, description, icon, actions)
- `TemplateEditor.tsx` - Form for creating/editing templates
- `TemplatePreview.tsx` - Modal for code preview

**Step 5**: Integration with generate page
- Add "Save as Template" button to generate page
- Link to template library from generate page navigation
- Allow template selection from library (populate prompt)

**Step 6**: Testing
- Test CRUD operations (create, read, update, delete)
- Test search and filtering
- Test template selection from library

---

### Phase 4B: Brand Kit Configuration (4-5 hours)

**Step 1**: Update database schema
- Add `BrandKit` model to `prisma/schema.prisma`
- Run migration

**Step 2**: Create brand kit service layer
- `app/services/brand-kit.server.ts` - Get/update brand kit

**Step 3**: Create settings route
- `app/routes/app.settings.tsx` - Brand kit configuration page
  - Loader: Fetch brand kit for merchant (or create default)
  - Action: Update brand kit

**Step 4**: Create brand kit components
- `BrandKitEditor.tsx` - Color pickers, font selectors, tone/style options
- `BrandPreview.tsx` - Live preview of brand kit applied to sample section

**Step 5**: Integration with AI service
- Modify `ai.server.ts` to accept brand kit parameters
- Include brand colors/fonts in generation prompt
- Test generation with brand kit enforcement

**Step 6**: Testing
- Test brand kit CRUD
- Test generation with brand kit enabled/disabled
- Verify brand colors/fonts applied correctly

---

### Phase 4C: Generation History Viewer (3-4 hours)

**Step 1**: Update database schema
- Modify `GenerationHistory` model (add new fields)
- Run migration

**Step 2**: Update generation flow to save history
- Modify `app.generate.tsx` action to save history on generation
- Store prompt, code, metadata

**Step 3**: Create history route
- `app/routes/app.history.tsx` - History list page
  - Loader: Fetch paginated history
  - Action: Handle delete, reuse operations

**Step 4**: Create history components
- `HistoryList.tsx` - Paginated list with filters
- `HistoryItem.tsx` - Individual entry with timestamp, prompt preview
- `HistoryPreview.tsx` - Modal for full code preview

**Step 5**: Testing
- Test history recording on generation
- Test pagination and filtering
- Test reuse functionality

---

### Phase 4D: Favorites & Export (2-3 hours)

**Step 1**: Add favorites functionality
- Update template/history components to include favorite toggle
- Update database queries to filter by `isFavorite`

**Step 2**: Create export options
- `ExportOptions.tsx` - Format selector (Liquid, JSON, ZIP)
- Implement JSON export (include metadata)
- Implement batch export (multiple selections)

**Step 3**: Testing
- Test favorite/unfavorite operations
- Test export formats (download, filename, content)

---

## Todo List

### Phase 4A: Templates Library
- [ ] Add `SectionTemplate` model to schema
- [ ] Run Prisma migration
- [ ] Create `template.server.ts` service
- [ ] Create `app.templates.tsx` route (loader + action)
- [ ] Create `TemplateLibrary.tsx` component
- [ ] Create `TemplateCard.tsx` component
- [ ] Create `TemplateEditor.tsx` component
- [ ] Create `TemplatePreview.tsx` component
- [ ] Add "Save as Template" to generate page
- [ ] Link template library from navigation
- [ ] Test CRUD operations
- [ ] Test search/filtering

### Phase 4B: Brand Kit
- [ ] Add `BrandKit` model to schema
- [ ] Run Prisma migration
- [ ] Create `brand-kit.server.ts` service
- [ ] Create `app.settings.tsx` route
- [ ] Create `BrandKitEditor.tsx` component
- [ ] Create `BrandPreview.tsx` component
- [ ] Modify `ai.server.ts` for brand kit integration
- [ ] Test brand kit CRUD
- [ ] Test generation with brand kit

### Phase 4C: History ✅ COMPLETE
- [x] Update `GenerationHistory` model
- [x] Run Prisma migration
- [x] Modify `app.generate.tsx` to save history
- [x] Create `app.history.tsx` route
- [x] Create `HistoryList.tsx` component
- [x] Create `HistoryItem.tsx` component
- [x] Create `HistoryPreview.tsx` component
- [x] Test history recording
- [x] Test pagination/filtering
- [x] Test reuse functionality

### Phase 4D: Favorites & Export
- [ ] Add favorite toggle to templates
- [ ] Add favorite toggle to history
- [ ] Create `ExportOptions.tsx` component
- [ ] Implement JSON export
- [ ] Implement batch export
- [ ] Test favorite operations
- [ ] Test export formats

---

## Success Criteria

**Phase 4A: Templates Library**:
- ✅ Merchants can create, edit, delete templates
- ✅ Template library browsable by category
- ✅ Search/filter functional
- ✅ Template selection populates generate prompt

**Phase 4B: Brand Kit**:
- ✅ Merchants can configure brand colors, fonts, tone, style
- ✅ Brand kit preview shows sample section with applied brand
- ✅ Generation incorporates brand kit when enabled
- ✅ Generated sections match brand colors/fonts

**Phase 4C: History**:
- ✅ All generations recorded in history
- ✅ History browsable with pagination
- ✅ Filters work (date, prompt keyword, status)
- ✅ Reuse functionality works (re-save historical section)

**Phase 4D: Favorites & Export**:
- ✅ Favorite/unfavorite templates and history
- ✅ Favorites accessible from dedicated view
- ✅ Export formats work (Liquid, JSON, ZIP)
- ✅ Batch export functional

---

## Risk Assessment

**High Risk**:
- Database migrations (schema changes require careful testing)
- AI service modification (brand kit integration may affect generation quality)
- Pagination performance (large datasets require optimization)

**Medium Risk**:
- Template management complexity (many CRUD operations)
- Brand kit UI (color picker, font selector complexity)
- History storage (may grow large over time)

**Mitigation**:
- Backup database before migrations
- Test brand kit integration thoroughly (may require prompt tuning)
- Implement pagination from start (not retroactive)
- Add database indexes for performance
- Consider history retention policy (auto-delete after 90 days?)

---

## Security Considerations

**Data Isolation**:
- All queries scoped to `shop` (merchants see only their data)
- Validate shop parameter in all loaders/actions
- Prevent cross-shop data access

**Input Validation**:
- Brand kit colors: Validate hex format (#RRGGBB)
- Template titles/descriptions: Length limits, XSS prevention
- Search queries: Sanitize to prevent SQL injection (Prisma handles this)

**Rate Limiting** (Future):
- Limit template creation (e.g., 100 templates per merchant)
- Limit history storage (e.g., 10000 entries per merchant)

---

## Next Steps

**Decision Point**: Evaluate Phase 04 necessity before starting
- Review user feedback from Phases 01-03
- Assess competitive landscape (are advanced features needed for differentiation?)
- Estimate development time vs. business value

**If Proceeding**:
1. Start with Phase 4A (Templates Library) - highest user value
2. Follow with Phase 4B (Brand Kit) - competitive differentiator
3. Add Phase 4C (History) if time permits
4. Phase 4D (Favorites/Export) lowest priority

**If Skipping Phase 04**:
1. Mark redesign project complete
2. Update documentation (codebase summary, architecture)
3. Plan next major feature (separate project)

---

## Future Enhancements (Beyond Phase 04)

- **Collaborative Workflows**: Multi-user template approval/review
- **A/B Testing Integration**: Track section performance, test variants
- **Multi-Language Support**: Generate sections in multiple languages
- **Section Analytics**: Track usage, performance metrics
- **API Access**: Allow external tools to access templates/history
- **Template Marketplace**: Public templates shared across merchants
- **Version Control**: Git-style branching/merging for sections
- **Visual Editor**: Drag-drop section builder (no-code alternative to AI)

---

**Phase Status**: Optional - implement only if strategic value confirmed
