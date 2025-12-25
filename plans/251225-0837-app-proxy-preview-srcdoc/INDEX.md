# srcDoc Preview Implementation Index

**Date**: 2025-12-25
**Status**: Ready for Implementation

---

## Plan Documents

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **plan.md** | Overview & decision | 3 min |
| **phase-01-update-app-proxy-preview-frame.md** | Component refactor | 5 min |
| **phase-02-add-html-sanitization.md** | Security hardening | 5 min |
| **phase-03-testing-validation.md** | Test checklist | 5 min |

## Research Documents

| Document | Purpose |
|----------|---------|
| **research/researcher-01-iframe-cors.md** | Browser CORS/CSP constraints |
| **research/researcher-02-srcdoc-implementation.md** | srcDoc patterns & security |

---

## File Structure

```
plans/251225-0837-app-proxy-preview-srcdoc/
├── INDEX.md                  ← You are here
├── plan.md                   ← Main plan (start here)
├── phase-01-*.md             ← Component update
├── phase-02-*.md             ← Security (DOMPurify)
├── phase-03-*.md             ← Testing
└── research/
    ├── researcher-01-*.md    ← CORS research
    └── researcher-02-*.md    ← srcDoc research
```

---

## Key Files to Modify

| File | Change |
|------|--------|
| `app/components/preview/AppProxyPreviewFrame.tsx` | Use srcDoc + hook |
| `app/routes/api.preview.render.tsx` | Add DOMPurify |

---

## Quick Start

1. Read `plan.md` for overview
2. Follow `phase-01-*.md` → `phase-02-*.md` → `phase-03-*.md`
3. Validate against checklist in phase-03

---

## Estimated Time

| Phase | Time |
|-------|------|
| Phase 01 | 1 hour |
| Phase 02 | 30 min |
| Phase 03 | 30 min |
| **Total** | **2 hours** |
