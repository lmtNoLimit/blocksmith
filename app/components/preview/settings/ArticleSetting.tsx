/**
 * ArticleSetting Component
 * Renders dropdown picker for schema settings with type: "article"
 * Fetches articles from store and shows preview of selected article
 */

import { useState, useEffect, useCallback } from 'react';
import type { SchemaSetting } from '../schema/SchemaTypes';
import type { ArticleListItem } from '../../../services/shopify-data.server';

export interface ArticleSettingProps {
  setting: SchemaSetting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * ArticleSetting - Dropdown picker for article type settings
 * Fetches articles from the store and allows selection with preview
 */
export function ArticleSetting({
  setting,
  value,
  onChange,
  disabled,
}: ArticleSettingProps) {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleListItem | null>(null);

  // Fetch articles on mount
  useEffect(() => {
    async function fetchArticles() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/app/api/resource?type=articles');
        if (!response.ok) {
          throw new Error('Failed to fetch articles');
        }
        const result = await response.json();
        setArticles(result.data || []);
      } catch (err) {
        console.error('Error fetching articles:', err);
        setError('Could not load articles');
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, []);

  // Find selected article when value or articles change
  useEffect(() => {
    if (value && articles.length > 0) {
      // Value format: "blog-handle/article-handle" or just article ID
      const found = articles.find(a => {
        const fullHandle = `${a.blogHandle}/${a.handle}`;
        return fullHandle === value || a.id === value || a.handle === value;
      });
      setSelectedArticle(found || null);
    } else {
      setSelectedArticle(null);
    }
  }, [value, articles]);

  const handleSelectChange = useCallback((e: Event) => {
    const target = e.target as HTMLSelectElement;
    const selectedValue = target.value;

    if (selectedValue) {
      const article = articles.find(a => a.id === selectedValue);
      if (article) {
        // Store as "blog-handle/article-handle" format for Liquid compatibility
        onChange(`${article.blogHandle}/${article.handle}`);
        setSelectedArticle(article);
      }
    } else {
      onChange('');
      setSelectedArticle(null);
    }
  }, [articles, onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setSelectedArticle(null);
  }, [onChange]);

  // Build options grouped by blog
  const groupedArticles = articles.reduce((acc, article) => {
    const blogTitle = article.blogTitle || 'Uncategorized';
    if (!acc[blogTitle]) {
      acc[blogTitle] = [];
    }
    acc[blogTitle].push(article);
    return acc;
  }, {} as Record<string, ArticleListItem[]>);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <s-spinner size="base" />
          <span style={{ fontSize: '13px', color: '#6d7175' }}>Loading articles...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <s-banner tone="warning">
          {error}
        </s-banner>
      )}

      {/* Article selector */}
      {!loading && !error && (
        <>
          <s-select
            label="Select article"
            value={selectedArticle?.id || ''}
            disabled={disabled || undefined}
            onChange={handleSelectChange}
            aria-label={`Select article for ${setting.label}`}
            details={setting.info}
          >
            {Object.entries(groupedArticles).map(([blogTitle, blogArticles]) => (
              <s-option-group key={blogTitle} label={blogTitle}>
                {blogArticles.map(article => (
                  <s-option key={article.id} value={article.id}>
                    {article.title}
                  </s-option>
                ))}
              </s-option-group>
            ))}
          </s-select>

          {/* No articles message */}
          {articles.length === 0 && (
            <span style={{ fontSize: '13px', color: '#6d7175' }}>
              No articles found. Create articles in your store to use this setting.
            </span>
          )}
        </>
      )}

      {/* Selected article preview */}
      {selectedArticle && (
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '12px',
          backgroundColor: '#f6f6f7',
          borderRadius: '8px',
          alignItems: 'flex-start'
        }}>
          {/* Article thumbnail */}
          {selectedArticle.image && (
            <s-thumbnail
              src={selectedArticle.image}
              alt={selectedArticle.title}
              size="small"
            />
          )}

          {/* Article info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>
              {selectedArticle.title}
            </div>
            <div style={{ fontSize: '13px', color: '#6d7175' }}>
              {selectedArticle.blogTitle}
            </div>
            {selectedArticle.excerpt && (
              <div style={{ fontSize: '12px', color: '#8c9196', marginTop: '4px' }}>
                {selectedArticle.excerpt.length > 80
                  ? `${selectedArticle.excerpt.substring(0, 80)}...`
                  : selectedArticle.excerpt}
              </div>
            )}
          </div>

          {/* Clear button */}
          <s-button
            variant="tertiary"
            onClick={handleClear}
            disabled={disabled || undefined}
            accessibilityLabel="Clear article selection"
            icon="x"
          />
        </div>
      )}

      {/* Handle format hint */}
      <span style={{ fontSize: '12px', color: '#8c9196' }}>
        Value: {value || '(none selected)'}
      </span>
    </div>
  );
}
