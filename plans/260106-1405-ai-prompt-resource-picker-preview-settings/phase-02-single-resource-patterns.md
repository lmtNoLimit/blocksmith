---
phase: 2
title: "Single Resource Rendering Patterns"
status: pending
effort: 45min
---

# Phase 2: Single Resource Rendering Patterns

## Objective
Add `=== RESOURCE PICKER PATTERNS ===` section with conditional rendering for single resource types.

## Location
Insert after preview_settings section (Phase 1), before CSS RULES.

## Content to Add

```
=== RESOURCE PICKER PATTERNS ===

SINGLE RESOURCE (conditional required - like images):

Product picker:
{% if section.settings.product %}
  <h2>{{ section.settings.product.title }}</h2>
  <p>{{ section.settings.product.price | money }}</p>
  {% if section.settings.product.featured_image %}
    {{ section.settings.product.featured_image | image_url: width: 600 | image_tag }}
  {% endif %}
{% else %}
  <p>Select a product</p>
{% endif %}

Collection picker:
{% if section.settings.collection %}
  <h2>{{ section.settings.collection.title }}</h2>
  <p>{{ section.settings.collection.products_count }} products</p>
{% else %}
  <p>Select a collection</p>
{% endif %}

Article picker:
{% if section.settings.article %}
  <h2>{{ section.settings.article.title }}</h2>
  <p>{{ section.settings.article.excerpt }}</p>
  <span>{{ section.settings.article.published_at | date: "%B %d, %Y" }}</span>
{% else %}
  <p>Select an article</p>
{% endif %}

Blog picker:
{% if section.settings.blog %}
  <h2>{{ section.settings.blog.title }}</h2>
  <p>{{ section.settings.blog.articles_count }} articles</p>
{% else %}
  <p>Select a blog</p>
{% endif %}

Page picker:
{% if section.settings.page %}
  <div>{{ section.settings.page.content }}</div>
{% else %}
  <p>Select a page</p>
{% endif %}

Key properties available:
- product: title, handle, price, compare_at_price, available, featured_image, variants, tags
- collection: title, handle, description, image, products, products_count
- article: title, excerpt, content, author, published_at, image, url, blog
- blog: title, handle, articles, articles_count, url
- page: title, handle, content, url
```

## Implementation Steps
1. After Phase 1 content
2. Add resource picker patterns section
3. Include all 5 single resource types
4. Show property reference for each

## Validation
- All patterns use conditional check ({% if %})
- Else clause provides fallback message
- Common properties documented per type
- Nested image checks where applicable (product.featured_image)
