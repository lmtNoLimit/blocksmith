/**
 * VideoUrlSetting Component
 * Renders URL input for external video (YouTube/Vimeo)
 * Validates URL and shows video type and ID when valid
 */

import { useState, useEffect } from 'react';
import type { SchemaSetting } from '../schema/SchemaTypes';

export interface VideoUrlSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface VideoInfo {
  type: 'youtube' | 'vimeo' | null;
  id: string | null;
}

/**
 * Extract video ID and type from URL
 */
function parseVideoUrl(url: string): VideoInfo {
  if (!url) return { type: null, id: null };

  // YouTube patterns
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return { type: 'youtube', id: youtubeMatch[1] };
  }

  // Vimeo patterns
  const vimeoMatch = url.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/
  );
  if (vimeoMatch) {
    return { type: 'vimeo', id: vimeoMatch[1] };
  }

  return { type: null, id: null };
}

export function VideoUrlSetting({ setting, value, onChange, disabled }: VideoUrlSettingProps) {
  const [videoInfo, setVideoInfo] = useState<VideoInfo>({ type: null, id: null });

  useEffect(() => {
    setVideoInfo(parseVideoUrl(value));
  }, [value]);

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  // Determine accepted types from setting (defaults to both)
  const acceptedTypes = setting.accept || ['youtube', 'vimeo'];
  const acceptHint = acceptedTypes.join(', ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      <s-text-field
        label="Video URL"
        value={value}
        placeholder="https://www.youtube.com/watch?v=..."
        disabled={disabled || undefined}
        onInput={handleInput}
      />

      {/* Video info display */}
      {videoInfo.type && videoInfo.id && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f6f6f7',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          <span style={{ color: '#6d7175' }}>
            {videoInfo.type === 'youtube' ? 'YouTube' : 'Vimeo'} video: {videoInfo.id}
          </span>
        </div>
      )}

      {/* Invalid URL warning */}
      {value && !videoInfo.type && (
        <span style={{ fontSize: '13px', color: '#d72c0d' }}>
          Could not parse video URL. Supported: {acceptHint}
        </span>
      )}

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}

      <span style={{ fontSize: '12px', color: '#8c9196' }}>
        Accepted: {acceptHint}
      </span>
    </div>
  );
}
