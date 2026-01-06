# Research: Shopify image_picker Setting Type for Theme Sections

**Research Date:** 2026-01-05
**Source:** Shopify Developer Documentation
**Status:** Complete

---

## Overview

`image_picker` is a specialized input setting type in Shopify themes that outputs an image picker field. It allows merchants to select images from Files in Shopify Admin or upload new images directly within the theme editor.

---

## 1. How image_picker Works in Section Schemas

### Schema Definition
```json
{
  "type": "image_picker",
  "id": "background_image",
  "label": "Background Image"
}
```

### Where It Can Be Used
- Section settings via `{% schema %}`
- Block settings via `{% schema %}`
- Global theme settings via `settings_schema.json`

### Standard Attributes
- `type` (required): "image_picker"
- `id` (required): Setting identifier for access
- `label` (required): Display label in theme editor
- `info` (optional): Informational text about the setting

### Key Limitations
- **No `default` attribute support** - image_picker settings cannot have default values
- **Not preset-updated** - image_picker values persist across preset switches
- Preset-based images cannot be pre-configured

---

## 2. Expected Liquid Output Format

### Accessing image_picker Settings

| Context | Syntax |
|---------|--------|
| Global theme settings | `{{ settings.image_id }}` |
| Section settings | `{{ section.settings.image_id }}` |
| Block settings | `{{ block.settings.image_id }}` |

### Data Type Returned
Returns one of two formats:
1. **Image object** - When an image is selected
2. **nil** - When no selection made or selection no longer exists

### Rendering the Image

**With focal point respect (recommended):**
```liquid
{{ section.settings.background_image | image_url: width: 1500 | image_tag }}
```

**With custom width/height:**
```liquid
{{ section.settings.background_image | image_url: width: 2000, height: 1200 | image_tag }}
```

### Image Tag Output
Generates `<img>` tag with:
- `src` - optimized image URL
- `srcset` - responsive image sizes (352w, 832w, 1200w)
- `alt` - merchant-provided alt text
- `width` / `height` attributes
- `style` attribute with `object-position` if focal point set (e.g., `style="object-position: 25% 10%"`)

---

## 3. Default Values & Placeholder Handling

### No Built-in Defaults
- `image_picker` does **not support the `default` attribute**
- Merchants must manually select images on first use
- Initial state is always nil

### Placeholder State Handling
Check for empty/nil state before rendering:

```liquid
{% if section.settings.background_image != nil %}
  {{ section.settings.background_image | image_url: width: 1500 | image_tag }}
{% else %}
  <!-- Show placeholder or fallback -->
  <div class="placeholder">No image selected</div>
{% endif %}
```

Alternative nil check:
```liquid
{% if section.settings.background_image %}
  <!-- Image exists -->
{% endif %}
```

---

## 4. Displaying Images When No Image Is Selected

### Approach 1: Conditional Placeholder
```liquid
{% if section.settings.hero_image %}
  {{ section.settings.hero_image | image_url: width: 2048 | image_tag }}
{% else %}
  <div class="image-placeholder">
    <p>Hero image not selected</p>
  </div>
{% endif %}
```

### Approach 2: SVG Placeholder Filter
```liquid
{% unless section.settings.logo %}
  {{ 'image' | placeholder_svg_tag: 'placeholder-svg' }}
{% endunless %}
```

### Approach 3: CSS Placeholder with object-fit
```liquid
<div class="image-container">
  {% if section.settings.image %}
    {{ section.settings.image | image_url: width: 500 | image_tag }}
  {% else %}
    <!-- Empty div with CSS background -->
  {% endif %}
</div>

{% stylesheet %}
.image-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
{% endstylesheet %}
```

---

## 5. Image Focal Points

### What Are Focal Points?
Position merchants want to remain visible when image is cropped/adjusted.

### Using Focal Points
**The `image_tag` filter automatically applies focal points:**
```liquid
{{ section.settings.image | image_url: width: 1500 | image_tag }}
```

Output includes:
```html
<img ... style="object-position: 25% 10%;" />
```

### Accessing Focal Point Data Directly
```liquid
{{ section.settings.image.presentation.focal_point }}
```

### CSS Container Best Practice
Pair with `object-fit: cover` for proper focal point respect:
```css
.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--focal-point);
}
```

---

## 6. Best Practices for Implementation

### 1. Always Check for nil
```liquid
{% if section.settings.image != nil %}
  <!-- Render image -->
{% endif %}
```

### 2. Use image_url + image_tag Combo
Provides responsive images, alt text, focal point support, and proper srcset.

### 3. Responsive Images with Widths
```liquid
{{ section.settings.image | image_url: width: 1500 | image_tag }}
```

### 4. Respect Focal Points in CSS
```css
.image-container img {
  object-fit: cover;
  object-position: inherit; /* Keeps image_tag's focal point */
}
```

### 5. Container Sizing
```html
<div class="image-wrapper" style="aspect-ratio: 16/9; overflow: hidden;">
  {% if section.settings.image %}
    {{ section.settings.image | image_url: width: 800 | image_tag }}
  {% endif %}
</div>
```

### 6. No Static Images in Defaults
Since `default` isn't supported, provide clear UI hints or example text to merchants about expected image dimensions.

### 7. Alt Text from Settings
Merchants can add alt text via the image picker UI. Access it:
```liquid
{{ section.settings.image.alt }}
```

---

## Summary

**Key Takeaways:**
- Returns `image` object or `nil` (no default support)
- Access via `settings`, `section.settings`, or `block.settings`
- Always check for nil before rendering
- Use `image_url` + `image_tag` filters for best results
- Focal points auto-apply via `image_tag` filter
- No placeholder images - merchants must select manually
- Pair with CSS `object-fit: cover` for responsive display

**Critical Limitations:**
- No default images
- Not preset-updated
- Requires explicit nil handling in templates

---

**Document Status:** Ready for implementation reference
