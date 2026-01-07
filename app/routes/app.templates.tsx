import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useSearchParams, useSubmit, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { templateService } from "../services/template.server";
import { templateSeeder } from "../services/template-seeder.server";
import { TemplateGrid } from "../components/templates/TemplateGrid";
import { TemplateEditorModal } from "../components/templates/TemplateEditorModal";
import { FilterButtonGroup } from "../components/shared/FilterButtonGroup";
import { EmptyState } from "../components/shared/EmptyState";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Auto-seed default templates on first visit
  const seedResult = await templateSeeder.seedDefaultTemplates(shop);
  const wasSeeded = seedResult.seeded;

  const url = new URL(request.url);
  const category = url.searchParams.get("category") || undefined;

  const templates = await templateService.getByShop(shop, {
    category,
  });

  return { templates, wasSeeded };
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

  if (actionType === "resetToDefaults") {
    const result = await templateSeeder.resetToDefaults(shop);
    return { success: true, action: "resetToDefaults", count: result.count };
  }

  return null;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "hero", label: "Hero" },
  { value: "features", label: "Features" },
  { value: "testimonials", label: "Testimonials" },
  { value: "pricing", label: "Pricing" },
  { value: "cta", label: "Call to Action" },
  { value: "faq", label: "FAQ" },
  { value: "team", label: "Team" },
  { value: "gallery", label: "Gallery" },
  { value: "content", label: "Content" },
  { value: "footer", label: "Footer" },
];

const FILTER_OPTIONS = CATEGORIES;


export default function TemplatesPage() {
  const { templates, wasSeeded } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<typeof templates[0] | null>(null);

  const currentCategory = searchParams.get("category") || "";

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    setSearchParams(params);
  };

  // Use pre-built code directly (skip AI)
  const handleUseAsIs = (template: typeof templates[0]) => {
    if (template.code) {
      navigate(`/app/sections/new?code=${encodeURIComponent(template.code)}&name=${encodeURIComponent(template.title)}`);
    }
  };

  // Use prompt to generate with AI
  const handleCustomize = (template: typeof templates[0]) => {
    navigate(`/app/sections/new?prompt=${encodeURIComponent(template.prompt)}`);
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

  const handleResetToDefaults = () => {
    if (confirm("This will delete all your templates and restore the default templates. Are you sure?")) {
      const formData = new FormData();
      formData.append("action", "resetToDefaults");
      submit(formData, { method: "post" });
    }
  };

  return (
    <>
      <s-page heading="Section Templates" inlineSize="large">
        <s-button slot="secondary-actions" onClick={handleResetToDefaults}>
          Reset to Defaults
        </s-button>
        <s-button slot="primary-action" onClick={() => {
          setEditingTemplate(null);
          setShowEditor(true);
        }}>
          Create Template
        </s-button>

        <s-stack gap="large" direction="block">
          {/* Success banners */}
          {wasSeeded && (
            <s-banner tone="info" dismissible>
              Welcome! We&apos;ve loaded {templates.length} starter templates to help you get started.
            </s-banner>
          )}
          {actionData?.action === "resetToDefaults" && (
            <s-banner tone="success" dismissible>
              Templates reset to defaults successfully.
            </s-banner>
          )}
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
          {actionData?.action === "update" && (
            <s-banner tone="success" dismissible>
              Template updated successfully.
            </s-banner>
          )}
          {actionData?.action === "duplicate" && (
            <s-banner tone="success" dismissible>
              Template duplicated successfully.
            </s-banner>
          )}

          <s-section padding={templates.length > 0 ? "base" : "none"}>
            <s-stack gap="base" direction="block">
              {/* Filters */}
              <FilterButtonGroup
                options={FILTER_OPTIONS}
                value={currentCategory}
                onChange={handleFilterChange}
              />

              {/* Grid or Empty State */}
              {templates.length > 0 ? (
                <TemplateGrid
                  templates={templates}
                  onUseAsIs={handleUseAsIs}
                  onCustomize={handleCustomize}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ) : (
                <EmptyState
                  heading="No templates yet"
                  description="Create your first template or save one from the Generate page."
                  image="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
                  primaryAction={{
                    label: "Create Template",
                    onClick: () => {
                      setEditingTemplate(null);
                      setShowEditor(true);
                    }
                  }}
                />
              )}
            </s-stack>
          </s-section>
        </s-stack>
      </s-page>

      {/* Modal using s-modal */}
      {showEditor && (
        <TemplateEditorModal
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
