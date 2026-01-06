# Shopify Liquid Schema Resource Pickers & Preview Settings

**Date:** 2026-01-06 | **Status:** Complete

## Schema Resource Picker Types

Shopify theme schema supports 5 primary resource-based input setting types:

| Type | Returns | Usage | Accessible As |
|------|---------|-------|---|
| `product` | Single product object | Featured product, selector | `section.settings.product` |
| `collection` | Single collection object | Featured collection, grid source | `section.settings.collection` |
| `article` | Single article object | Blog post feature | `section.settings.article` |
| `blog` | Single blog object | Blog feed, articles container | `section.settings.blog` |
| `page` | Single page object | Info block reference | `section.settings.page` |

**List variants** also exist: `product_list`, `collection_list` (for multiple selections with pagination).

## Resource Object Properties

### Product
- `title`, `handle`, `price`, `available`, `featured_image`, `variants`, `tags`, `type`

### Collection
- `title`, `handle`, `description`, `image`, `products` (paginated, 50 max per loop)

### Article
- `title`, `body`, `author`, `published_at`, `image`, `blog` (returns parent blog)

### Blog
- `title`, `handle`, `articles` (paginated, 50 max per loop)

### Page
- `title`, `body`, `handle`

## Preview Settings Configuration

**Key Pattern**: `preview_settings` array in section/block schema enables theme editor preview data.

```json
{
  "type": "product",
  "id": "featured_product",
  "label": "Product",
  "preview_settings": {
    "product": 123456789
  }
}
```

### Single Resource Preview
- Specify the Shopify resource ID (numeric or string handle)
- Merchant sees placeholder during theme editor without preset data
- Only works with resources defined in same section

### Multiple Resources (Lists)
- `preview_settings` uses array of IDs for `product_list`/`collection_list`
- Limited to 3-5 items for preview performance

### Resource Relationships Handling

**Blog → Articles**:
- Access via `section.settings.blog.articles`
- Requires pagination in loops (50 item limit)
- Articles automatically filtered to selected blog

**Collection → Products**:
- Access via `section.settings.collection.products`
- Pagination required for > 50 items
- Products member of collection only

## Best Practices

1. **Always provide defaults**: Set `default` for resource pickers to prevent empty renders
2. **Use closest pattern**: For nested blocks, reference `{{ closest.product }}` instead of deeply nested paths
3. **Pagination in loops**: When accessing `collection.products` or `blog.articles`, wrap in `{% paginate %}` if expecting > 50
4. **Preview data optional**: Don't over-specify preview settings; theme editor handles gracefully
5. **Single vs Multiple**: Use singular types for single picker, `*_list` types for multiple selections

## Implementation Patterns

```liquid
{
  "name": "Featured Product Section",
  "settings": [
    {
      "type": "product",
      "id": "selected_product",
      "label": "Choose Product",
      "default": ""
    },
    {
      "type": "collection",
      "id": "collection_grid",
      "label": "Browse Collection",
      "default": ""
    },
    {
      "type": "blog",
      "id": "blog_feed",
      "label": "Blog Feed",
      "default": ""
    },
    {
      "type": "article",
      "id": "featured_article",
      "label": "Feature Article",
      "default": ""
    },
    {
      "type": "page",
      "id": "info_page",
      "label": "Info Page",
      "default": ""
    }
  ]
}
```

## Rendering with Resource Pickers

```liquid
{% if section.settings.selected_product %}
  <h2>{{ section.settings.selected_product.title }}</h2>
  <p>Price: {{ section.settings.selected_product.price | money }}</p>
{% endif %}

{% for article in section.settings.blog.articles %}
  <h3>{{ article.title }}</h3>
  <p>{{ article.summary }}</p>
{% endfor %}
```

## Unresolved Questions

- Does preview_settings support dynamic IDs (fetched from API)?
- What performance overhead for accessing blog.articles on large blogs (1000+ posts)?
- Can resource pickers use metafield filtering in editor?
