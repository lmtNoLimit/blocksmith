# Scout Report: Image Picker Implementation in Codebase

**Date:** 2026-01-05
**Focus:** Current image_picker implementation, settings handling, preview rendering

## Executive Summary

The codebase has partial image_picker support. `buildInitialState()` sets `'placeholder'` string for image_picker types. `ImageSetting.tsx` displays image preview UI with change/remove buttons. `ImagePickerModal.tsx` fetches from Shopify Files API. **Issue:** The preview rendering doesn't properly handle placeholder state—sections with images show nothing until user selects an image.

## Key Files Identified

### Schema Parsing
- `app/components/preview/schema/parseSchema.ts` (Lines 193-196)
  - `buildInitialState()` sets `state[setting.id] = 'placeholder'` for image_picker
  - Returns string `'placeholder'`, not an image object or nil

### Settings UI Components
- `app/components/preview/settings/ImageSetting.tsx`
  - Shows image preview when `value` exists
  - Empty state: dashed border, "Select" button
  - Clears to empty string `onChange('')` (not nil)

- `app/components/preview/settings/ImagePickerModal.tsx`
  - Fetches images from `/api/files` endpoint
  - Returns image URL string on selection
  - Uses custom events for cross-component communication

### Settings Panel
- `app/components/preview/settings/SettingsPanel.tsx`
  - Renders settings controls based on type
  - Passes value to ImageSetting component
  - Reset reuses `buildInitialState()`

### Preview Rendering
- `app/components/preview/PreviewFrame.tsx` (Lines 89-122)
  - Handles broken images via `handleImageError()`
  - Applies inline SVG placeholder for failed images
  - MutationObserver replaces broken `<img>` src with placeholder
  - CSS class `.placeholder-image` with dashed border

### Settings Transform (App Proxy)
- `app/utils/settings-transform.server.ts`
  - Converts settings to Liquid assigns: `{% assign settings_image = 'value' %}`
  - String values (including 'placeholder') passed as-is
  - No special handling for image_picker type

### Default Templates
- `app/data/default-templates.ts` (Lines 328-337)
  - Shows correct pattern: `{% if section.settings.image %} ... {% else %} placeholder_svg_tag {% endif %}`
  - Uses `image_url` filter for actual images
  - Falls back to `{{ 'lifestyle-1' | placeholder_svg_tag: 'class' }}`

### AI System Prompt
- `app/services/ai.server.ts` (Lines 50-51, 140-141)
  - Documents: "image_picker: Returns image object. NO default supported"
  - Example: `{"type": "image_picker", "id": "image", "label": "Image"}`
  - **Missing:** No instruction for placeholder handling in generated markup

## Problem Analysis

### Current Behavior
1. Schema parsed → `buildInitialState()` → `image: 'placeholder'`
2. Settings panel shows "Select" button (correct for empty state)
3. Preview receives `settings_image = 'placeholder'` string
4. Generated Liquid: `{{ settings_image | image_url: width: 1200 }}` fails
5. Broken image → PreviewFrame applies SVG fallback (hacky)

### Expected Behavior (Per User Request)
1. Schema parsed → initial state indicates "no image selected"
2. Settings panel shows empty state with "Select" button
3. Preview shows **placeholder image** visually (SVG or styled div)
4. User selects image → value becomes actual URL
5. Preview shows selected image
6. Settings saved with real image URL (not 'placeholder')

### Root Causes

1. **Initial State Mismatch**
   - `buildInitialState()` returns `'placeholder'` string
   - Should return empty string `''` or `null` to match Shopify's nil

2. **AI-Generated Code Missing Conditionals**
   - AI prompt doesn't require `{% if image %}` checks
   - Generated code assumes image always exists
   - No fallback to `placeholder_svg_tag`

3. **Preview Transformation Gap**
   - `settings-transform.server.ts` passes 'placeholder' as literal string
   - App Proxy Liquid receives invalid image URL
   - No server-side detection of placeholder state

4. **No Placeholder in Live Preview**
   - When settings_image is empty/null, section renders nothing
   - No visual placeholder shown before image selection

## Related Components

| Component | File | Purpose |
|-----------|------|---------|
| parseSchema | `app/components/preview/schema/parseSchema.ts` | Build initial settings state |
| ImageSetting | `app/components/preview/settings/ImageSetting.tsx` | Image picker UI in settings panel |
| ImagePickerModal | `app/components/preview/settings/ImagePickerModal.tsx` | Modal for selecting images |
| PreviewFrame | `app/components/preview/PreviewFrame.tsx` | Iframe preview with error handling |
| settings-transform | `app/utils/settings-transform.server.ts` | Convert settings to Liquid assigns |
| AI prompt | `app/services/ai.server.ts` | System instructions for code generation |

## Recommended Changes

### Phase 1: Fix Initial State
- Change `buildInitialState()` to return `''` (empty string) for image_picker
- Aligns with Shopify's nil behavior

### Phase 2: Update AI Prompt
- Add instruction for conditional image rendering
- Require `{% if image %} ... {% else %} placeholder {% endif %}` pattern
- Include `placeholder_svg_tag` fallback in examples

### Phase 3: Preview Placeholder Support
- Detect empty image settings in transform layer
- Inject placeholder HTML/SVG when image is blank
- Style placeholder consistently with PreviewFrame

### Phase 4: Settings Save Flow
- Ensure empty string saved when no image (not 'placeholder')
- Clear image properly returns to empty state
