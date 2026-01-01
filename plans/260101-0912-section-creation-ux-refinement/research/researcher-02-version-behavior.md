# Version Application Behavior Research

## Overview
Versions in this codebase are derived from chat conversation snapshots (CodeVersion interface). Each AI-generated code response creates a new version, stored via `codeSnapshot` in UIMessage entities.

## 1. Version Storage & Management

**Storage Model:**
- Versions = Messages with `codeSnapshot` field in Conversation
- Version number calculated as 1-indexed count of messages with codeSnapshots
- No separate version table—versions are chat artifacts
- Each version tied to specific message ID and creation timestamp

**Data Persistence:**
- Versions persist in database via Conversation messages
- Draft section code lives in Section.code field
- When page reloads, all versions reload from conversation history
- No client-side session storage—server-sourced from loader

## 2. Version Selection UI

**VersionCard Component:**
- Props: `versionNumber`, `createdAt`, `isActive`, `isSelected`, `onPreview()`, `onRestore()`
- Two distinct states:
  - `isActive`: version is current active draft (one only)
  - `isSelected`: currently previewing this version (temporary state)
- Actions:
  - Preview button (eye icon): temporary preview without applying
  - Restore button (reset icon): applies version with dirty check

**VersionBadge Component:**
- Small inline badge showing version number
- Shows "latest" tag for most recent
- Clickable to select for preview
- Used in message threads for quick version access

## 3. Auto-Application of Latest Version

**Behavior: NOT auto-applied by default**
- Latest version is marked visually ("latest" badge) but not auto-selected
- User must explicitly click Preview or Restore to switch versions
- Current active version shows "Active" badge on VersionCard
- Conversation history shows all versions; user chooses which to work with

## 4. Reload Behavior

**On Page Reload:**
- Loader fetches section + full conversation with all messages
- All versions rebuild from conversation history
- Previously selected version state is lost (no localStorage persistence)
- User returns to latest/active version view
- No query params track selected version (stateless design)

## 5. Draft Application Flow

**Version → Draft Pipeline:**
1. User clicks Preview: temporary preview mode, no draft change
2. User clicks Restore: applies selected version to current draft
3. saveDraft action (form submission):
   - Updates Section.code with current editor content
   - Sets status = DRAFT
   - Creates new version if code changed
4. No intermediate "apply" step—restore directly modifies working draft

**Constraints:**
- Only one active version at a time
- Restore triggers dirty-check (likely in editor)
- Draft persists via Section.code, not version table
- Version history is immutable

## State Management Pattern

- Client state: `selectedVersion` (current preview), `isActive` (true version)
- Server state: Section.code (working draft), Conversation.messages (version history)
- No Redux/Zustand observed—React hooks + form submissions
- Unidirectional: chat → versions → draft update

## Key Findings

1. **Versions are immutable artifacts** of AI responses, not editable versions
2. **No auto-application**—latest must be explicitly selected
3. **Stateless preview mode**—page reload resets to active version
4. **Single source of truth**: Conversation messages store all versions
5. **Draft = Section.code**; versions are separate read-only snapshots

## Unresolved Questions

- Where is dirty-check logic implemented for restore action?
- Is there version comparison UI (diff view)?
- What happens if user restores old version then regenerates?
- Does version numbering reset on section re-open or increment globally?
