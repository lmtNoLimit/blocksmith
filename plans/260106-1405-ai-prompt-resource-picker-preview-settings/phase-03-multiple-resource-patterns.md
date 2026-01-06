---
phase: 3
title: "Multiple Resource Iteration Patterns"
status: pending
effort: 45min
---

# Phase 3: Multiple Resource Iteration Patterns

## Objective
Add resource list iteration patterns and relationship handling (blog→articles, collection→products).

## Location
Append to RESOURCE PICKER PATTERNS section from Phase 2.

## Content to Add

```
RESOURCE LISTS (iteration required):

Product list (direct selection):
{% if section.settings.product_list.size > 0 %}
  <div class="ai-products">
    {% for product in section.settings.product_list %}
      <div class="ai-product-card">
        <h3>{{ product.title }}</h3>
        <p>{{ product.price | money }}</p>
      </div>
    {% endfor %}
  </div>
{% else %}
  <p>Select products</p>
{% endif %}

Collection list:
{% if section.settings.collection_list.size > 0 %}
  {% for collection in section.settings.collection_list %}
    <a href="{{ collection.url }}">{{ collection.title }}</a>
  {% endfor %}
{% endif %}

RELATIONSHIP PATTERNS:

Collection → Products (most common for grids/carousels):
{% if section.settings.collection %}
  {% for product in section.settings.collection.products limit: 12 %}
    <div class="ai-product-card">
      <h3>{{ product.title }}</h3>
    </div>
  {% endfor %}
{% else %}
  <p>Select a collection</p>
{% endif %}

Blog → Articles (for article feeds):
{% if section.settings.blog %}
  {% for article in section.settings.blog.articles limit: 6 %}
    <article>
      <h3>{{ article.title }}</h3>
      <p>{{ article.excerpt }}</p>
    </article>
  {% endfor %}
{% else %}
  <p>Select a blog</p>
{% endif %}

PAGINATION (for large lists):
{% if section.settings.collection %}
  {% paginate section.settings.collection.products by 50 %}
    {% for product in section.settings.collection.products %}
      <!-- render product -->
    {% endfor %}
    {{ paginate | default_pagination }}
  {% endpaginate %}
{% endif %}

Limits:
- collection.products: 50 per page without pagination
- blog.articles: 50 per page without pagination
- product_list/collection_list: max 50 items
- Use limit filter for performance: {% for item in list limit: 12 %}
```

## Implementation Steps
1. Append to resource picker patterns section
2. Add list iteration examples
3. Add relationship patterns (collection.products, blog.articles)
4. Include pagination guidance

## Validation
- Size check before iteration ({% if list.size > 0 %})
- Limit filter shown for performance
- Pagination example for large datasets
- Both direct lists and relationships covered
