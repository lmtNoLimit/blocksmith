/**
 * Shopify Liquid Media Filter Implementations
 * Media rendering filters for images, videos, 3D models in section preview
 */

import { escapeAttr } from './htmlEscape';

interface ImageOptions {
  class?: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
  sizes?: string;
  preload?: boolean;
}

interface VideoOptions {
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  poster?: string;
}

// Inline SVG placeholder for missing images (works offline)
const PLACEHOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect fill="#f0f0f0" width="300" height="200"/><text x="150" y="105" text-anchor="middle" fill="#999" font-family="sans-serif">No Image</text></svg>';
const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(PLACEHOLDER_SVG);

export const mediaFilters = {
  /** Generates an img tag from an image object or URL */
  image_tag: (image: unknown, options: ImageOptions = {}): string => {
    let src = PLACEHOLDER;
    let alt = options.alt || '';

    if (typeof image === 'string') {
      src = image;
    } else if (image && typeof image === 'object') {
      const img = image as { src?: string; url?: string; alt?: string };
      src = img.src || img.url || PLACEHOLDER;
      alt = alt || img.alt || '';
    }

    const attrs: string[] = [
      `src="${escapeAttr(src)}"`,
      `alt="${escapeAttr(alt)}"`,
    ];

    if (options.class) attrs.push(`class="${escapeAttr(options.class)}"`);
    if (options.loading) attrs.push(`loading="${options.loading}"`);
    if (options.width) attrs.push(`width="${options.width}"`);
    if (options.height) attrs.push(`height="${options.height}"`);
    if (options.sizes) attrs.push(`sizes="${escapeAttr(options.sizes)}"`);

    return `<img ${attrs.join(' ')}>`;
  },

  /** Universal media renderer - dispatches to appropriate tag based on media_type */
  media_tag: (media: unknown, _options = {}): string => {
    if (!media) return '';

    const mediaObj = media as {
      media_type?: string;
      src?: string;
      url?: string;
      alt?: string;
      preview_image?: { src: string };
    };

    const type = mediaObj.media_type || 'image';

    switch (type) {
      case 'video':
        return mediaFilters.video_tag(media, {});
      case 'external_video':
        return mediaFilters.external_video_tag(media);
      case 'model':
        return mediaFilters.model_viewer_tag(media);
      default:
        return mediaFilters.image_tag(media, {});
    }
  },

  /** Generates HTML5 video tag with sources */
  video_tag: (video: unknown, options: VideoOptions = {}): string => {
    if (!video) return '';

    const videoObj = video as {
      src?: string;
      sources?: Array<{ url: string; mime_type: string }>;
    };
    const sources = videoObj.sources || [];

    const attrs: string[] = [];
    if (options.autoplay) attrs.push('autoplay');
    if (options.loop) attrs.push('loop');
    if (options.muted) attrs.push('muted');
    if (options.controls !== false) attrs.push('controls');
    if (options.poster) attrs.push(`poster="${escapeAttr(options.poster)}"`);

    if (sources.length > 0) {
      const sourcesTags = sources
        .map((s) => `<source src="${escapeAttr(s.url)}" type="${escapeAttr(s.mime_type)}">`)
        .join('');
      return `<video ${attrs.join(' ')}>${sourcesTags}</video>`;
    }

    return `<video ${attrs.join(' ')} src="${escapeAttr(videoObj.src || '')}"></video>`;
  },

  /** Generates iframe for YouTube/Vimeo embedded videos */
  external_video_tag: (video: unknown): string => {
    if (!video) return '';

    const videoObj = video as { host?: string; id?: string; embed_url?: string };
    const host = videoObj.host || 'youtube';
    const embedUrl = videoObj.embed_url || mediaFilters.external_video_url(video);

    return `<iframe src="${escapeAttr(embedUrl)}" class="external-video external-video--${host}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  },

  /** Returns the embed URL for external video */
  external_video_url: (video: unknown): string => {
    if (!video) return '';

    const videoObj = video as { host?: string; id?: string; embed_url?: string };

    if (videoObj.embed_url) return videoObj.embed_url;

    const host = videoObj.host || 'youtube';
    const id = videoObj.id || '';

    switch (host) {
      case 'youtube':
        return `https://www.youtube.com/embed/${id}`;
      case 'vimeo':
        return `https://player.vimeo.com/video/${id}`;
      default:
        return '';
    }
  },

  /** Generates model-viewer tag for 3D models */
  model_viewer_tag: (model: unknown): string => {
    if (!model) return '';

    const modelObj = model as { src?: string; alt?: string; poster?: string };

    return `<model-viewer src="${escapeAttr(modelObj.src || '')}" alt="${escapeAttr(modelObj.alt || '3D Model')}" poster="${escapeAttr(modelObj.poster || '')}" camera-controls auto-rotate loading="lazy"></model-viewer>`;
  },

  /** Generates placeholder SVG for different content types */
  placeholder_svg_tag: (type: string): string => {
    const sizes: Record<string, string> = {
      product: '1:1',
      collection: '4:3',
      image: '16:9',
      lifestyle: '3:2',
    };

    const ratio = sizes[type] || '1:1';
    const [w, h] = ratio.split(':').map(Number);
    const width = 300;
    const height = Math.round(width * (h / w));

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="placeholder-svg placeholder-svg--${type}"><rect fill="#f0f0f0" width="${width}" height="${height}"/><text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#999" font-family="sans-serif" font-size="14">${type}</text></svg>`;
  },
};
