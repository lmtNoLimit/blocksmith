import { useState, useMemo } from 'react';
import type { DeviceSize } from './types';
import type { ResourceNeeds } from './hooks/useResourceDetection';
import type { SelectedResource } from './ResourceSelector';
import type { SchemaSetting } from './schema/SchemaTypes';
import { ResourceSelector } from './ResourceSelector';

export interface PreviewToolbarProps {
  deviceSize: DeviceSize;
  onDeviceSizeChange: (size: DeviceSize) => void;
  onRefresh: () => void;
  isRendering?: boolean;
  renderedHtml?: string;
  // Resource data props
  selectedProduct?: SelectedResource | null;
  selectedProducts?: SelectedResource[];
  selectedCollection?: SelectedResource | null;
  onProductSelect?: (productId: string | null, resource: SelectedResource | null) => void;
  onProductsSelect?: (resources: SelectedResource[]) => void;
  onCollectionSelect?: (collectionId: string | null, resource: SelectedResource | null) => void;
  resourceNeeds?: ResourceNeeds;
  isLoadingResource?: boolean;
  // Schema settings (to check if resource pickers are in settings panel)
  schemaSettings?: SchemaSetting[];
}

/**
 * Preview toolbar with device selector, resource picker, and refresh button
 */
export function PreviewToolbar({
  deviceSize,
  onDeviceSizeChange,
  onRefresh,
  isRendering,
  renderedHtml,
  selectedProduct,
  selectedProducts = [],
  selectedCollection,
  onProductSelect,
  onProductsSelect,
  onCollectionSelect,
  resourceNeeds,
  isLoadingResource,
  schemaSettings = []
}: PreviewToolbarProps) {
  const [copied, setCopied] = useState(false);

  // Check if schema already has resource settings (so we can hide toolbar pickers)
  const hasSchemaProductSetting = useMemo(
    () => schemaSettings.some(s => s.type === 'product'),
    [schemaSettings]
  );
  const hasSchemaCollectionSetting = useMemo(
    () => schemaSettings.some(s => s.type === 'collection'),
    [schemaSettings]
  );

  const handleCopy = async () => {
    if (!renderedHtml) return;
    try {
      await navigator.clipboard.writeText(renderedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Check if section needs any resources
  const hasResourceNeeds = resourceNeeds && (
    resourceNeeds.needsProduct ||
    resourceNeeds.needsCollection ||
    resourceNeeds.needsArticle
  );

  return (
    <s-stack gap="base" direction="block">
      {/* Main toolbar row */}
      <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
        {/* Device size selector */}
        <s-button-group gap="none" accessibilityLabel="Device size">
          <s-button
            slot="secondary-actions"
            variant={deviceSize === 'mobile' ? 'primary' : 'tertiary'}
            onClick={() => onDeviceSizeChange('mobile')}
            accessibilityLabel="Preview on mobile device"
          >
            Mobile
          </s-button>
          <s-button
            slot="secondary-actions"
            variant={deviceSize === 'tablet' ? 'primary' : 'tertiary'}
            onClick={() => onDeviceSizeChange('tablet')}
            accessibilityLabel="Preview on tablet device"
          >
            Tablet
          </s-button>
          <s-button
            slot="secondary-actions"
            variant={deviceSize === 'desktop' ? 'primary' : 'tertiary'}
            onClick={() => onDeviceSizeChange('desktop')}
            accessibilityLabel="Preview on desktop device"
          >
            Desktop
          </s-button>
        </s-button-group>

        <s-stack direction="inline" gap="small" alignItems="center">
          {/* Copy HTML button */}
          {renderedHtml && (
            <s-button
              variant="tertiary"
              onClick={handleCopy}
              icon={copied ? 'check' : undefined}
            >
              {copied ? 'Copied' : 'Copy HTML'}
            </s-button>
          )}

          {/* Refresh button */}
          <s-button
            variant="tertiary"
            onClick={onRefresh}
            loading={isRendering || undefined}
            icon="refresh"
          >
            Refresh
          </s-button>
        </s-stack>
      </s-stack>

      {/* Resource selectors row (shown if section uses resources) */}
      {hasResourceNeeds && (
        <s-box
          padding="base"
          background="subdued"
          borderRadius="base"
          border="base"
        >
          <s-stack direction="inline" gap="base" alignItems="center">
            {/* Only show product picker if schema doesn't have product setting */}
            {resourceNeeds?.needsProduct && onProductsSelect && !hasSchemaProductSetting && (
              <ResourceSelector
                resourceType="product"
                onSelect={onProductSelect || (() => {})}
                onSelectMultiple={onProductsSelect}
                selectedResource={selectedProduct}
                selectedResources={selectedProducts}
                multiple={true}
                disabled={isLoadingResource}
                loading={isLoadingResource}
              />
            )}

            {/* Only show collection picker if schema doesn't have collection setting */}
            {resourceNeeds?.needsCollection && onCollectionSelect && !hasSchemaCollectionSetting && (
              <ResourceSelector
                resourceType="collection"
                onSelect={onCollectionSelect}
                selectedResource={selectedCollection}
                disabled={isLoadingResource}
                loading={isLoadingResource}
              />
            )}

            {/* Show hint when pickers are in settings panel */}
            {(hasSchemaProductSetting || hasSchemaCollectionSetting) && (
              <s-text color="subdued">Resource pickers available in Settings panel</s-text>
            )}

            {/* Loading indicator */}
            {isLoadingResource && (
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-spinner size="base" />
                <s-text color="subdued">Loading...</s-text>
              </s-stack>
            )}

            {/* Hint when no selection */}
            {selectedProducts.length === 0 && !selectedCollection && !isLoadingResource && (
              <s-text color="subdued">Select products or collection for preview</s-text>
            )}
          </s-stack>
        </s-box>
      )}
    </s-stack>
  );
}
