import { useState, useCallback, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  useActionData,
  useLoaderData,
  useSearchParams,
  useSubmit,
  useNavigate,
  useNavigation,
} from "react-router";
import { authenticate } from "../shopify.server";
import { sectionService } from "../services/section.server";
import { SectionsEmptyState } from "../components/sections/SectionsEmptyState";
import { DeleteConfirmModal } from "../components/sections/DeleteConfirmModal";

// Type alias for Shopify web component events (they don't use React event types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShopifyEvent = any;

// View type for tab switching
type ViewType = "all" | "active" | "draft" | "archived";

// Map view tabs to status filters
const viewStatusMap: Record<ViewType, string | undefined> = {
  all: undefined,
  active: "saved",
  draft: "generated",
  archived: undefined, // TODO: implement archived flag in future
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const view = (url.searchParams.get("view") || "all") as ViewType;
  const statusParam = url.searchParams.get("status") || "";
  const favoritesOnly = url.searchParams.get("favorites") === "true";
  const search = url.searchParams.get("search") || undefined;
  const sort = url.searchParams.get("sort") || "newest";

  // Parse multi-status from comma-separated param
  const statusArray = statusParam.split(",").filter(Boolean);

  // Determine final status filter: explicit param > view-derived
  let status: string | undefined;
  if (statusArray.length === 1) {
    status = statusArray[0];
  } else if (statusArray.length === 0) {
    status = viewStatusMap[view];
  }
  // If multiple statuses selected, we filter client-side (getByShop doesn't support multi-status yet)

  const history = await sectionService.getByShop(shop, {
    page,
    limit: 20,
    status,
    favoritesOnly,
    search,
    sort: sort as "newest" | "oldest",
  });

  return { history, shop, currentView: view, statusFilter: statusArray };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "toggleFavorite") {
    const id = formData.get("id") as string;
    await sectionService.toggleFavorite(id, shop);
    return { success: true, action: "toggleFavorite" };
  }

  if (actionType === "delete") {
    const id = formData.get("id") as string;
    await sectionService.delete(id, shop);
    return {
      success: true,
      action: "delete",
      message: "Section deleted successfully.",
    };
  }

  if (actionType === "bulkDelete") {
    const idsJson = formData.get("ids") as string;
    const ids = JSON.parse(idsJson) as string[];

    // Delete in parallel, max 50 at a time
    const idsToDelete = ids.slice(0, 50);
    await Promise.all(idsToDelete.map((id) => sectionService.delete(id, shop)));

    return {
      success: true,
      action: "bulkDelete",
      message: `${idsToDelete.length} section${idsToDelete.length > 1 ? "s" : ""} deleted successfully.`,
      deletedCount: idsToDelete.length,
    };
  }

  return null;
}

