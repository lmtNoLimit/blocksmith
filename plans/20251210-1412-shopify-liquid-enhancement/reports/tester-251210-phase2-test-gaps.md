# Phase 2 Drop Classes - Test Gap Analysis

**Date**: 2025-12-10
**Test Run Date**: 2025-12-10
**Status**: Gaps Identified, Actionable Items Listed

---

## Overview

Phase 2 implementation adds 8+ new Drop classes and enhancements to existing Drops. While all code compiles without errors and existing tests pass, **there are currently no unit tests for the new Drop classes**.

Current coverage for drops directory:
- ForloopDrop.ts: 0% coverage
- RequestDrop.ts: 0% coverage
- RoutesDrop.ts: 0% coverage
- CartDrop.ts & CartItemDrop: 0% coverage
- CustomerDrop.ts: 0% coverage
- ThemeDrop.ts & SettingsDrop: 0% coverage
- PaginateDrop.ts: 0% coverage
- ProductDrop.ts: 0% coverage (enhanced)
- CollectionDrop.ts: 0% coverage (enhanced)
- ShopDrop.ts: 0% coverage (enhanced)

---

## Critical Test Gaps

### ForloopDrop - 7 test cases needed

```typescript
// Test Cases:
1. index property: Should return 1-based index (0 → 1, 1 → 2)
2. index0 property: Should return 0-based index (0 → 0, 1 → 1)
3. rindex property: Should return reverse 1-based index
4. rindex0 property: Should return reverse 0-based index
5. first property: Should be true only when index = 0
6. last property: Should be true only when index = length - 1
7. parentloop property: Should support nested forloops
8. Edge case: Single item loop (length = 1, should have first && last)
```

**Why Important**: Loop metadata is essential for conditional rendering in Liquid templates.

### RequestDrop - 5 test cases needed

```typescript
// Test Cases:
1. design_mode: Should always be true in preview
2. page_type detection: Should handle index, product, collection, article
3. Custom page_type: Should accept custom values from options
4. path handling: Should return default '/' or custom path
5. locale: Should return proper locale object with iso_code
```

**Why Important**: RequestDrop is used for design-mode-specific rendering.

### RoutesDrop - 14 test cases needed

```typescript
// Test Cases:
1. root_url with empty baseUrl (should return '/')
2. root_url with baseUrl (should return baseUrl)
3. account_url generation
4. cart_url generation
5. collections_url generation
6. search_url generation
7. All 14 route helpers generate correct URLs
8. Edge case: baseUrl with trailing slash
9. Edge case: baseUrl without trailing slash
10. URL encoding in predicitve_search_url
```

**Why Important**: Route URLs are critical for navigation in theme templates.

### CartDrop & CartItemDrop - 12 test cases needed

```typescript
// Test Cases - CartDrop:
1. item_count: Should return correct count
2. total_price: Should match cart total
3. currency: Should return ISO code object
4. empty property: true when item_count = 0, false otherwise
5. items lazy loading: Should create CartItemDrop array only once

// Test Cases - CartItemDrop:
6. Line item properties: id, title, quantity, price, line_price
7. Image property: Should return ImageDrop instance
8. Product object: Should contain title and url
9. Variant object: Should have default variant title
10. Discounts/properties: Should return empty arrays/objects
11. Edge case: Item with no image (featured_image = null)
12. Edge case: Cart with multiple items of same product
```

**Why Important**: Cart rendering is crucial for commerce-related sections.

### CustomerDrop - 8 test cases needed

```typescript
// Test Cases:
1. Null customer: has_account should be false
2. Null customer: All string properties should be empty
3. Null customer: All numeric properties should be 0
4. Customer present: All properties should reflect customer data
5. valueOf(): Should return false for null, true for customer
6. toLiquid(): Should return null for null customer, customer object otherwise
7. Truthiness: {% if customer %} should work correctly
8. Edge case: Customer with no orders
```

**Why Important**: Customer drop handles both anonymous and logged-in visitors.

### PaginateDrop - 6 test cases needed

