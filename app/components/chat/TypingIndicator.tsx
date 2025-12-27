/**
 * TypingIndicator component - Shows AI is thinking animation
 * Uses Polaris components with minimal CSS for dot animation
 */

export function TypingIndicator() {
  return (
    <div className="chat-message-enter">
      <s-box padding="small" accessibilityRole="status" accessibilityLabel="AI is thinking">
        <s-stack direction="inline" gap="small" alignItems="center">
          <div className="chat-avatar--ai">
            <s-avatar initials="AI" size="small" />
          </div>
          <div
            className="chat-bubble--ai"
            style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
            }}
          >
            <div className="chat-typing">
              <span className="chat-typing__dot" />
              <span className="chat-typing__dot" />
              <span className="chat-typing__dot" />
            </div>
          </div>
        </s-stack>
      </s-box>
    </div>
  );
}
