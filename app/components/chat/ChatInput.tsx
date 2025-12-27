/**
 * ChatInput component - Input field with send/stop button
 * Uses Polaris s-text-area with accessory button
 * Supports Enter to send, Shift+Enter for newline
 */
import { useState, useCallback, useEffect, useRef } from "react";

export interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  placeholder = "Describe changes to your section...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleSubmit = useCallback(() => {
    if (isStreaming) {
      onStop?.();
      return;
    }

    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue("");
  }, [value, disabled, isStreaming, onSend, onStop]);

  // Handle input changes from Polaris text-area
  const handleInput = useCallback((e: Event) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    setValue(target.value || "");
  }, []);

  // Get ref to the internal textarea for keyboard handling
  const handleRef = useCallback((el: HTMLElement | null) => {
    containerRef.current = el;
    if (el) {
      // s-text-area may have internal textarea we can attach to
      const textarea = el.querySelector("textarea");
      textareaRef.current = textarea;
    }
  }, []);

  // Attach keydown handler to the internal textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to send, Shift+Enter for newline
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    textarea.addEventListener("keydown", handleKeyDown);
    return () => textarea.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit]);

  const hasValue = value.trim().length > 0;

  return (
    <s-box
      padding="base"
      borderWidth="small none none none"
      borderColor="subdued"
      background="base"
    >
      <div className="chat-input-container" style={{ position: "relative" }}>
        <s-box inlineSize="100%">
          <s-text-area
            ref={handleRef}
            label=""
            value={value}
            placeholder={placeholder}
            disabled={disabled || undefined}
            rows={3}
            onInput={handleInput}
          />
        </s-box>
        <div style={{ position: "absolute", bottom: "8px", right: "8px" }}>
          <s-button
            variant="primary"
            tone={isStreaming ? "critical" : undefined}
            onClick={handleSubmit}
            disabled={
              (!hasValue && !isStreaming) ||
              (disabled && !isStreaming) ||
              undefined
            }
            accessibilityLabel={
              isStreaming ? "Stop generation" : "Send message"
            }
            icon={isStreaming ? "stop-circle" : "send"}
          />
        </div>
      </div>
      {/* Hint text */}
      <s-box paddingBlockStart="small-100">
        <s-text color="subdued">
          Press Enter to send, Shift + Enter for new line
        </s-text>
      </s-box>
    </s-box>
  );
}
