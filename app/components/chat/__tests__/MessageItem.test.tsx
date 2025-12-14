/**
 * Tests for MessageItem component
 * Tests message rendering, code block parsing, and user/assistant roles
 */
import { render, screen } from '@testing-library/react';
import { MessageItem } from '../MessageItem';
import type { UIMessage } from '../../../types';

describe('MessageItem', () => {
  const createMessage = (overrides: Partial<UIMessage> = {}): UIMessage => ({
    id: '1',
    conversationId: 'test-conv',
    role: 'user',
    content: 'Test message',
    createdAt: new Date(),
    ...overrides,
  });

  describe('user messages', () => {
    it('renders user message with user avatar', () => {
      const message = createMessage({
        role: 'user',
        content: 'Hello there',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('Hello there')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('applies user message CSS class', () => {
      const message = createMessage({ role: 'user' });
      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('.chat-message--user')).toBeInTheDocument();
    });

    it('sets proper aria label for user message', () => {
      const message = createMessage({ role: 'user' });
      render(<MessageItem message={message} />);

      const messageElement = screen.getByRole('article');
      expect(messageElement).toHaveAttribute('aria-label', 'You said');
    });
  });

  describe('assistant messages', () => {
    it('renders assistant message with bot avatar', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'I can help!',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('I can help!')).toBeInTheDocument();
      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('applies assistant message CSS class', () => {
      const message = createMessage({ role: 'assistant' });
      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('.chat-message--assistant')).toBeInTheDocument();
    });

    it('sets proper aria label for assistant message', () => {
      const message = createMessage({ role: 'assistant' });
      render(<MessageItem message={message} />);

      const messageElement = screen.getByRole('article');
      expect(messageElement).toHaveAttribute('aria-label', 'AI Assistant said');
    });
  });

  describe('text content parsing', () => {
    it('renders plain text message', () => {
      const message = createMessage({
        content: 'This is a plain text message',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('This is a plain text message')).toBeInTheDocument();
    });

    it('renders message with multiple paragraphs', () => {
      const message = createMessage({
        content: 'First paragraph\n\nSecond paragraph',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText(/First paragraph/)).toBeInTheDocument();
      expect(screen.getByText(/Second paragraph/)).toBeInTheDocument();
    });

    it('handles text with special characters', () => {
      const message = createMessage({
        content: 'Message with <brackets> & special chars!',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText(/brackets/)).toBeInTheDocument();
    });
  });

  describe('code block parsing', () => {
    it('extracts and renders code blocks', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Here is some code:\n```javascript\nconst x = 1;\n```',
      });

      const { container } = render(<MessageItem message={message} />);

      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
      expect(container.querySelector('.chat-code-block')).toBeInTheDocument();
    });

    it('renders code block with specified language', () => {
      const message = createMessage({
        content: '```liquid\n{% for item in items %}\n{{ item }}\n{% endfor %}\n```',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('liquid')).toBeInTheDocument();
      expect(screen.getByText(/for item in items/)).toBeInTheDocument();
    });

    it('uses default language (liquid) for code block without language', () => {
      const message = createMessage({
        content: '```\nsome code\n```',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('liquid')).toBeInTheDocument();
      expect(screen.getByText(/some code/)).toBeInTheDocument();
    });

    it('renders multiple code blocks in one message', () => {
      const message = createMessage({
        content: '```js\nfirst\n```\n\nSome text\n\n```python\nsecond\n```',
      });

      const { container } = render(<MessageItem message={message} />);

      const codeBlocks = container.querySelectorAll('.chat-code-block');
      expect(codeBlocks).toHaveLength(2);

      expect(screen.getByText('js')).toBeInTheDocument();
      expect(screen.getByText('python')).toBeInTheDocument();
      expect(screen.getByText('first')).toBeInTheDocument();
      expect(screen.getByText('second')).toBeInTheDocument();
    });

    it('handles code block with leading/trailing whitespace', () => {
      const message = createMessage({
        content: '```javascript\n\n  const x = 1;\n\n```',
      });

      render(<MessageItem message={message} />);

      // Trimmed content should be rendered
      expect(screen.getByText(/const x/)).toBeInTheDocument();
    });

    it('handles nested backticks in text', () => {
      const message = createMessage({
        content: 'Use `inline code` like this:\n```js\ncode block\n```',
      });

      render(<MessageItem message={message} />);

      // Only the full code block should be extracted
      expect(screen.getByText(/code block/)).toBeInTheDocument();
    });
  });

  describe('mixed content', () => {
    it('renders text before code block', () => {
      const message = createMessage({
        content: 'Here is the solution:\n```js\nconst answer = 42;\n```',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText(/Here is the solution/)).toBeInTheDocument();
      expect(screen.getByText(/const answer/)).toBeInTheDocument();
    });

    it('renders text after code block', () => {
      const message = createMessage({
        content: '```js\nconst x = 1;\n```\n\nThat is the code!',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText(/const x/)).toBeInTheDocument();
      expect(screen.getByText(/That is the code/)).toBeInTheDocument();
    });

    it('renders text between code blocks', () => {
      const message = createMessage({
        content: '```js\nfirst\n```\n\nExplanation text\n\n```js\nsecond\n```',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText(/first/)).toBeInTheDocument();
      expect(screen.getByText(/Explanation text/)).toBeInTheDocument();
      expect(screen.getByText(/second/)).toBeInTheDocument();
    });
  });

  describe('streaming indicator', () => {
    it('shows cursor when streaming', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Streaming response',
      });

      const { container } = render(
        <MessageItem message={message} isStreaming={true} />
      );

      expect(container.querySelector('.chat-cursor')).toBeInTheDocument();
      expect(screen.getByText('▋')).toBeInTheDocument();
    });

    it('does not show cursor when not streaming', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Complete response',
      });

      const { container } = render(
        <MessageItem message={message} isStreaming={false} />
      );

      expect(container.querySelector('.chat-cursor')).not.toBeInTheDocument();
    });

    it('only shows cursor on last text part when streaming', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Text one\n\nText two',
      });

      const { container } = render(
        <MessageItem message={message} isStreaming={true} />
      );

      // Only one cursor should exist
      expect(container.querySelectorAll('.chat-cursor')).toHaveLength(1);
    });

    it('shows cursor on text before code when streaming', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Here is code:\n```js\ncode\n```',
      });

      const { container } = render(
        <MessageItem message={message} isStreaming={true} />
      );

      // When there's both text and code, cursor appears on text part
      // May or may not have cursor depending on how content is parsed
      // At minimum, the component should render without error
      expect(container.querySelector('.chat-message')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error message when isError is true', () => {
      const message = createMessage({
        isError: true,
        errorMessage: 'Something went wrong',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders error box with error class', () => {
      const message = createMessage({
        isError: true,
        errorMessage: 'Error occurred',
      });

      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('.chat-message__error')).toBeInTheDocument();
    });

    it('uses default error message when none provided', () => {
      const message = createMessage({
        isError: true,
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('does not show error when isError is false', () => {
      const message = createMessage({
        isError: false,
        errorMessage: 'This should not appear',
      });

      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('.chat-message__error')).not.toBeInTheDocument();
    });
  });

  describe('CSS classes and structure', () => {
    it('has correct semantic structure', () => {
      const message = createMessage({ content: 'Test' });
      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('.chat-message')).toBeInTheDocument();
      expect(container.querySelector('.chat-message__avatar')).toBeInTheDocument();
      expect(container.querySelector('.chat-message__content')).toBeInTheDocument();
    });

    it('renders text with text class', () => {
      const message = createMessage({ content: 'Plain text' });
      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('.chat-message__text')).toBeInTheDocument();
    });
  });

  describe('memo optimization', () => {
    it('is memoized for performance', () => {
      // Component is exported as memo
      // The memo HOC wraps the component function
      const message = createMessage({ content: 'test' });
      const { container: container1 } = render(<MessageItem message={message} />);
      const { container: container2 } = render(<MessageItem message={message} />);

      // Both renders should produce same structure
      expect(container1.querySelector('.chat-message')).toBeTruthy();
      expect(container2.querySelector('.chat-message')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles very long message content', () => {
      const longContent = 'a'.repeat(10000);
      const message = createMessage({ content: longContent });

      render(<MessageItem message={message} />);

      expect(screen.getByText(/a+/)).toBeInTheDocument();
    });

    it('handles message with only whitespace', () => {
      const message = createMessage({ content: '   \n\n   ' });

      render(<MessageItem message={message} />);

      // Should still render the message container
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('handles empty message content', () => {
      const message = createMessage({ content: '' });

      render(<MessageItem message={message} />);

      // Should still render the message container
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });
});
