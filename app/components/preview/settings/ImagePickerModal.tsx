/**
 * ImagePickerModal Component
 * Modal for selecting images from Shopify Files library
 * Uses Polaris s-modal with commandFor/command pattern
 */

import { useState, useEffect, useCallback, useRef } from "react";

export const IMAGE_PICKER_MODAL_ID = "image-picker-modal";

interface ShopifyFile {
  id: string;
  alt: string | null;
  createdAt: string;
  image: {
    url: string;
    width: number;
    height: number;
  } | null;
  filename?: string;
}

interface FilesResponse {
  files: ShopifyFile[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  error?: string;
}

export function ImagePickerModal() {
  const [files, setFiles] = useState<ShopifyFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<ShopifyFile | null>(null);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const currentSettingId = useRef<string | null>(null);

  // Fetch files from API
  const fetchFiles = useCallback(
    async (append = false, cursor: string | null = null) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          first: "20",
          ...(cursor && { after: cursor }),
          ...(searchQuery && { query: searchQuery }),
        });

        const response = await fetch(`/api/files?${params}`);
        const data: FilesResponse = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setFiles((prev) => (append ? [...prev, ...data.files] : data.files));
        setHasNextPage(data.pageInfo.hasNextPage);
        setEndCursor(data.pageInfo.endCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load images");
        console.error("Failed to fetch files:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery]
  );

  // Listen for open events from ImageSetting components
  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ settingId: string }>;
      currentSettingId.current = customEvent.detail.settingId;
      setSelectedFile(null);
      setSearchQuery("");
      fetchFiles(false, null);
    };

    window.addEventListener("image-picker-open", handleOpen);
    return () => {
      window.removeEventListener("image-picker-open", handleOpen);
    };
  }, [fetchFiles]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentSettingId.current) {
        fetchFiles(false, null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchFiles]);

  const handleLoadMore = () => {
    if (hasNextPage && endCursor) {
      fetchFiles(true, endCursor);
    }
  };

  const handleSelect = () => {
    if (selectedFile?.image?.url && currentSettingId.current) {
      // Dispatch event with selected image
      window.dispatchEvent(new CustomEvent('image-picker-select', {
        detail: {
          settingId: currentSettingId.current,
          imageUrl: selectedFile.image.url,
          alt: selectedFile.alt
        }
      }));
    }
  };

  const handleFileClick = (file: ShopifyFile) => {
    setSelectedFile(file);
  };

  // Format file size or dimensions for display
  const formatDimensions = (file: ShopifyFile) => {
    if (file.image) {
      return `${file.image.width} × ${file.image.height}`;
    }
    return "";
  };

  return (
    <s-modal id={IMAGE_PICKER_MODAL_ID} heading="Select Image" size="large">
      {/* Search Bar */}
      <div style={{ marginBottom: "16px" }}>
        <s-text-field
          label=""
          placeholder="Search files"
          value={searchQuery}
          onInput={(e: Event) =>
            setSearchQuery((e.target as HTMLInputElement).value)
          }
        />
      </div>

      {/* Error State */}
      {error && (
        <s-banner tone="critical" dismissible>
          {error}
        </s-banner>
      )}

      {/* Loading State */}
      {isLoading && files.length === 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "12px",
            padding: "16px 0",
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                backgroundColor: "#f1f2f4",
                borderRadius: "8px",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && files.length === 0 && !error && (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "#6d7175",
          }}
        >
          <p style={{ margin: 0 }}>No images found</p>
          {searchQuery && (
            <p style={{ margin: "8px 0 0", fontSize: "13px" }}>
              Try a different search term
            </p>
          )}
        </div>
      )}

      {/* Image Grid */}
      {files.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: "12px",
            maxHeight: "400px",
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => handleFileClick(file)}
              style={{
                position: "relative",
                aspectRatio: "1",
                border:
                  selectedFile?.id === file.id
                    ? "2px solid #008060"
                    : "1px solid #e1e3e5",
                borderRadius: "8px",
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                background: "#f6f6f7",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                if (selectedFile?.id !== file.id) {
                  e.currentTarget.style.borderColor = "#8c9196";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedFile?.id !== file.id) {
                  e.currentTarget.style.borderColor = "#e1e3e5";
                }
              }}
            >
              {file.image?.url && (
                <img
                  src={file.image.url}
                  alt={file.alt || file.filename || "Image"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  loading="lazy"
                />
              )}

              {/* Selection checkmark */}
              {selectedFile?.id === file.id && (
                <div
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#008060",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 20 20"
                    fill="white"
                  >
                    <path d="M8.72 15.78a.75.75 0 0 1-1.06 0l-4.44-4.44a.75.75 0 1 1 1.06-1.06l3.91 3.91 7.97-7.97a.75.75 0 1 1 1.06 1.06l-8.5 8.5Z" />
                  </svg>
                </div>
              )}

              {/* Filename overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "4px 6px",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                  color: "white",
                  fontSize: "10px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {file.filename || "Image"}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasNextPage && (
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <s-button
            variant="tertiary"
            onClick={handleLoadMore}
            loading={isLoading || undefined}
          >
            Load more
          </s-button>
        </div>
      )}

      {/* Selected Image Info */}
      {selectedFile && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#f1f2f4",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {selectedFile.image?.url && (
            <img
              src={selectedFile.image.url}
              alt={selectedFile.alt || "Selected"}
              style={{
                width: "48px",
                height: "48px",
                objectFit: "cover",
                borderRadius: "4px",
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {selectedFile.filename || "Selected image"}
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175" }}>
              {formatDimensions(selectedFile)}
            </div>
          </div>
        </div>
      )}

      {/* Modal Actions - using commandFor/command pattern */}
      <s-button
        slot="secondary-actions"
        commandFor={IMAGE_PICKER_MODAL_ID}
        command="--hide"
      >
        Cancel
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        commandFor={IMAGE_PICKER_MODAL_ID}
        command="--hide"
        onClick={handleSelect}
        disabled={!selectedFile || undefined}
      >
        Done
      </s-button>
    </s-modal>
  );
}
