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
    it('renders user message content', () => {
      const message = createMessage({
        role: 'user',
        content: 'Hello there',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('Hello there')).toBeInTheDocument();
    });

    it('renders user avatar with initials', () => {
      const message = createMessage({ role: 'user' });
      const { container } = render(<MessageItem message={message} />);

      const avatar = container.querySelector('s-avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('initials', 'U');
    });

    it('applies user message bubble style', () => {
      const message = createMessage({ role: 'user' });
      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('.chat-bubble--user')).toBeInTheDocument();
    });

    it('sets proper aria label for user message', () => {
      const message = createMessage({ role: 'user' });
      const { container } = render(<MessageItem message={message} />);

      const messageBox = container.querySelector('s-box');
      expect(messageBox).toHaveAttribute('accessibilityLabel', 'You said');
    });
  });

  describe('assistant messages', () => {
    it('renders assistant message content', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'I can help!',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('I can help!')).toBeInTheDocument();
    });

    it('renders assistant avatar with AI initials', () => {
      const message = createMessage({ role: 'assistant' });
      const { container } = render(<MessageItem message={message} />);

      const avatar = container.querySelector('s-avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('initials', 'AI');
    });

    it('applies assistant message bubble style', () => {
      const message = createMessage({ role: 'assistant' });
      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('.chat-bubble--ai')).toBeInTheDocument();
    });

    it('sets proper aria label for assistant message', () => {
      const message = createMessage({ role: 'assistant' });
      const { container } = render(<MessageItem message={message} />);

      const messageBox = container.querySelector('s-box');
      expect(messageBox).toHaveAttribute('accessibilityLabel', 'AI Assistant said');
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
        content: 'Special chars: <>&"\'',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText(/Special chars/)).toBeInTheDocument();
    });
  });

  describe('code blocks', () => {
    it('parses single code block', () => {
      const message = createMessage({
        role: 'user',
        content: '```javascript\nconst x = 1;\n```',
      });

      render(<MessageItem message={message} />);

      // User messages show code blocks
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('hides code blocks for assistant messages', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Here is the code:\n```javascript\nconst x = 1;\n```',
      });

      render(<MessageItem message={message} />);

      // Text content should be visible
      expect(screen.getByText('Here is the code:')).toBeInTheDocument();
      // Code is hidden for AI messages (shown in Preview Panel instead)
      expect(screen.queryByText('const x = 1;')).not.toBeInTheDocument();
    });

    it('handles mixed text and code blocks', () => {
      const message = createMessage({
        role: 'user',
        content: 'Before code\n```js\ncode here\n```\nAfter code',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('Before code')).toBeInTheDocument();
      expect(screen.getByText('code here')).toBeInTheDocument();
      expect(screen.getByText('After code')).toBeInTheDocument();
    });

    it('defaults to liquid language', () => {
      const message = createMessage({
        role: 'user',
        content: '```\n{{ product.title }}\n```',
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('{{ product.title }}')).toBeInTheDocument();
    });
  });

  describe('streaming indicator', () => {
    it('shows cursor when streaming', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Streaming content',
      });

      const { container } = render(<MessageItem message={message} isStreaming={true} />);

      expect(container.querySelector('.chat-cursor')).toBeInTheDocument();
    });

    it('hides cursor when not streaming', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Final content',
      });

      const { container } = render(<MessageItem message={message} isStreaming={false} />);

      expect(container.querySelector('.chat-cursor')).not.toBeInTheDocument();
    });
  });

  describe('version display', () => {
    it('shows version card for AI messages with codeSnapshot', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'Generated code',
        codeSnapshot: '<div>code</div>',
      });

      render(
        <MessageItem
          message={message}
          versionNumber={1}
          isActive={false}
          isSelected={false}
          onVersionSelect={() => {}}
          onVersionApply={() => {}}
        />
      );

      expect(screen.getByText('v1')).toBeInTheDocument();
    });

    it('does not show version card without codeSnapshot', () => {
      const message = createMessage({
        role: 'assistant',
        content: 'No code generated',
      });

      render(
        <MessageItem
          message={message}
          versionNumber={1}
        />
      );

      expect(screen.queryByText('v1')).not.toBeInTheDocument();
    });

    it('does not show version card for user messages', () => {
      const message = createMessage({
        role: 'user',
        content: 'User message',
        codeSnapshot: '<div>code</div>',
      });

      render(
        <MessageItem
          message={message}
          versionNumber={1}
        />
      );

      expect(screen.queryByText('v1')).not.toBeInTheDocument();
    });
  });

  describe('error messages', () => {
    it('shows error banner for error messages', () => {
      const message = createMessage({
        isError: true,
        errorMessage: 'Something went wrong',
      });

      const { container } = render(<MessageItem message={message} />);

      expect(container.querySelector('s-banner')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows default error message when errorMessage is empty', () => {
      const message = createMessage({
        isError: true,
      });

      render(<MessageItem message={message} />);

      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles message with only whitespace', () => {
      const message = createMessage({ content: '   \n\n   ' });

      const { container } = render(<MessageItem message={message} />);

      // Should still render the message container
      expect(container.querySelector('s-box')).toBeInTheDocument();
    });

    it('handles empty message content', () => {
      const message = createMessage({ content: '' });

      const { container } = render(<MessageItem message={message} />);

      // Should still render the message container
      expect(container.querySelector('s-box')).toBeInTheDocument();
    });
  });
});
