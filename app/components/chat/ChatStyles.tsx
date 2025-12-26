/**
 * ChatStyles component - injects chat styles into the document
 * Uses reference counting to handle multiple instances
 *
 * Polaris-inspired design for AI chat interface
 */
import { useEffect } from 'react';

const STYLE_ID = 'chat-component-styles';
let styleRefCount = 0;

const chatCSS = `
/* ========================================
   CSS Custom Properties (Chat-specific)
   ======================================== */
:root {
  --chat-bg: #ffffff;
  --chat-bg-secondary: #f6f6f7;
  --chat-bg-user: #008060;
  --chat-bg-assistant: #f1f2f4;
  --chat-border: #e1e3e5;
  --chat-text: #202223;
  --chat-text-secondary: #6d7175;
  --chat-text-user: #ffffff;
  --chat-brand: #008060;
  --chat-brand-hover: #006e52;
  --chat-critical: #d72c0d;
  --chat-critical-bg: #fef1f1;
  --chat-radius: 8px;
  --chat-radius-lg: 16px;
  --chat-space-1: 4px;
  --chat-space-2: 8px;
  --chat-space-3: 12px;
  --chat-space-4: 16px;
  --chat-space-5: 20px;
}

/* ========================================
   Chat Panel Container
   ======================================== */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
  background: var(--chat-bg);
}

/* ========================================
   Chat Panel Header
   ======================================== */
.chat-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--chat-space-4);
  border-bottom: 1px solid var(--chat-border);
  background: var(--chat-bg);
  flex-shrink: 0;
}

.chat-panel__title {
  font-weight: 600;
  font-size: 15px;
  color: var(--chat-text);
  display: flex;
  align-items: center;
  gap: var(--chat-space-2);
}

.chat-panel__title::before {
  content: '✨';
  font-size: 16px;
}

.chat-panel__clear {
  background: transparent;
  border: 1px solid var(--chat-border);
  color: var(--chat-text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  padding: var(--chat-space-1) var(--chat-space-3);
  border-radius: var(--chat-radius);
  transition: all 0.15s ease;
}

.chat-panel__clear:hover:not(:disabled) {
  background: var(--chat-bg-secondary);
  border-color: #c9cccf;
  color: var(--chat-critical);
}

.chat-panel__clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========================================
   Message List
   ======================================== */
.chat-message-list {
  flex: 1;
  min-height: 0; /* Critical for flex scrolling */
  overflow-y: auto;
  padding: var(--chat-space-4);
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  gap: var(--chat-space-4);
}

/* ========================================
   Empty State
   ======================================== */
.chat-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
  text-align: center;
  padding: var(--chat-space-5);
}

.chat-empty-state__icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #e3f1ed 0%, #d4e9e2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: var(--chat-space-4);
}

.chat-empty-state__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--chat-text);
  margin: 0 0 var(--chat-space-2);
}

.chat-empty-state__examples {
  font-size: 13px;
  color: var(--chat-text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* ========================================
   Message Item
   ======================================== */
.chat-message {
  display: flex;
  gap: var(--chat-space-3);
  animation: chat-message-in 0.2s ease-out;
}

@keyframes chat-message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message--user {
  flex-direction: row-reverse;
}

.chat-message__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  font-weight: 600;
}

.chat-message--user .chat-message__avatar {
  background: var(--chat-brand);
  color: var(--chat-text-user);
}

.chat-message--assistant .chat-message__avatar {
  background: linear-gradient(135deg, #e3f1ed 0%, #d4e9e2 100%);
  color: var(--chat-brand);
}

.chat-message__content {
  max-width: 80%;
  display: flex;
  flex-direction: column;
  gap: var(--chat-space-2);
}

.chat-message--user .chat-message__content {
  align-items: flex-end;
}

.chat-message__text {
  padding: var(--chat-space-3) var(--chat-space-4);
  border-radius: var(--chat-radius-lg);
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
}

.chat-message--assistant .chat-message__text {
  background: var(--chat-bg-assistant);
  color: var(--chat-text);
  border-bottom-left-radius: var(--chat-space-1);
}

.chat-message--user .chat-message__text {
  background: var(--chat-bg-user);
  color: var(--chat-text-user);
  border-bottom-right-radius: var(--chat-space-1);
}

.chat-message__error {
  color: var(--chat-critical);
  font-size: 12px;
  padding: var(--chat-space-1) var(--chat-space-2);
  background: var(--chat-critical-bg);
  border-radius: var(--chat-radius);
}

/* ========================================
   Streaming Cursor
   ======================================== */
.chat-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--chat-text);
  margin-left: 2px;
  animation: chat-blink 1s step-end infinite;
}

@keyframes chat-blink {
  50% { opacity: 0; }
}

/* ========================================
   Typing Indicator
   ======================================== */
.chat-typing {
  display: flex;
  align-items: center;
  gap: var(--chat-space-3);
}

.chat-typing__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e3f1ed 0%, #d4e9e2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  color: var(--chat-brand);
}

.chat-typing__dots {
  display: flex;
  gap: 4px;
  padding: var(--chat-space-3) var(--chat-space-4);
  background: var(--chat-bg-assistant);
  border-radius: var(--chat-radius-lg);
  border-bottom-left-radius: var(--chat-space-1);
}

.chat-typing__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--chat-text-secondary);
  animation: chat-typing 1.4s infinite ease-in-out;
}

.chat-typing__dot:nth-child(2) {
  animation-delay: 0.2s;
}

.chat-typing__dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes chat-typing {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ========================================
   Code Block
   ======================================== */
.chat-code-block {
  background: #1e1e1e;
  border-radius: var(--chat-radius);
  overflow: hidden;
  font-size: 13px;
}

.chat-code-block__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--chat-space-2) var(--chat-space-3);
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.chat-code-block__language {
  color: #9d9d9d;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chat-code-block__copy {
  background: transparent;
  border: none;
  color: #8ab4f8;
  cursor: pointer;
  font-size: 12px;
  padding: var(--chat-space-1) var(--chat-space-2);
  border-radius: var(--chat-radius);
  transition: all 0.15s ease;
}

.chat-code-block__copy:hover {
  background: rgba(255, 255, 255, 0.1);
}

.chat-code-block__pre {
  margin: 0;
  padding: var(--chat-space-3);
  overflow-x: auto;
  color: #d4d4d4;
}

.chat-code-block__code {
  font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
}

.chat-code-block__line {
  display: flex;
}

.chat-code-block__line-number {
  color: #5a5a5a;
  width: 3ch;
  flex-shrink: 0;
  text-align: right;
  margin-right: var(--chat-space-3);
  user-select: none;
}

/* ========================================
   Chat Input
   ======================================== */
.chat-input {
  display: flex;
  gap: var(--chat-space-2);
  padding: var(--chat-space-4);
  border-top: 1px solid var(--chat-border);
  background: var(--chat-bg);
  align-items: flex-end;
}

.chat-input__textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--chat-border);
  border-radius: var(--chat-radius);
  padding: var(--chat-space-3);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  min-height: 44px;
  max-height: 200px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  background: var(--chat-bg);
  color: var(--chat-text);
}

.chat-input__textarea::placeholder {
  color: var(--chat-text-secondary);
}

.chat-input__textarea:focus {
  outline: none;
  border-color: var(--chat-brand);
  box-shadow: 0 0 0 1px var(--chat-brand);
}

.chat-input__button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--chat-radius);
  background: var(--chat-brand);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.chat-input__button:hover:not(:disabled) {
  background: var(--chat-brand-hover);
  transform: scale(1.02);
}

.chat-input__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input__button--stop {
  background: var(--chat-critical);
}

.chat-input__button--stop:hover:not(:disabled) {
  background: #b52212;
}

/* ========================================
   Error Banner
   ======================================== */
.chat-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--chat-space-3) var(--chat-space-4);
  background: var(--chat-critical-bg);
  color: var(--chat-critical);
  font-size: 13px;
  border-bottom: 1px solid rgba(215, 44, 13, 0.2);
}

.chat-error__actions {
  display: flex;
  align-items: center;
  gap: var(--chat-space-2);
}

.chat-error__retry {
  background: var(--chat-critical);
  color: white;
  border: none;
  border-radius: var(--chat-radius);
  padding: var(--chat-space-1) var(--chat-space-3);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.chat-error__retry:hover {
  background: #b52212;
}

.chat-error button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: var(--chat-space-1);
  font-size: 16px;
  line-height: 1;
  border-radius: var(--chat-radius);
  transition: background 0.15s ease;
}

.chat-error button:hover {
  background: rgba(215, 44, 13, 0.1);
}

/* ========================================
   Version Badge
   ======================================== */
.version-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: var(--chat-bg-secondary);
  border: 1px solid var(--chat-border);
  color: var(--chat-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.version-badge:hover {
  background: var(--chat-bg);
  border-color: var(--chat-brand);
  color: var(--chat-text);
}

.version-badge--selected {
  background: rgba(0, 128, 96, 0.1);
  border-color: var(--chat-brand);
  color: var(--chat-brand);
}

.version-badge__number {
  font-weight: 600;
}

.version-badge__latest {
  font-size: 10px;
  opacity: 0.7;
}

/* ========================================
   Selected Message State
   ======================================== */
.chat-message--selected {
  background: rgba(0, 128, 96, 0.05);
  border-left: 3px solid var(--chat-brand);
  margin-left: -3px;
  padding-left: 3px;
}

/* ========================================
   Version Header in Message
   ======================================== */
.chat-message__version {
  margin-bottom: var(--chat-space-2);
}

/* ========================================
   Message Actions (Use this version)
   ======================================== */
.chat-message__actions {
  display: flex;
  gap: 8px;
  margin-top: var(--chat-space-2);
  padding-top: var(--chat-space-2);
  border-top: 1px solid var(--chat-border);
}

/* ========================================
   Version Timeline Dropdown
   ======================================== */
.version-timeline {
  min-width: 140px;
}

.version-timeline select {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: var(--chat-radius);
  border: 1px solid var(--chat-border);
  background: var(--chat-bg);
  color: var(--chat-text);
  cursor: pointer;
}

.version-timeline select:hover {
  border-color: var(--chat-brand);
}

.version-timeline select:focus {
  outline: none;
  border-color: var(--chat-brand);
  box-shadow: 0 0 0 1px var(--chat-brand);
}

/* ========================================
   Version Card (Bolt.new-style)
   ======================================== */
.version-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--chat-space-2) var(--chat-space-3);
  margin-top: var(--chat-space-2);
  border-radius: var(--chat-radius);
  background: var(--chat-bg-secondary);
  border: 1px solid var(--chat-border);
  transition: all 0.15s ease;
}

.version-card--active {
  background: rgba(0, 128, 96, 0.08);
  border-color: var(--chat-brand);
}

.version-card--selected {
  background: var(--chat-bg-secondary);
  border-color: var(--chat-brand);
}

.version-card__info {
  display: flex;
  align-items: center;
  gap: var(--chat-space-2);
  font-size: 12px;
  color: var(--chat-text-secondary);
}

.version-card--active .version-card__info {
  color: var(--chat-brand);
}

.version-card__number {
  font-weight: 600;
  color: var(--chat-text);
}

.version-card--active .version-card__number {
  color: var(--chat-brand);
}

.version-card__separator {
  opacity: 0.5;
}

.version-card__time {
  font-size: 11px;
}

.version-card__actions {
  display: flex;
  gap: 4px;
}

.version-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--chat-radius);
  background: transparent;
  color: var(--chat-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.version-card__icon:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
  color: var(--chat-text);
}

.version-card__icon--active {
  background: rgba(0, 128, 96, 0.12);
  color: var(--chat-brand);
}

.version-card__icon--active:hover {
  background: rgba(0, 128, 96, 0.18);
}

.version-card__icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.version-card__icon:focus-visible {
  outline: 2px solid var(--chat-brand);
  outline-offset: 2px;
}

/* Restore icon on active card - different styling */
.version-card--active .version-card__icon:last-child {
  opacity: 0.4;
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
