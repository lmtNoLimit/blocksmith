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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Device size selector */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <s-button
            variant={deviceSize === 'mobile' ? 'primary' : 'tertiary'}
            onClick={() => onDeviceSizeChange('mobile')}
            aria-pressed={deviceSize === 'mobile' ? 'true' : 'false'}
            aria-label="Preview on mobile device"
          >
            Mobile
          </s-button>
          <s-button
            variant={deviceSize === 'tablet' ? 'primary' : 'tertiary'}
            onClick={() => onDeviceSizeChange('tablet')}
            aria-pressed={deviceSize === 'tablet' ? 'true' : 'false'}
            aria-label="Preview on tablet device"
          >
            Tablet
          </s-button>
          <s-button
            variant={deviceSize === 'desktop' ? 'primary' : 'tertiary'}
            onClick={() => onDeviceSizeChange('desktop')}
            aria-pressed={deviceSize === 'desktop' ? 'true' : 'false'}
            aria-label="Preview on desktop device"
          >
            Desktop
          </s-button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Copy HTML button */}
          {renderedHtml && (
            <s-button
              variant="tertiary"
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy HTML'}
            </s-button>
          )}

          {/* Refresh button */}
          <s-button
            variant="tertiary"
            onClick={onRefresh}
            loading={isRendering || undefined}
          >
            Refresh
          </s-button>
        </div>
      </div>

      {/* Resource selectors row (shown if section uses resources) */}
      {hasResourceNeeds && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <span style={{ fontSize: '13px', color: '#6d7175', fontStyle: 'italic' }}>
                Resource pickers available in Settings panel
              </span>
            )}
          </div>

          {/* Loading indicator */}
          {isLoadingResource && (
            <span style={{ color: '#6d7175', fontSize: '14px' }}>
              Loading...
            </span>
          )}

          {/* Hint when no selection */}
          {selectedProducts.length === 0 && !selectedCollection && !isLoadingResource && (
            <span style={{ color: '#6d7175', fontSize: '13px', fontStyle: 'italic' }}>
              Select products or collection for preview
            </span>
          )}
        </div>
      )}
    </s-stack>
  );
}
