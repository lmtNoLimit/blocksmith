/**
 * PolarisEditorLayout - 3-column editor layout using 100% Polaris Web Components
 *
 * Layout: Chat (350px) | Preview/Code (1fr) | Settings (280px)
 * Responsive: Uses s-query-container for mobile detection, stacks to single column with tab navigation
 */
import { useState, useEffect, useRef, type ReactNode } from "react";

interface PolarisEditorLayoutProps {
  chatPanel: ReactNode;
  codePreviewPanel: ReactNode;
  settingsPanel: ReactNode;
}

type MobileTab = "chat" | "editor" | "settings";

export function PolarisEditorLayout({
  chatPanel,
  codePreviewPanel,
  settingsPanel,
}: PolarisEditorLayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("editor");
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate remaining height dynamically
  useEffect(() => {
    const calculateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const remainingHeight = window.innerHeight - rect.top - 16;
        setContainerHeight(Math.max(remainingHeight, 400));
      }
    };

    const timer = setTimeout(calculateHeight, 100);
    window.addEventListener("resize", calculateHeight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculateHeight);
    };
  }, []);

  return (
    <div ref={containerRef}>
      <s-query-container containerName="editor-layout">
        <s-box
          minBlockSize={`${containerHeight}px`}
          blockSize={`${containerHeight}px`}
          overflow="hidden"
        >
          {/* Mobile layout - shown when container < 900px */}
          <s-box
            display="@container editor-layout (inline-size > 900px) none, auto"
            blockSize="100%"
          >
            <s-stack direction="block" gap="none" blockSize="100%">
              {/* Mobile tab navigation */}
              <s-box
                padding="base"
                background="base"
                borderWidth="none none small none"
                borderColor="subdued"
              >
                <s-button-group gap="none" accessibilityLabel="Editor panels">
                  <s-button
                    variant={activeTab === "chat" ? "primary" : "secondary"}
                    onClick={() => setActiveTab("chat")}
                  >
                    Chat
                  </s-button>
                  <s-button
                    variant={activeTab === "editor" ? "primary" : "secondary"}
                    onClick={() => setActiveTab("editor")}
                  >
                    Editor
                  </s-button>
                  <s-button
                    variant={activeTab === "settings" ? "primary" : "secondary"}
                    onClick={() => setActiveTab("settings")}
                  >
                    Settings
                  </s-button>
                </s-button-group>
              </s-box>

              {/* Active panel content - mobile */}
              <s-box blockSize="100%" minBlockSize="0" overflow="hidden">
                <s-box
                  display={activeTab === "chat" ? "auto" : "none"}
                  blockSize="100%"
                  background="base"
                  borderRadius="large"
                >
                  {chatPanel}
                </s-box>
                <s-box
                  display={activeTab === "editor" ? "auto" : "none"}
                  blockSize="100%"
                  background="base"
                  borderRadius="large"
                  overflow="hidden"
                >
                  {codePreviewPanel}
                </s-box>
                <s-box
                  display={activeTab === "settings" ? "auto" : "none"}
                  blockSize="100%"
                  background="base"
                  borderRadius="large"
                  // overflow="hidden"
                  padding="base"
                >
                  {settingsPanel}
                </s-box>
              </s-box>
            </s-stack>
          </s-box>

          {/* Desktop 3-column layout - shown when container >= 900px */}
          <s-box
            display="@container editor-layout (inline-size > 900px) auto, none"
            blockSize="100%"
          >
            <s-grid
              gap="base"
              gridTemplateColumns="350px 1fr 280px"
              blockSize="100%"
              alignItems="stretch"
            >
              {/* Chat Panel */}
              <s-box
                background="base"
                borderRadius="large"
                overflow="hidden"
                minBlockSize="0"
                blockSize="100%"
              >
                {chatPanel}
              </s-box>

              {/* Code/Preview Panel */}
              <s-box
                background="base"
                borderRadius="large"
                overflow="hidden"
                minBlockSize="0"
                minInlineSize="0"
              >
                {codePreviewPanel}
              </s-box>

              {/* Settings Panel */}
              <s-box
                background="base"
                borderRadius="large"
                overflow="hidden"
                minBlockSize="0"
              >
                {settingsPanel}
              </s-box>
            </s-grid>
          </s-box>
        </s-box>
      </s-query-container>
    </div>
  );
}
