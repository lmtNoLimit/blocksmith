/**
 * Resource Selector Component
 * Uses Shopify App Bridge ResourcePicker for selecting products, collections, articles
 */

import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { SelectedResourceDisplay } from './SelectedResourceDisplay';

export type ResourceType = 'product' | 'collection' | 'variant';

export interface SelectedResource {
  id: string;
  title: string;
  image?: string;
}

interface ResourceSelectorProps {
  resourceType: ResourceType;
  onSelect: (resourceId: string | null, resource: SelectedResource | null) => void;
  onSelectMultiple?: (resources: SelectedResource[]) => void;
  selectedResource?: SelectedResource | null;
  selectedResources?: SelectedResource[];
  multiple?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * ResourceSelector - Opens App Bridge ResourcePicker modal
 * Provides product/collection selection with native Shopify admin UX
 */
export function ResourceSelector({
  resourceType,
  onSelect,
  onSelectMultiple,
  selectedResource,
  selectedResources = [],
  multiple = false,
  disabled,
  loading
}: ResourceSelectorProps) {
  const shopify = useAppBridge();
  const [isOpening, setIsOpening] = useState(false);

  const resourceTypeLabel = {
    product: 'Product',
    collection: 'Collection',
    variant: 'Variant'
  }[resourceType];

  const pluralLabel = {
    product: 'Products',
    collection: 'Collections',
    variant: 'Variants'
  }[resourceType];

  const handleOpenPicker = useCallback(async () => {
    if (disabled || loading || isOpening) return;

    setIsOpening(true);
    try {
      // Use App Bridge resourcePicker API
      const selected = await shopify.resourcePicker({
        type: resourceType,
        multiple: multiple,
        action: 'select'
      });

      if (selected && selected.length > 0) {
        if (multiple && onSelectMultiple) {
          // Handle multiple selection
          const resources: SelectedResource[] = selected.map((resource) => {
            let imageUrl: string | undefined;
            if ('images' in resource && Array.isArray(resource.images) && resource.images.length > 0) {
              const firstImage = resource.images[0] as { originalSrc?: string; src?: string; url?: string };
              imageUrl = firstImage.originalSrc || firstImage.src || firstImage.url;
            } else if ('image' in resource && resource.image) {
              const img = resource.image as { originalSrc?: string; src?: string; url?: string };
              imageUrl = img.originalSrc || img.src || img.url;
            }
            return {
              id: resource.id,
              title: resource.title || 'Untitled',
              image: imageUrl
            };
          });
          onSelectMultiple(resources);
        } else {
          // Handle single selection
          const resource = selected[0];
          let imageUrl: string | undefined;
          if ('images' in resource && Array.isArray(resource.images) && resource.images.length > 0) {
            const firstImage = resource.images[0] as { originalSrc?: string; src?: string; url?: string };
            imageUrl = firstImage.originalSrc || firstImage.src || firstImage.url;
          } else if ('image' in resource && resource.image) {
            const img = resource.image as { originalSrc?: string; src?: string; url?: string };
            imageUrl = img.originalSrc || img.src || img.url;
          }

          const selectedResource: SelectedResource = {
            id: resource.id,
            title: resource.title || 'Untitled',
            image: imageUrl
          };

          onSelect(resource.id, selectedResource);
        }
      }
    } catch (error) {
      // User cancelled the picker - this is expected behavior
      if ((error as Error)?.message?.includes('cancel')) {
        return;
      }
      console.error('ResourcePicker error:', error);
    } finally {
      setIsOpening(false);
    }
  }, [shopify, resourceType, multiple, disabled, loading, isOpening, onSelect, onSelectMultiple]);

  const handleClear = useCallback(() => {
    if (multiple && onSelectMultiple) {
      onSelectMultiple([]);
    } else {
      onSelect(null, null);
    }
  }, [multiple, onSelect, onSelectMultiple]);

  // Determine display state
  const hasSelection = multiple ? selectedResources.length > 0 : !!selectedResource;
  const selectionCount = multiple ? selectedResources.length : (selectedResource ? 1 : 0);
  const buttonLabel = hasSelection
    ? (multiple ? `Change ${pluralLabel} (${selectionCount})` : `Change ${resourceTypeLabel}`)
    : (multiple ? `Select ${pluralLabel}` : `Select ${resourceTypeLabel}`);

  return (
    <s-stack gap="small" direction="inline">
      {/* Select/Change button */}
      <s-button
        variant="secondary"
        onClick={handleOpenPicker}
        disabled={disabled || loading || isOpening || undefined}
        loading={isOpening || loading || undefined}
      >
        {buttonLabel}
      </s-button>

      {/* Selected resource display (single) */}
      {!multiple && selectedResource && (
        <SelectedResourceDisplay
          title={selectedResource.title}
          image={selectedResource.image}
          onClear={handleClear}
          disabled={disabled || loading}
        />
      )}

      {/* Selected resources display (multiple) */}
      {multiple && selectedResources.length > 0 && (
        <s-stack direction="inline" gap="small" alignItems="center">
          {selectedResources.slice(0, 3).map((res) => (
            <s-chip key={res.id} color="subdued">
              {res.title}
            </s-chip>
          ))}
          {selectedResources.length > 3 && (
            <s-text color="subdued">+{selectedResources.length - 3} more</s-text>
          )}
          <s-button
            variant="tertiary"
            onClick={handleClear}
            disabled={disabled || loading || undefined}
            icon="x"
          >
            Clear
          </s-button>
        </s-stack>
      )}
    </s-stack>
  );
}
