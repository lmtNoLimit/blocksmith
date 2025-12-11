import { ShopifyDrop } from './base/ShopifyDrop';

/**
 * Shopify Media Drop
 * Provides access to media objects (images, videos, 3D models) in Liquid templates
 */

interface MediaData {
  id: number;
  media_type: 'image' | 'video' | 'external_video' | 'model';
  position: number;
  alt?: string;
  src?: string;
  preview_image?: { src: string; width: number; height: number };
  sources?: Array<{ url: string; mime_type: string; width: number; height: number }>;
  host?: string;
  embed_url?: string;
}

export class MediaDrop extends ShopifyDrop {
  private media: MediaData;

  constructor(media: MediaData) {
    super();
    this.media = media;
  }

  get id(): number {
    return this.media.id;
  }

  get media_type(): string {
    return this.media.media_type;
  }

  get position(): number {
    return this.media.position;
  }

  get alt(): string {
    return this.media.alt || '';
  }

  get preview_image(): { src: string; width: number; height: number } | null {
    return this.media.preview_image || null;
  }

  // For images
  get src(): string {
    return this.media.src || '';
  }

  // For videos
  get sources(): Array<{ url: string; mime_type: string }> {
    return this.media.sources || [];
  }

  // For external videos
  get host(): string {
    return this.media.host || '';
  }

  get embed_url(): string {
    return this.media.embed_url || '';
  }

  /** Returns object representation for Liquid rendering */
  toLiquidDrop(): Record<string, unknown> {
    return {
      id: this.id,
      media_type: this.media_type,
      position: this.position,
      alt: this.alt,
      src: this.src,
      preview_image: this.preview_image,
      sources: this.sources,
      host: this.host,
      embed_url: this.embed_url,
    };
  }
}
