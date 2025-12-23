import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  useActionData,
  useLoaderData,
  useSearchParams,
  useSubmit,
  useNavigate,
  useNavigation,
} from "react-router";
import {
  IndexTable,
  IndexFilters,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import type { IndexTableProps, IndexFiltersProps } from "@shopify/polaris";

type IndexTableHeading = IndexTableProps["headings"][number];
import { authenticate } from "../shopify.server";
import { sectionService } from "../services/section.server";
import { SectionsEmptyState } from "../components/sections/SectionsEmptyState";
import { EmptySearchResult } from "../components/common/EmptySearchResult";
import { DeleteConfirmModal } from "../components/sections/DeleteConfirmModal";

// View type for tab switching - 5 tabs
type ViewType = "all" | "draft" | "active" | "inactive" | "archive";

import type { SectionStatus } from "../types/section-status";
import { SECTION_STATUS, getStatusDisplayName, getStatusBadgeTone } from "../types/section-status";

// Map view tabs to status filters
const viewStatusMap: Record<ViewType, SectionStatus | undefined> = {
  all: undefined,
  draft: SECTION_STATUS.DRAFT,
  active: SECTION_STATUS.ACTIVE,
  inactive: SECTION_STATUS.INACTIVE,
  archive: SECTION_STATUS.ARCHIVE,
};

// Tab definitions for IndexFilters - 5 tabs
const tabs: IndexFiltersProps["tabs"] = [
  { id: "all", content: "All" },
  { id: "draft", content: "Draft" },
  { id: "active", content: "Active" },
  { id: "inactive", content: "Inactive" },
  { id: "archive", content: "Archive" },
];

// Map tab index to view type - 5 tabs
const tabIndexToView: ViewType[] = ["all", "draft", "active", "inactive", "archive"];
const viewToTabIndex: Record<ViewType, number> = {
  all: 0,
  draft: 1,
  active: 2,
  inactive: 3,
  archive: 4,
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const view = (url.searchParams.get("view") || "all") as ViewType;
  const search = url.searchParams.get("search") || undefined;
  const sort = url.searchParams.get("sort") || "newest";

  // Status is derived from the selected tab/view
  const status = viewStatusMap[view];

  // Fetch both filtered results and total count (for empty state logic)
  const [history, allTotal] = await Promise.all([
    sectionService.getByShop(shop, {
      page,
      limit: 20,
      status,
      search,
      sort: sort as "newest" | "oldest",
    }),
    sectionService.getTotalCount(shop),
  ]);

  return { history, shop, currentView: view, allTotal };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

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
    let ids: string[];
    try {
      ids = JSON.parse(idsJson) as string[];
      if (!Array.isArray(ids)) throw new Error("Invalid format");
    } catch {
      return {
        success: false,
        action: "bulkDelete",
        message: "Invalid request",
      };
    }

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

  if (actionType === "bulkArchive") {
    const idsJson = formData.get("ids") as string;
    let ids: string[];
    try {
      ids = JSON.parse(idsJson) as string[];
      if (!Array.isArray(ids)) throw new Error("Invalid format");
    } catch {
      return {
        success: false,
        action: "bulkArchive",
        message: "Invalid request",
      };
    }

    // Archive in parallel, max 50 at a time
    const idsToArchive = ids.slice(0, 50);
    await Promise.all(idsToArchive.map((id) => sectionService.archive(id, shop)));

    return {
      success: true,
      action: "bulkArchive",
      message: `${idsToArchive.length} section${idsToArchive.length > 1 ? "s" : ""} archived.`,
      archivedCount: idsToArchive.length,
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

// Column headings for IndexTable
const headings: [IndexTableHeading, ...IndexTableHeading[]] = [
  { title: "Name" },
  { title: "Status" },
  { title: "Theme" },
  { title: "Created" },
];

// Sort options for IndexFilters
const sortOptions: IndexFiltersProps["sortOptions"] = [
  {
    label: "Date created",
    value: "createdAt desc",
    directionLabel: "Newest first",
  },
  {
    label: "Date created",
    value: "createdAt asc",
    directionLabel: "Oldest first",
  },
];

// Map sort option value to loader format
const sortValueMap: Record<string, "newest" | "oldest"> = {
  "createdAt desc": "newest",
  "createdAt asc": "oldest",
};

const sortToOptionValue: Record<string, string> = {
  newest: "createdAt desc",
  oldest: "createdAt asc",
};

// Simple debounce utility with cancel method
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
  debouncedFn.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
  return debouncedFn;
}

// Map view types to user-friendly tab names for empty state messages
const viewDisplayNames: Record<ViewType, string> = {
  all: "sections",
  draft: "draft sections",
  active: "active sections",
  inactive: "inactive sections",
  archive: "archived sections",
};

export default function SectionsPage() {
  const { history, currentView, allTotal } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selection state using Polaris hook
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(history.items);

  // IndexFilters mode state
  const { mode, setMode } = useSetIndexFiltersMode();

  // Tab selection state - derived from URL
  const selectedTab = viewToTabIndex[currentView] ?? 0;

  // Filter state - initialized from URL params
  const [queryValue, setQueryValue] = useState(
    searchParams.get("search") || "",
  );
  const [sortSelected, setSortSelected] = useState<string[]>([
    sortToOptionValue[searchParams.get("sort") || "newest"] || "createdAt desc",
  ]);

  // Ref to track if URL change is from user action (prevent infinite loop)
  const isUserAction = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState<"single" | "bulk">("single");
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  // Modal ID for commandFor pattern (s-modal still used)
  const DELETE_MODAL_ID = "delete-confirm-modal";

  // Ref to hidden s-button that triggers the modal (web component)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modalTriggerRef = useRef<any>(null);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const isDeleting =
    navigation.state === "submitting" &&
    (navigation.formData?.get("action") === "delete" ||
      navigation.formData?.get("action") === "bulkDelete");

  // Opens modal programmatically by clicking hidden s-button
  const openDeleteModal = useCallback(() => {
    modalTriggerRef.current?.click();
  }, []);

  const handleDeleteClick = useCallback(
    (id: string) => {
      setSingleDeleteId(id);
      setDeleteTarget("single");
      openDeleteModal();
    },
    [openDeleteModal],
  );

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedResources.length === 0) return;
    setDeleteTarget("bulk");
    openDeleteModal();
  }, [selectedResources.length, openDeleteModal]);

  const handleBulkArchiveClick = useCallback(() => {
    if (selectedResources.length === 0) return;
    const formData = new FormData();
    formData.append("action", "bulkArchive");
    formData.append("ids", JSON.stringify(selectedResources));
    submit(formData, { method: "post" });
    // Clear selection after bulk archive
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleSelectionChange("all" as any, false);
  }, [selectedResources, submit, handleSelectionChange]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget === "single" && singleDeleteId) {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("id", singleDeleteId);
      submit(formData, { method: "post" });
    } else if (deleteTarget === "bulk") {
      const formData = new FormData();
      formData.append("action", "bulkDelete");
      formData.append("ids", JSON.stringify(selectedResources));
      submit(formData, { method: "post" });
      // Clear selection after bulk delete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleSelectionChange("all" as any, false);
    }
    setSingleDeleteId(null);
  }, [
    deleteTarget,
    singleDeleteId,
    selectedResources,
    submit,
    handleSelectionChange,
  ]);

  // Pagination handlers
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

  // Debounced search handler - updates URL after 300ms delay
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        isUserAction.current = true;
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set("search", value);
        } else {
          params.delete("search");
        }
        params.set("page", "1"); // Reset to page 1
        setSearchParams(params);
      }, 300),
    [searchParams, setSearchParams],
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQueryValue(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleQueryClear = useCallback(() => {
    setQueryValue("");
    isUserAction.current = true;
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("page", "1");
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Tab change handler
  const handleTabChange = useCallback(
    (index: number) => {
      const view = tabIndexToView[index];
      isUserAction.current = true;
      const params = new URLSearchParams(searchParams);
      if (view === "all") {
        params.delete("view");
      } else {
        params.set("view", view);
      }
      params.set("page", "1"); // Reset to page 1
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  // No additional filters since tabs handle status
  const filters: IndexFiltersProps["filters"] = [];
  const appliedFilters: IndexFiltersProps["appliedFilters"] = [];

  // Sync sort state changes to URL
  useEffect(() => {
    // Skip on initial mount (URL params already set)
    if (!isUserAction.current) {
      isUserAction.current = true;
      return;
    }

    const params = new URLSearchParams(searchParams);

    // Sync sort
    const sortValue = sortValueMap[sortSelected[0]] || "newest";
    if (sortValue !== "newest") {
      params.set("sort", sortValue);
    } else {
      params.delete("sort");
    }

    params.set("page", "1"); // Reset pagination
    setSearchParams(params);

    // Reset flag to prevent double-sync from URL change callback
    isUserAction.current = false;
    requestAnimationFrame(() => {
      isUserAction.current = true;
    });
  }, [sortSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear all filters and reset to default
  const handleClearAll = useCallback(() => {
    setQueryValue("");
    setSortSelected(["createdAt desc"]);
    isUserAction.current = true;
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Show toast for action success messages
  useEffect(() => {
    if (actionData?.success && actionData.message) {
      shopify.toast.show(actionData.message);
    }
  }, [actionData]);

  // Promoted bulk actions for IndexTable
  const promotedBulkActions = [
    {
      content: "Archive",
      onAction: handleBulkArchiveClick,
    },
    {
      content: "Delete",
      destructive: true,
      onAction: handleBulkDeleteClick,
    },
  ];

  // Pagination config
  const paginationProps: IndexTableProps["pagination"] = {
    hasNext: currentPage < history.totalPages,
    hasPrevious: currentPage > 1,
    onNext: handleNextPage,
    onPrevious: handlePreviousPage,
    label: `Page ${currentPage} of ${history.totalPages}`,
  };

  // Row markup for IndexTable (using s-* web components inside cells)
  // Using onNavigation with data-primary-link attribute for proper row navigation
  const rowMarkup = history.items.map((item, index) => (
    <IndexTable.Row
      id={item.id}
      key={item.id}
      selected={selectedResources.includes(item.id)}
      position={index}
      onNavigation={() => navigate(`/app/sections/${item.id}`)}
    >
      <IndexTable.Cell>
        <a
          href={`/app/sections/${item.id}`}
          data-primary-link
          onClick={(e) => e.preventDefault()}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {item.name || truncateText(item.prompt, 50)}
        </a>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <s-badge tone={getStatusBadgeTone(item.status as SectionStatus)}>
          {getStatusDisplayName(item.status as SectionStatus)}
        </s-badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {item.themeName ? (
          <s-text>{truncateText(item.themeName, 20)}</s-text>
        ) : (
          <s-text color="subdued">-</s-text>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <s-text color="subdued">{formatRelativeDate(item.createdAt)}</s-text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  // Determine which empty state to show:
  // 1. If allTotal === 0 → true empty state (no sections at all)
  // 2. If allTotal > 0 but history.total === 0 → empty search/filter result
  const showTrueEmptyState = allTotal === 0;

  // Generate dynamic empty search result message based on context
  const getEmptySearchTitle = () => {
    if (queryValue) {
      return `No ${viewDisplayNames[currentView]} found`;
    }
    return `No ${viewDisplayNames[currentView]}`;
  };

  const getEmptySearchDescription = () => {
    if (queryValue) {
      return `Try adjusting your search or filters to find what you're looking for.`;
    }
    switch (currentView) {
      case "draft":
        return "Sections you create start here. Edit and publish to make them active.";
      case "active":
        return "Sections currently published to themes appear here.";
      case "inactive":
        return "Sections that were unpublished from themes appear here.";
      case "archive":
        return "Soft-deleted sections that can be restored appear here.";
      default:
        return "";
    }
  };

  // Empty state component for IndexTable
  const emptyStateMarkup = showTrueEmptyState ? (
    <SectionsEmptyState onCreateNew={() => navigate("/app/sections/new")} />
  ) : (
    <EmptySearchResult
      title={getEmptySearchTitle()}
      description={getEmptySearchDescription()}
    />
  );

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

        {/* Table section with IndexFilters + IndexTable */}
        <s-section padding="none" accessibilityLabel="Sections table">
          <IndexFilters
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            onSort={setSortSelected}
            queryValue={queryValue}
            queryPlaceholder="Search sections..."
            onQueryChange={handleQueryChange}
            onQueryClear={handleQueryClear}
            filters={filters}
            appliedFilters={appliedFilters}
            onClearAll={handleClearAll}
            mode={mode}
            setMode={setMode}
            tabs={tabs}
            selected={selectedTab}
            onSelect={handleTabChange}
            canCreateNewView={false}
          />
          <IndexTable
            resourceName={{ singular: "section", plural: "sections" }}
            itemCount={history.total}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            selectable
            onSelectionChange={handleSelectionChange}
            headings={headings}
            promotedBulkActions={promotedBulkActions}
            pagination={paginationProps}
            loading={navigation.state === "loading"}
            emptyState={emptyStateMarkup}
          >
            {rowMarkup}
          </IndexTable>
        </s-section>

        {/* Results count - Shopify Products style: "1-20 of 50" */}
        {history.total > 0 && (
          <s-stack alignItems="center">
            <s-text>
              Learn more about{" "}
              <s-link href="https://shopify.dev/">sections</s-link>
            </s-text>
          </s-stack>
        )}
      </s-page>

      {/* Hidden button to trigger s-modal programmatically */}
      <div style={{ display: "none" }}>
        <s-button
          ref={modalTriggerRef}
          command="--show"
          commandFor={DELETE_MODAL_ID}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        id={DELETE_MODAL_ID}
        isBulk={deleteTarget === "bulk"}
        count={deleteTarget === "bulk" ? selectedResources.length : 1}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