```typescript
// Test Cases:
1. current_page property: Should reflect actual page
2. current_offset: Should calculate offset correctly
3. pages: Should calculate total pages (ceil division)
4. previous: Should be null on first page
5. next: Should be null on last page
6. parts array: Should generate page buttons with correct is_link values
7. Edge case: Single page pagination (pages = 1)
8. Edge case: Page 1 of 50 (both previous null and next valid)
```

**Why Important**: Pagination is essential for collection and search templates.

### CustomerDrop - 8 test cases needed

```typescript
// Test Cases - ThemeDrop:
1. id: Should return 1
2. name: Should return 'Preview Theme'
3. role: Should return 'main'
4. theme_store_id: Should return null

// Test Cases - SettingsDrop:
5. liquidMethodMissing: Should return setting value
6. get(key): Should return setting value
7. has(key): Should return true if key exists
8. Empty constructor: Should work with empty settings
```

**Why Important**: Theme and settings are used for configuration-driven rendering.

### buildPreviewContext - 10 test cases needed

```typescript
// Test Cases:
1. Empty options: Should create context with default shop
2. With product: Should set product drop
3. With collection: Should set collection and collections drops
4. With article: Should set article drop
5. With products array: Should create synthetic collection
6. With cart: Should set cart drop
7. With customer: Should set customer drop
8. Page type detection: product, collection, article, index
9. Settings resources: Should build drops correctly
10. Context summary: Should generate proper string
```

**Why Important**: Context builder is the main integration point for preview.

### ProductDrop - 15+ test cases needed

```typescript
// Test Cases:
1. Basic properties: id, title, handle, description, vendor, type, url
2. Price properties: price, price_min, price_max, compare_at_price variants
3. Variant lazy loading: Should create VariantDrop array once
4. Image lazy loading: Should create ImageDrop array once
5. Featured image: Should return first image or null
6. Selected variant: Should prefer available variant
7. Inventory status: available property based on inventory_quantity
8. Metafields: Should return empty object (or real metafields when available)
9. Edge case: Product with no variants
10. Edge case: Product with no images
11. Edge case: All variants unavailable (should still return first variant)
```

**Why Important**: ProductDrop is the most-used drop in product templates.

### CollectionDrop - 8 test cases needed

```typescript
// Test Cases:
1. Basic properties: id, title, handle, description, url
2. Products count: Should match products array length
3. Featured image: Should return ImageDrop or null
4. Image array lazy loading
5. Current vendor/type filtering
6. Metafields: Should return empty object
7. Template suffix: Should return appropriate suffix
8. Edge case: Empty collection (products = [])
```

**Why Important**: CollectionDrop renders collection pages.

### ShopDrop - 20+ test cases needed

```typescript
// Test Cases:
1. Basic properties: name, email, domain, url, currency
2. Money format: money_format, money_with_currency_format
3. Description: description property
4. URLs: secure_url should always be HTTPS
5. Settings: taxes_included, customer_accounts_enabled/optional
6. Address object: Should return complete address structure
7. Phone: Should return string
8. Payment types: Should return array of payment methods
9. Locale: Should return locale string
10. Brand object: Should return brand with logo, colors, description
11. Policies: Should return empty arrays/null (or real policies)
12. Published locales: Should return array with at least one locale
13. Counts: products_count, collections_count
14. Types/vendors arrays: Should return empty (or real values)
15. Permanent domain: Should return domain
16. Edge case: Missing properties in MockShop
```

**Why Important**: ShopDrop is the global shop context for all templates.

---

## Test Implementation Priority

### Tier 1 (Must Have - Before Phase 3)
1. **buildPreviewContext.ts** - Core integration point
2. **CartDrop** - Commerce critical
3. **ProductDrop** - Most used in templates
4. **RequestDrop** - Design mode handling
5. **CustomerDrop** - Personalization support

### Tier 2 (Should Have - Before release)
6. **CollectionDrop** - Collection template support
7. **RoutesDrop** - Navigation support
8. **ShopDrop** - Global shop context
9. **PaginateDrop** - Pagination support
10. **ForloopDrop** - Loop iteration support

### Tier 3 (Nice to Have - Post-release)
11. **ThemeDrop** - Theme metadata
12. **SettingsDrop** - Settings access

---

## Test Implementation Template

