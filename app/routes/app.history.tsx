import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useSearchParams, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import { historyService } from "../services/history.server";
import { HistoryList } from "../components/history/HistoryList";
import { HistoryPreview } from "../components/history/HistoryPreview";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const status = url.searchParams.get("status") || undefined;
  const favoritesOnly = url.searchParams.get("favorites") === "true";

  const history = await historyService.getByShop(shop, {
    page,
    limit: 20,
    status,
    favoritesOnly,
  });

  return { history };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "toggleFavorite") {
    const id = formData.get("id") as string;
    await historyService.toggleFavorite(id, shop);
    return { success: true, action: "toggleFavorite" };
  }

  if (actionType === "delete") {
    const id = formData.get("id") as string;
    await historyService.delete(id, shop);
    return { success: true, action: "delete" };
  }

  return null;
}

export default function HistoryPage() {
  const { history } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const [searchParams, setSearchParams] = useSearchParams();

  const [previewItem, setPreviewItem] = useState<typeof history.items[0] | null>(null);

  const currentStatus = searchParams.get("status") || "";
  const favoritesOnly = searchParams.get("favorites") === "true";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleFavoritesFilter = (favorites: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (favorites) {
      params.set("favorites", "true");
    } else {
      params.delete("favorites");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
  };

  const handleToggleFavorite = (id: string) => {
    const formData = new FormData();
    formData.append("action", "toggleFavorite");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this history entry?")) {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("id", id);
      submit(formData, { method: "post" });
    }
  };

  return (
    <>
      <s-page title="Generation History">
        <s-stack gap="400" vertical>
          {actionData?.action === "delete" && (
            <s-banner tone="success" dismissible>
              History entry deleted successfully.
            </s-banner>
          )}

          <s-card>
            <s-stack gap="400" vertical>
              {/* Filters */}
              <s-stack gap="300">
                <s-button
                  variant={!currentStatus && !favoritesOnly ? "primary" : "secondary"}
                  size="slim"
                  onClick={() => {
                    handleStatusFilter("");
                    handleFavoritesFilter(false);
                  }}
                >
                  All
                </s-button>
                <s-button
                  variant={currentStatus === "generated" ? "primary" : "secondary"}
                  size="slim"
                  onClick={() => handleStatusFilter("generated")}
                >
                  Generated
                </s-button>
                <s-button
                  variant={currentStatus === "saved" ? "primary" : "secondary"}
                  size="slim"
                  onClick={() => handleStatusFilter("saved")}
                >
                  Saved
                </s-button>
                <s-button
                  variant={favoritesOnly ? "primary" : "secondary"}
                  size="slim"
                  onClick={() => handleFavoritesFilter(!favoritesOnly)}
                >
                  Favorites
                </s-button>
              </s-stack>

              {/* History list */}
              <HistoryList
                items={history.items}
                onPreview={setPreviewItem}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />

              {/* Pagination */}
              {history.totalPages > 1 && (
                <s-stack gap="200" distribution="center">
                  <s-button
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    size="slim"
                  >
                    Previous
                  </s-button>
                  <s-text variant="bodySm" tone="subdued">
                    Page {history.page} of {history.totalPages}
                  </s-text>
                  <s-button
                    disabled={currentPage >= history.totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    size="slim"
                  >
                    Next
                  </s-button>
                </s-stack>
              )}

              {/* Empty state */}
              {history.items.length === 0 && (
                <s-stack gap="400" vertical align="center">
                  <s-text variant="headingMd" tone="subdued">
                    No history entries found
                  </s-text>
                  <s-text tone="subdued">
                    Generate some sections to see them here.
                  </s-text>
                </s-stack>
              )}
            </s-stack>
          </s-card>
        </s-stack>
      </s-page>

      {/* Preview modal */}
      {previewItem && (
        <HistoryPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </>
  );
}
