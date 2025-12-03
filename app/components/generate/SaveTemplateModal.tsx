import { useState } from "react";

export interface SaveTemplateModalProps {
  defaultPrompt: string;
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
 * Modal for saving generated code as a reusable template
 */
export function SaveTemplateModal({
  defaultPrompt,
  onSave,
  onClose
}: SaveTemplateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("marketing");
  const [icon, setIcon] = useState("📋");
  const [prompt, setPrompt] = useState(defaultPrompt);

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
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
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
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-title"
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
        <s-section>
          <s-stack gap="large" direction="block">
            {/* Header */}
            <s-stack gap="small" direction="inline" justifyContent="space-between">
              <s-text id="save-template-title" type="strong">
                Save as Template
              </s-text>
              <s-button variant="tertiary" onClick={onClose}>
                ✕
              </s-button>
            </s-stack>

            <s-text color="subdued">
              Save this generation as a reusable template for future use.
            </s-text>

            {/* Form fields */}
            <s-stack gap="large" direction="block">
              {/* Title */}
              <s-stack gap="small" direction="block">
                <s-text type="strong">Title</s-text>
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
              <s-stack gap="small" direction="block">
                <s-text type="strong">Description</s-text>
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
              <s-stack gap="small" direction="block">
                <s-text type="strong">Category</s-text>
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
              <s-stack gap="small" direction="block">
                <s-text type="strong">Icon</s-text>
                <s-stack gap="small">
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

              {/* Prompt (read-only preview) */}
              <s-stack gap="small" direction="block">
                <s-text type="strong">Prompt</s-text>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
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
            <s-stack gap="small" alignItems="end">
              <s-button variant="secondary" onClick={onClose}>
                Cancel
              </s-button>
              <s-button
                variant="primary"
                onClick={handleSubmit}
                disabled={!isValid}
              >
                Save Template
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
      </div>
    </div>
  );
}