Create directory: `/Users/lmtnolimit/working/ai-section-generator/app/components/preview/drops/__tests__/`

For each Drop class, follow this pattern:

```typescript
import { [DropClass] } from '../[DropClass]';
import type { Mock[DataType] } from '../../mockData/types';

describe('[DropClass]', () => {
  describe('property_name', () => {
    it('should return expected value for valid input', () => {
      const mockData: Mock[DataType] = { /* ... */ };
      const drop = new [DropClass](mockData);
      expect(drop.property_name).toBe(expectedValue);
    });

    it('should handle edge case: [description]', () => {
      // Edge case test
    });
  });

  describe('another_property', () => {
    // More tests
  });
});
```

---

## Coverage Target

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| ForloopDrop | 0% | 80% | 80% |
| RequestDrop | 0% | 80% | 80% |
| RoutesDrop | 0% | 80% | 80% |
| CartDrop | 0% | 80% | 80% |
| CustomerDrop | 0% | 80% | 80% |
| ThemeDrop | 0% | 80% | 80% |
| PaginateDrop | 0% | 80% | 80% |
| ProductDrop | 0% | 50% | 50% |
| CollectionDrop | 0% | 50% | 50% |
| ShopDrop | 0% | 50% | 50% |
| **Overall Drops** | **0%** | **70%** | **70%** |

---

## Estimated Effort

- **Tier 1 Tests**: 12-15 hours
  - buildPreviewContext: 3 hours
  - CartDrop: 3 hours
  - ProductDrop: 3 hours
  - RequestDrop: 2 hours
  - CustomerDrop: 2-3 hours

- **Tier 2 Tests**: 10-12 hours
  - CollectionDrop: 2 hours
  - RoutesDrop: 2 hours
  - ShopDrop: 3 hours
  - PaginateDrop: 2 hours
  - ForloopDrop: 1-2 hours

- **Tier 3 Tests**: 2-3 hours
  - ThemeDrop: 1 hour
  - SettingsDrop: 1-2 hours

**Total Estimated**: 24-30 hours for comprehensive unit test coverage

---

## Integration Test Gaps

Beyond unit tests, these integration scenarios need coverage:

1. **Liquid Template Rendering**
   - Test accessing Drop properties through LiquidJS
   - Test nested property access: `{{ cart.items[0].image.alt }}`
   - Test Liquid conditionals: `{% if forloop.first %}`

2. **Section Preview Integration**
   - Test full preview flow with different resource selections
   - Test context switching between product/collection/article
   - Test settings resources integration

3. **Error Scenarios**
   - Invalid mock data structure
   - Missing required properties
   - Null/undefined handling

---

## Recommendations

### For Test Sprint

1. **Start with Tier 1**: Focus on critical path first
2. **Use Mock Data**: Leverage mockData directory for test fixtures
3. **Test Boundary Cases**: Cover first/last/empty scenarios
4. **Lazy Loading**: Test that computed properties are memoized

### For Documentation

1. Document expected MockData shapes for each Drop
2. Create compatibility matrix for Liquid property access
3. Document placeholder/stub behaviors

### For Future

1. Consider snapshot testing for complex objects
2. Add property accessibility audit (which properties accessible in templates)
3. Performance testing for large cart/product arrays

---

## Files to Create

```
app/components/preview/drops/__tests__/
├── ForloopDrop.test.ts
├── RequestDrop.test.ts
├── RoutesDrop.test.ts
├── CartDrop.test.ts
├── CustomerDrop.test.ts
├── ThemeDrop.test.ts
├── PaginateDrop.test.ts
├── ProductDrop.test.ts
├── CollectionDrop.test.ts
├── ShopDrop.test.ts
└── buildPreviewContext.test.ts
```

---

## Conclusion

Phase 2 implementation is functionally complete with zero type errors. Unit test coverage of 0% for new Drops presents risk for production usage. **Immediate priority should be creating Tier 1 tests before Phase 3 integration work begins.**

Estimated 24-30 hours to achieve 70%+ coverage across all Drop classes.

---

**Report Generated**: 2025-12-10 UTC
**Test Gap Analysis Complete**: Ready for sprint planning
