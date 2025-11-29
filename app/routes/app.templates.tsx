import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useSearchParams, useSubmit, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { templateService } from "../services/template.server";
import { TemplateGrid } from "../components/templates/TemplateGrid";
import { TemplateEditor } from "../components/templates/TemplateEditor";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const category = url.searchParams.get("category") || undefined;
  const favoritesOnly = url.searchParams.get("favorites") === "true";

  const templates = await templateService.getByShop(shop, {
    category,
    favoritesOnly,
  });

  return { templates };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "create") {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const icon = formData.get("icon") as string;
    const prompt = formData.get("prompt") as string;
    const code = formData.get("code") as string | null;

    await templateService.create({
      shop,
      title,
      description,
      category,
      icon,
      prompt,
      code: code || undefined,
    });

    return { success: true, action: "create" };
  }

  if (actionType === "update") {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const icon = formData.get("icon") as string;
    const prompt = formData.get("prompt") as string;

    await templateService.update(id, shop, {
      title,
      description,
      category,
      icon,
      prompt,
    });

    return { success: true, action: "update" };
  }

  if (actionType === "toggleFavorite") {
    const id = formData.get("id") as string;
    await templateService.toggleFavorite(id, shop);
    return { success: true, action: "toggleFavorite" };
  }

  if (actionType === "duplicate") {
    const id = formData.get("id") as string;
    await templateService.duplicate(id, shop);
    return { success: true, action: "duplicate" };
  }

  if (actionType === "delete") {
    const id = formData.get("id") as string;
    await templateService.delete(id, shop);
    return { success: true, action: "delete" };
  }

  return null;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "marketing", label: "Marketing" },
  { value: "product", label: "Product" },
  { value: "content", label: "Content" },
  { value: "layout", label: "Layout" },
];

export default function TemplatesPage() {
  const { templates } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<typeof templates[0] | null>(null);

  const currentCategory = searchParams.get("category") || "";
  const favoritesOnly = searchParams.get("favorites") === "true";

  const handleCategoryFilter = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    setSearchParams(params);
  };

  const handleFavoritesFilter = () => {
    const params = new URLSearchParams(searchParams);
    if (favoritesOnly) {
      params.delete("favorites");
    } else {
      params.set("favorites", "true");
    }
    setSearchParams(params);
  };

  const handleUseTemplate = (template: typeof templates[0]) => {
    // Navigate to generate page with prompt pre-filled
    navigate(`/app/generate?prompt=${encodeURIComponent(template.prompt)}`);
  };

  const handleToggleFavorite = (id: string) => {
    const formData = new FormData();
    formData.append("action", "toggleFavorite");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  const handleDuplicate = (id: string) => {
    const formData = new FormData();
    formData.append("action", "duplicate");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("id", id);
      submit(formData, { method: "post" });
    }
  };

  const handleEdit = (template: typeof templates[0]) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleSaveTemplate = (data: {
    title: string;
    description: string;
    category: string;
    icon: string;
    prompt: string;
  }) => {
    const formData = new FormData();
    formData.append("action", editingTemplate ? "update" : "create");
    if (editingTemplate) {
      formData.append("id", editingTemplate.id);
    }
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("category", data.category);
    formData.append("icon", data.icon);
    formData.append("prompt", data.prompt);
    submit(formData, { method: "post" });
    setShowEditor(false);
    setEditingTemplate(null);
  };

  return (
    <>
      <s-page title="Section Templates">
        <s-stack gap="400" vertical>
          {actionData?.action === "delete" && (
            <s-banner tone="success" dismissible>
              Template deleted successfully.
            </s-banner>
          )}
          {actionData?.action === "create" && (
            <s-banner tone="success" dismissible>
              Template created successfully.
            </s-banner>
          )}
          {actionData?.action === "duplicate" && (
            <s-banner tone="success" dismissible>
              Template duplicated successfully.
            </s-banner>
          )}

          <s-card>
            <s-stack gap="400" vertical>
              {/* Header with create button */}
              <s-stack gap="200" distribution="equalSpacing">
                <s-text variant="headingMd">Your Templates</s-text>
                <s-button variant="primary" onClick={() => {
                  setEditingTemplate(null);
                  setShowEditor(true);
                }}>
                  Create Template
                </s-button>
              </s-stack>

              {/* Filters */}
              <s-stack gap="200">
                {CATEGORIES.map((cat) => (
                  <s-button
                    key={cat.value}
                    variant={currentCategory === cat.value && !favoritesOnly ? "primary" : "secondary"}
                    size="slim"
                    onClick={() => handleCategoryFilter(cat.value)}
                  >
                    {cat.label}
                  </s-button>
                ))}
                <s-button
                  variant={favoritesOnly ? "primary" : "secondary"}
                  size="slim"
                  onClick={handleFavoritesFilter}
                >
                  Favorites
                </s-button>
              </s-stack>

              {/* Templates grid */}
              {templates.length > 0 ? (
                <TemplateGrid
                  templates={templates}
                  onUse={handleUseTemplate}
                  onEdit={handleEdit}
                  onToggleFavorite={handleToggleFavorite}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ) : (
                <s-stack gap="400" vertical align="center">
                  <div style={{ fontSize: '48px', opacity: 0.5 }}>📋</div>
                  <s-text variant="headingMd" tone="subdued">
                    No templates yet
                  </s-text>
                  <s-text tone="subdued">
                    Create your first template or save one from the Generate page.
                  </s-text>
                  <s-button onClick={() => setShowEditor(true)}>
                    Create Template
                  </s-button>
                </s-stack>
              )}
            </s-stack>
          </s-card>
        </s-stack>
      </s-page>

      {/* Editor modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </>
  );
}