function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export default function SectionsPage() {
  const { history } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<"single" | "bulk">("single");
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  // Modal ID for commandFor pattern
  const DELETE_MODAL_ID = "delete-confirm-modal";

  // Use any type for ref since Shopify web components have specific types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableRef = useRef<any>(null);
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const isDeleting =
    navigation.state === "submitting" &&
    (navigation.formData?.get("action") === "delete" ||
      navigation.formData?.get("action") === "bulkDelete");

  const handleToggleFavorite = (id: string) => {
    const formData = new FormData();
    formData.append("action", "toggleFavorite");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  const handleDeleteClick = (id: string) => {
    setSingleDeleteId(id);
    setDeleteTarget("single");
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setDeleteTarget("bulk");
  };

  const handleConfirmDelete = () => {
    if (deleteTarget === "single" && singleDeleteId) {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("id", singleDeleteId);
      submit(formData, { method: "post" });
    } else if (deleteTarget === "bulk") {
      const formData = new FormData();
      formData.append("action", "bulkDelete");
      formData.append("ids", JSON.stringify(Array.from(selectedIds)));
      submit(formData, { method: "post" });
      setSelectedIds(new Set());
    }
    setSingleDeleteId(null);
  };

  const handleSelectAll = (e: ShopifyEvent) => {
    if (e.currentTarget?.checked) {
      setSelectedIds(new Set(history.items.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, e: ShopifyEvent) => {
    const newSelected = new Set(selectedIds);
    if (e.currentTarget?.checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Pagination handlers for s-table
  const handleNextPage = useCallback(() => {
    if (currentPage < history.totalPages) {
      const params = new URLSearchParams(searchParams);
      params.set("page", (currentPage + 1).toString());
      setSearchParams(params);
    }
  }, [currentPage, history.totalPages, searchParams, setSearchParams]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const params = new URLSearchParams(searchParams);
      params.set("page", (currentPage - 1).toString());
      setSearchParams(params);
    }
  }, [currentPage, searchParams, setSearchParams]);

  // Attach pagination event listeners to table
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const nextHandler = () => handleNextPage();
    const prevHandler = () => handlePreviousPage();

    table.addEventListener("nextpage", nextHandler);
    table.addEventListener("previouspage", prevHandler);

    return () => {
      table.removeEventListener("nextpage", nextHandler);
      table.removeEventListener("previouspage", prevHandler);
    };
  }, [handleNextPage, handlePreviousPage]);

  const allSelected =
    history.items.length > 0 && selectedIds.size === history.items.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < history.items.length;

  // Show toast for delete success messages
  useEffect(() => {
    if (
      actionData?.success &&
      (actionData.action === "delete" || actionData.action === "bulkDelete")
    ) {
      shopify.toast.show(actionData.message || "Section deleted successfully");
    }
  }, [actionData]);

  return (
    <>
      <s-page heading="Sections" inlineSize="large">
        {/* Primary action button */}
        <s-button
          slot="primary-action"
          variant="primary"
          href="/app/sections/new"
        >
          Create Section
        </s-button>

        {/* Bulk action bar when items selected */}
        {selectedIds.size > 0 && (
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-stack
              direction="inline"
              alignItems="center"
              justifyContent="space-between"
            >
              <s-text>
                <strong>
                  {selectedIds.size} {selectedIds.size === 1 ? "item" : "items"}{" "}
                  selected
                </strong>
              </s-text>
              <s-button
                tone="critical"
                command="--show"
                commandFor={DELETE_MODAL_ID}
                onClick={handleBulkDeleteClick}
              >
                Delete selected
              </s-button>
            </s-stack>
          </s-box>
        )}

        {/* Table section */}
        <s-section padding="none" accessibilityLabel="Sections table">
          {history.items.length > 0 ? (
            <s-table
              ref={tableRef}
              paginate={history.totalPages > 1}
              hasPreviousPage={currentPage > 1}
              hasNextPage={currentPage < history.totalPages}
              loading={navigation.state === "loading"}
            >
              {/* Table header */}
              <s-table-header-row>
                {/* <s-table-header>
                  <s-checkbox
                    accessibilityLabel="Select all sections"
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                  />
                </s-table-header> */}
                <s-table-header listSlot="primary">Name</s-table-header>
                <s-table-header listSlot="inline">Status</s-table-header>
                <s-table-header listSlot="labeled">Theme</s-table-header>
                <s-table-header listSlot="labeled">Created</s-table-header>
                <s-table-header listSlot="labeled">Actions</s-table-header>
              </s-table-header-row>

              {/* Table body */}
              <s-table-body>
                {history.items.map((item) => (
                  <s-table-row key={item.id} clickDelegate={`link-${item.id}`}>
                    {/* <s-table-cell>
                      <s-checkbox
                        id={`checkbox-${item.id}`}
                        accessibilityLabel={`Select section: ${truncateText(item.prompt, 30)}`}
                        checked={selectedIds.has(item.id)}
                        onChange={(e: ShopifyEvent) =>
                          handleSelectOne(item.id, e)
                        }
                      />
                    </s-table-cell> */}
                    <s-table-cell>
                      <s-stack
                        gap="small"
                        direction="inline"
                        alignItems="center"
                      >
                        {item.isFavorite && (
                          <s-badge tone="warning" icon="star-filled">
                            Fav
                          </s-badge>
                        )}
                        <s-text
                          id={`link-${item.id}`}
                          // href={`/app/sections/${item.id}`}
                        >
                          {item.name || truncateText(item.prompt, 50)}
                        </s-text>
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      {item.status === "saved" ? (
                        <s-badge tone="success">Saved</s-badge>
                      ) : (
                        <s-badge tone="neutral">Draft</s-badge>
                      )}
                    </s-table-cell>
                    <s-table-cell>
                      {item.themeName ? (
                        <s-text>{truncateText(item.themeName, 20)}</s-text>
                      ) : (
                        <s-text color="subdued">-</s-text>
                      )}
                    </s-table-cell>
                    <s-table-cell>
                      <s-text color="subdued">
                        {formatRelativeDate(item.createdAt)}
                      </s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack
                        gap="small"
                        direction="inline"
                        // justifyContent="end"
                      >
                        <s-button
                          icon={item.isFavorite ? "star-filled" : "star"}
                          variant="tertiary"
                          accessibilityLabel={
                            item.isFavorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          onClick={() => handleToggleFavorite(item.id)}
                        />
                        <s-button
                          icon="delete"
                          variant="tertiary"
                          tone="critical"
                          accessibilityLabel="Delete section"
                          command="--show"
                          commandFor={DELETE_MODAL_ID}
                          onClick={() => handleDeleteClick(item.id)}
                        />
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          ) : (
            <SectionsEmptyState
              hasFilters={false}
              onClearFilters={() => setSearchParams(new URLSearchParams())}
              onCreateNew={() => navigate("/app/sections/new")}
            />
          )}
        </s-section>

        {/* Results count - Shopify Products style: "1-20 of 50" */}
        {history.total > 0 && (
          <s-box padding="base">
            <s-stack direction="inline" justifyContent="center" gap="base">
              <s-text color="subdued">
                {(history.page - 1) * 20 + 1}-
                {Math.min(history.page * 20, history.total)} of {history.total}
              </s-text>
            </s-stack>
          </s-box>
        )}
      </s-page>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        id={DELETE_MODAL_ID}
        isBulk={deleteTarget === "bulk"}
        count={deleteTarget === "bulk" ? selectedIds.size : 1}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
