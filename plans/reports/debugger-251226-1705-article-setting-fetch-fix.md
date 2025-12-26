# Debug Report: ArticleSetting Fetch Issue

**Date:** 2025-12-26
**Component:** `ArticleSetting.tsx`
**Status:** Fixed

## Problem

User unable to select articles in ArticleSetting component - dropdown shows "No articles found" despite having articles in the store.

## Root Cause Analysis

### Investigation Flow

1. **Component**: `app/components/preview/settings/ArticleSetting.tsx:39`
   - Fetches from `/app/api/resource?type=articles`

2. **Route Handler**: `app/routes/app.api.resource.tsx:109-112`
   - Handles `type=articles`, calls `shopifyDataAdapter.getArticles(request, 50)`

3. **Adapter**: `app/services/adapters/shopify-data-adapter.ts:58-59`
   - Passes through to `shopifyDataService.getArticles(request, limit)`

4. **Service**: `app/services/shopify-data.server.ts:637-679`
   - Makes GraphQL query `ARTICLES_LIST_QUERY`

### Root Cause: Missing OAuth Scope

The app's `shopify.app.toml` was missing the required `read_content` scope:

```toml
# Before
scopes = "write_files,write_products,write_themes,write_app_proxy"

# After
scopes = "write_files,write_products,write_themes,write_app_proxy,read_content"
```

The Shopify Admin GraphQL API requires `read_content` or `read_online_store_pages` scope to access articles/blogs.

### Secondary Issue: Silent Error Handling

The `getArticles()` method was catching errors and returning an empty array, masking the actual scope permission error.

## Fixes Applied

### 1. Added `read_content` scope
**File:** `shopify.app.toml:30`

### 2. Improved error handling
**File:** `shopify-data.server.ts:637-679`
- Added GraphQL error detection in response
- Changed from swallowing errors to re-throwing them
- Added warning log for empty response cases

## Post-Fix Actions Required

1. **Deploy app configuration:**
   ```bash
   shopify app deploy
   ```

2. **Re-authorize the app:**
   - Store owners need to accept the new scope
   - May require reinstalling the app or visiting `/auth` endpoint

## Verification

After deployment and scope acceptance:
- Open ArticleSetting component
- Should see articles populated in dropdown
- Console should show no errors

## Files Changed

| File | Change |
|------|--------|
| `shopify.app.toml` | Added `read_content` scope |
| `app/services/shopify-data.server.ts` | Improved error handling, added GraphQL error detection |
