import { mediaFilters } from '../mediaFilters';

describe('mediaFilters', () => {
  describe('image_tag', () => {
    it('generates img tag from URL string', () => {
      const result = mediaFilters.image_tag('https://example.com/image.jpg');
      expect(result).toBe('<img src="https://example.com/image.jpg" alt="">');
    });

    it('generates img tag from image object with src', () => {
      const result = mediaFilters.image_tag({ src: 'https://example.com/image.jpg', alt: 'Test image' });
      expect(result).toBe('<img src="https://example.com/image.jpg" alt="Test image">');
    });

    it('generates img tag from image object with url', () => {
      const result = mediaFilters.image_tag({ url: 'https://example.com/image.jpg' });
      expect(result).toBe('<img src="https://example.com/image.jpg" alt="">');
    });

    it('uses placeholder for null/undefined', () => {
      const result = mediaFilters.image_tag(null);
      expect(result).toContain('src="data:image/svg+xml');
    });

    it('applies optional attributes', () => {
      const result = mediaFilters.image_tag('https://example.com/image.jpg', {
        class: 'product-image',
        loading: 'lazy',
        width: 300,
        height: 200,
      });
      expect(result).toContain('class="product-image"');
      expect(result).toContain('loading="lazy"');
      expect(result).toContain('width="300"');
      expect(result).toContain('height="200"');
    });

    it('overrides alt with option', () => {
      const result = mediaFilters.image_tag({ src: 'image.jpg', alt: 'Original' }, { alt: 'Override' });
      expect(result).toContain('alt="Override"');
    });
  });

  describe('video_tag', () => {
    it('generates video tag with src', () => {
      const result = mediaFilters.video_tag({ src: 'video.mp4' });
      expect(result).toContain('<video');
      expect(result).toContain('src="video.mp4"');
      expect(result).toContain('controls');
    });

    it('generates video tag with sources array', () => {
      const result = mediaFilters.video_tag({
        sources: [
          { url: 'video.webm', mime_type: 'video/webm' },
          { url: 'video.mp4', mime_type: 'video/mp4' },
        ],
      });
      expect(result).toContain('<source src="video.webm" type="video/webm">');
      expect(result).toContain('<source src="video.mp4" type="video/mp4">');
    });

    it('applies video options', () => {
      const result = mediaFilters.video_tag({ src: 'video.mp4' }, { autoplay: true, loop: true, muted: true });
      expect(result).toContain('autoplay');
      expect(result).toContain('loop');
      expect(result).toContain('muted');
    });

    it('returns empty string for null', () => {
      expect(mediaFilters.video_tag(null)).toBe('');
    });
  });

  describe('external_video_tag', () => {
    it('generates YouTube iframe', () => {
      const result = mediaFilters.external_video_tag({ host: 'youtube', id: 'abc123' });
      expect(result).toContain('<iframe');
      expect(result).toContain('https://www.youtube.com/embed/abc123');
      expect(result).toContain('external-video--youtube');
    });

    it('generates Vimeo iframe', () => {
      const result = mediaFilters.external_video_tag({ host: 'vimeo', id: '12345' });
      expect(result).toContain('https://player.vimeo.com/video/12345');
      expect(result).toContain('external-video--vimeo');
    });

    it('uses embed_url if provided', () => {
      const result = mediaFilters.external_video_tag({ embed_url: 'https://custom.url/embed' });
      expect(result).toContain('https://custom.url/embed');
    });

    it('returns empty string for null', () => {
      expect(mediaFilters.external_video_tag(null)).toBe('');
    });
  });

  describe('external_video_url', () => {
    it('returns YouTube embed URL', () => {
      expect(mediaFilters.external_video_url({ host: 'youtube', id: 'abc123' })).toBe(
        'https://www.youtube.com/embed/abc123'
      );
    });

    it('returns Vimeo embed URL', () => {
      expect(mediaFilters.external_video_url({ host: 'vimeo', id: '12345' })).toBe(
        'https://player.vimeo.com/video/12345'
      );
    });

    it('returns embed_url if provided', () => {
      expect(mediaFilters.external_video_url({ embed_url: 'https://custom.url' })).toBe('https://custom.url');
    });

    it('defaults to YouTube', () => {
      expect(mediaFilters.external_video_url({ id: 'xyz' })).toBe('https://www.youtube.com/embed/xyz');
    });
  });

  describe('model_viewer_tag', () => {
    it('generates model-viewer tag', () => {
      const result = mediaFilters.model_viewer_tag({ src: 'model.glb', alt: 'Product 3D' });
      expect(result).toContain('<model-viewer');
      expect(result).toContain('src="model.glb"');
      expect(result).toContain('alt="Product 3D"');
      expect(result).toContain('camera-controls');
      expect(result).toContain('auto-rotate');
    });

    it('uses default alt for missing', () => {
      const result = mediaFilters.model_viewer_tag({ src: 'model.glb' });
      expect(result).toContain('alt="3D Model"');
    });

    it('returns empty string for null', () => {
      expect(mediaFilters.model_viewer_tag(null)).toBe('');
    });
  });

  describe('media_tag', () => {
    it('renders image by default', () => {
      const result = mediaFilters.media_tag({ src: 'image.jpg' });
      expect(result).toContain('<img');
    });

    it('renders video for media_type video', () => {
      const result = mediaFilters.media_tag({ media_type: 'video', src: 'video.mp4' });
      expect(result).toContain('<video');
    });

    it('renders external video', () => {
      const result = mediaFilters.media_tag({ media_type: 'external_video', host: 'youtube', id: 'abc' });
      expect(result).toContain('<iframe');
    });

    it('renders model viewer', () => {
      const result = mediaFilters.media_tag({ media_type: 'model', src: 'model.glb' });
      expect(result).toContain('<model-viewer');
    });

    it('returns empty string for null', () => {
      expect(mediaFilters.media_tag(null)).toBe('');
    });
  });

  describe('placeholder_svg_tag', () => {
    it('generates product placeholder (1:1)', () => {
      const result = mediaFilters.placeholder_svg_tag('product');
      expect(result).toContain('viewBox="0 0 300 300"');
      expect(result).toContain('placeholder-svg--product');
    });

    it('generates collection placeholder (4:3)', () => {
      const result = mediaFilters.placeholder_svg_tag('collection');
      expect(result).toContain('viewBox="0 0 300 225"');
      expect(result).toContain('placeholder-svg--collection');
    });

    it('generates image placeholder (16:9)', () => {
      const result = mediaFilters.placeholder_svg_tag('image');
      expect(result).toContain('viewBox="0 0 300 169"');
    });

    it('defaults to 1:1 for unknown type', () => {
      const result = mediaFilters.placeholder_svg_tag('unknown');
      expect(result).toContain('viewBox="0 0 300 300"');
    });
  });
});
