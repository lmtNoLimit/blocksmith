/**
 * ArticleSetting Component
 * Renders input for schema settings with type: "article"
 * App Bridge doesn't support article picker - uses handle input
 * Format: blog-handle/article-handle
 */

import type { SchemaSetting } from '../schema/SchemaTypes';

export interface ArticleSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ArticleSetting({
  setting,
  value,
  onChange,
  disabled,
}: ArticleSettingProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{setting.label}</span>

      <s-text-field
        label="Article handle"
        value={value}
        placeholder="blog-name/article-handle"
        disabled={disabled || undefined}
        onInput={handleInput}
      />

      {setting.info && (
        <span style={{ fontSize: '13px', color: '#6d7175' }}>{setting.info}</span>
      )}

      <span style={{ fontSize: '12px', color: '#8c9196' }}>
        Format: blog-handle/article-handle
      </span>
    </div>
  );
}
