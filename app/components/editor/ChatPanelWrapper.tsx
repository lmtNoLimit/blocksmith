import { ChatPanel } from '../chat';
import type { UIMessage, CodeVersion } from '../../types';

interface ChatPanelWrapperProps {
  conversationId: string;
  initialMessages: UIMessage[];
  currentCode: string;
  onCodeUpdate: (code: string) => void;
  /** Callback when messages change (for syncing with parent state) */
  onMessagesChange?: (messages: UIMessage[]) => void;
  // Version props
  versions?: CodeVersion[];
  selectedVersionId?: string | null;
  activeVersionId?: string | null;
  onVersionSelect?: (versionId: string | null) => void;
  onVersionApply?: (versionId: string) => void;
}

// Flex container style for proper height propagation
const wrapperStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  height: '100%',
  minHeight: 0,
};

/**
 * Wrapper for ChatPanel - minimal wrapper as ChatPanel has its own header
 * Passes through version props for version display in messages
 */
export function ChatPanelWrapper({
  conversationId,
  initialMessages,
  currentCode,
  onCodeUpdate,
  onMessagesChange,
  versions,
  selectedVersionId,
  activeVersionId,
  onVersionSelect,
  onVersionApply,
}: ChatPanelWrapperProps) {
  return (
    <div className="chat-panel-wrapper" style={wrapperStyle}>
      <ChatPanel
        conversationId={conversationId}
        initialMessages={initialMessages}
        currentCode={currentCode}
        onCodeUpdate={onCodeUpdate}
        onMessagesChange={onMessagesChange}
        versions={versions}
        selectedVersionId={selectedVersionId}
        activeVersionId={activeVersionId}
        onVersionSelect={onVersionSelect}
        onVersionApply={onVersionApply}
      />
    </div>
  );
}
