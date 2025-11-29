import { useState } from "react";
import type { SectionTemplate } from "@prisma/client";

export interface TemplateEditorProps {
  template: SectionTemplate | null;
  onSave: (data: {
    title: string;
    description: string;
    category: string;
    icon: string;
    prompt: string;
  }) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { value: "marketing", label: "Marketing" },
  { value: "product", label: "Product" },
  { value: "content", label: "Content" },
  { value: "layout", label: "Layout" },
];

const ICONS = ["📋", "🎨", "📦", "📝", "🛒", "⭐", "🔥", "💡", "🎯", "🚀"];

/**
 * Modal editor for creating/editing templates
 */
export function TemplateEditor({
  template,
  onSave,
  onClose
}: TemplateEditorProps) {
  const [title, setTitle] = useState(template?.title || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || "marketing");
  const [icon, setIcon] = useState(template?.icon || "📋");
  const [prompt, setPrompt] = useState(template?.prompt || "");

  const isValid = title.trim() && description.trim() && prompt.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      icon,
      prompt: prompt.trim(),
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--p-color-bg-surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <s-card>
          <s-stack gap="400" vertical>
            {/* Header */}
            <s-stack gap="200" distribution="equalSpacing">
              <s-text variant="headingLg">
                {template ? "Edit Template" : "Create Template"}
              </s-text>
              <s-button variant="tertiary" onClick={onClose}>
                ✕
              </s-button>
            </s-stack>

            {/* Form fields */}
            <s-stack gap="400" vertical>
              {/* Title */}
              <s-stack gap="100" vertical>
                <s-text variant="bodyMd" fontWeight="semibold">Title</s-text>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Hero Banner"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--p-color-border)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </s-stack>

              {/* Description */}
              <s-stack gap="100" vertical>
                <s-text variant="bodyMd" fontWeight="semibold">Description</s-text>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the template"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--p-color-border)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </s-stack>

              {/* Category */}
              <s-stack gap="100" vertical>
                <s-text variant="bodyMd" fontWeight="semibold">Category</s-text>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--p-color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'var(--p-color-bg-surface)'
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </s-stack>

              {/* Icon picker */}
              <s-stack gap="100" vertical>
                <s-text variant="bodyMd" fontWeight="semibold">Icon</s-text>
                <s-stack gap="100" wrap>
                  {ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      style={{
                        width: '40px',
                        height: '40px',
                        fontSize: '20px',
                        border: icon === emoji
                          ? '2px solid var(--p-color-border-interactive)'
                          : '1px solid var(--p-color-border)',
                        borderRadius: '8px',
                        backgroundColor: icon === emoji
                          ? 'var(--p-color-bg-surface-secondary)'
                          : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </s-stack>
              </s-stack>

              {/* Prompt */}
              <s-stack gap="100" vertical>
                <s-text variant="bodyMd" fontWeight="semibold">Prompt</s-text>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what this template generates..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--p-color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </s-stack>
            </s-stack>

            {/* Actions */}
            <s-stack gap="200" distribution="trailing">
              <s-button variant="secondary" onClick={onClose}>
                Cancel
              </s-button>
              <s-button
                variant="primary"
                onClick={handleSubmit}
                disabled={!isValid}
              >
                {template ? "Save Changes" : "Create Template"}
              </s-button>
            </s-stack>
          </s-stack>
        </s-card>
      </div>
    </div>
  );
}
