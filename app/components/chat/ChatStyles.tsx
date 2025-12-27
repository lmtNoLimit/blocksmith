/**
 * ChatStyles component - injects chat styles into the document
 * Uses reference counting to handle multiple instances
 *
 * Contains animations and enhancements for polished chat UX
 */
import { useEffect } from 'react';

const STYLE_ID = 'chat-component-styles';
let styleRefCount = 0;

const chatCSS = `
/* ========================================
   Chat Component Styles
   Polished animations and visual enhancements
   ======================================== */

/* ===== Message Animations ===== */

/* Fade-in animation for new messages */
.chat-message-enter {
  animation: chat-message-fade-in 0.3s ease-out forwards;
}

@keyframes chat-message-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== Streaming Cursor ===== */
.chat-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: linear-gradient(180deg, var(--p-color-text) 0%, var(--p-color-text-secondary) 100%);
  margin-left: 2px;
  border-radius: 1px;
  animation: chat-cursor-blink 1s ease-in-out infinite;
}

@keyframes chat-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ===== Typing Indicator ===== */
.chat-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.chat-typing__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--p-color-text-secondary);
  animation: chat-typing-bounce 1.4s infinite ease-in-out;
}

.chat-typing__dot:nth-child(1) {
  animation-delay: 0s;
}

.chat-typing__dot:nth-child(2) {
  animation-delay: 0.16s;
}

.chat-typing__dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes chat-typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* ===== Message Bubble Styles ===== */

/* User message bubble - gradient background */
.chat-bubble--user {
  background: linear-gradient(135deg,
    var(--p-color-bg-fill-brand) 0%,
    var(--p-color-bg-fill-brand-hover) 100%
  ) !important;
  color: var(--p-color-text-brand-on-bg-fill) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* AI message bubble - subtle styling */
.chat-bubble--ai {
  background: var(--p-color-bg-surface-secondary) !important;
  border: 1px solid var(--p-color-border-secondary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* ===== Avatar Enhancements ===== */

/* AI Avatar with gradient ring */
.chat-avatar--ai {
  position: relative;
}

.chat-avatar--ai::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: linear-gradient(135deg,
    var(--p-color-bg-fill-success) 0%,
    var(--p-color-bg-fill-info) 100%
  );
  z-index: -1;
  opacity: 0.8;
}

/* User Avatar styling */
.chat-avatar--user {
  position: relative;
}

.chat-avatar--user::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: var(--p-color-bg-fill-brand);
  z-index: -1;
  opacity: 0.3;
}

/* ===== Version Card Styles ===== */

/* Version card with hover effect */
.chat-version-card {
  transition: all 0.2s ease;
  cursor: default;
}

.chat-version-card:hover {
  border-color: var(--p-color-border-brand) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Active version card highlight */
.chat-version-card--active {
  background: linear-gradient(135deg,
    var(--p-color-bg-surface-success) 0%,
    var(--p-color-bg-surface) 100%
  ) !important;
  border-color: var(--p-color-border-success) !important;
}

/* Selected version card */
.chat-version-card--selected {
  border-color: var(--p-color-border-brand) !important;
  box-shadow: 0 0 0 1px var(--p-color-border-brand);
}

/* Version badge */
.chat-version-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--p-color-bg-fill-success);
  color: var(--p-color-text-success-on-bg-fill);
  font-size: 12px;
  font-weight: 600;
}

/* ===== Input Area Styles ===== */

/* Send button with gradient */
.chat-send-btn {
  background: linear-gradient(135deg,
    var(--p-color-bg-fill-brand) 0%,
    var(--p-color-bg-fill-brand-hover) 100%
  ) !important;
  transition: all 0.2s ease;
}

.chat-send-btn:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.chat-send-btn:active:not(:disabled) {
  transform: scale(0.98);
}

/* Stop button styling */
.chat-stop-btn {
  background: linear-gradient(135deg,
    var(--p-color-bg-fill-critical) 0%,
    var(--p-color-bg-fill-critical-hover) 100%
  ) !important;
}

/* Input container focus state */
.chat-input-container:focus-within {
  box-shadow: 0 0 0 2px var(--p-color-border-brand);
  border-radius: var(--p-border-radius-200);
}

/* ===== Empty State Styles ===== */

/* Empty state icon container */
.chat-empty-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg,
    var(--p-color-bg-surface-secondary) 0%,
    var(--p-color-bg-surface-tertiary) 100%
  );
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.chat-empty-icon s-icon {
  transform: scale(1.5);
  color: var(--p-color-icon-secondary);
}

/* Suggestion chips */
.chat-suggestion {
  display: inline-flex;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--p-color-bg-surface-secondary);
  border: 1px solid var(--p-color-border-secondary);
  color: var(--p-color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-suggestion:hover {
  background: var(--p-color-bg-surface-hover);
  border-color: var(--p-color-border-brand);
  color: var(--p-color-text);
}

/* ===== Header Styles ===== */

/* Header title with icon */
.chat-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-header-title s-icon {
  color: var(--p-color-icon-brand);
}

/* Version dropdown enhancement */
.chat-version-dropdown {
  min-width: 140px;
}

/* ===== Scrollbar Styling ===== */
.chat-scroll::-webkit-scrollbar {
  width: 6px;
}

.chat-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.chat-scroll::-webkit-scrollbar-thumb {
  background: var(--p-color-border-secondary);
  border-radius: 3px;
}

.chat-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--p-color-border);
}

/* ===== Utility Classes ===== */

.chat-transition {
  transition: all 0.2s ease;
}

.chat-shadow-sm {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.chat-shadow-md {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
`;

export function ChatStyles() {
  useEffect(() => {
    // Increment reference count
    styleRefCount++;

    // Only inject if this is the first instance
    if (styleRefCount === 1) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = chatCSS;
      document.head.appendChild(style);
    }

    // Cleanup: only remove when last instance unmounts
    return () => {
      styleRefCount--;
      if (styleRefCount === 0) {
        const existingStyle = document.getElementById(STYLE_ID);
        if (existingStyle) {
          existingStyle.remove();
        }
      }
    };
  }, []);

  return null;
}
