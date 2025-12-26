/**
 * API Route: Fetch Shopify resource data for preview
 * Handles authenticated requests to fetch products, collections, articles
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { shopifyDataAdapter } from '../services/adapters/shopify-data-adapter';

/**
 * POST /app/api/resource
 * Fetch resource data by type and ID
 */
export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const formData = await request.formData();
  const resourceType = formData.get('type') as string;
  const resourceId = formData.get('id') as string;

  if (!resourceType || !resourceId) {
    return Response.json(
      { error: 'Missing type or id parameter' },
      { status: 400 }
    );
  }

  try {
    let data = null;

    switch (resourceType) {
      case 'product':
        data = await shopifyDataAdapter.getProduct(request, resourceId);
        break;
      case 'collection':
        data = await shopifyDataAdapter.getCollection(request, resourceId);
        break;
      case 'article':
        data = await shopifyDataAdapter.getArticle(request, resourceId);
        break;
      case 'shop':
        data = await shopifyDataAdapter.getShop(request);
        break;
      default:
        return Response.json(
          { error: `Unknown resource type: ${resourceType}` },
          { status: 400 }
        );
    }

    if (!data) {
      return Response.json(
        { error: `${resourceType} not found` },
        { status: 404 }
      );
    }

    return Response.json({ data });
  } catch (error) {
    console.error(`Error fetching ${resourceType}:`, error);
    return Response.json(
      { error: `Failed to fetch ${resourceType}` },
      { status: 500 }
    );
  }
}

/**
 * GET /app/api/resource?type=product&id=123
 * GET /app/api/resource?type=articles (list mode)
 * Alternative GET endpoint for resource fetching
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const resourceType = url.searchParams.get('type');
  const resourceId = url.searchParams.get('id');

  if (!resourceType) {
    return Response.json(
      { error: 'Missing type parameter' },
      { status: 400 }
    );
  }

  try {
    let data = null;

    switch (resourceType) {
      case 'product':
        if (!resourceId) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        data = await shopifyDataAdapter.getProduct(request, resourceId);
        break;
      case 'collection':
        if (!resourceId) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        data = await shopifyDataAdapter.getCollection(request, resourceId);
        break;
      case 'article':
        if (!resourceId) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        data = await shopifyDataAdapter.getArticle(request, resourceId);
        break;
      case 'articles':
        // List mode: fetch all articles for dropdown
        data = await shopifyDataAdapter.getArticles(request, 50);
        return Response.json({ data });
      case 'shop':
        data = await shopifyDataAdapter.getShop(request);
        break;
      default:
        return Response.json(
          { error: `Unknown resource type: ${resourceType}` },
          { status: 400 }
        );
    }

    if (!data) {
      return Response.json(
        { error: `${resourceType} not found` },
        { status: 404 }
      );
    }

    return Response.json({ data });
  } catch (error) {
    console.error(`Error fetching ${resourceType}:`, error);
    return Response.json(
      { error: `Failed to fetch ${resourceType}` },
      { status: 500 }
    );
  }
}
