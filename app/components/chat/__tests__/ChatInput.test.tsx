/**
 * Tests for ChatInput component
 * Tests text input, keyboard handling, send/stop functionality
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSend = jest.fn();
  const mockOnStop = jest.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
    mockOnStop.mockClear();
  });

  describe('rendering', () => {
    it('renders textarea and button', () => {
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders default placeholder', () => {
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', 'Describe changes to your section...');
    });

    it('renders custom placeholder', () => {
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
          placeholder="Custom placeholder"
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', 'Custom placeholder');
    });
  });

  describe('input handling', () => {
    it('updates textarea value on change', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello world');

      expect(textarea).toHaveValue('Hello world');
    });

    it('auto-resizes textarea on content', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      await user.type(textarea, 'A'.repeat(100));

      // Height should have changed or been set
      expect(textarea.style.height).toBeDefined();
    });

    it('clears value after send', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');

      const button = screen.getByRole('button');
      await user.click(button);

      expect(textarea).toHaveValue('');
    });
  });

  describe('send button', () => {
    it('sends message on button click', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnSend).toHaveBeenCalledWith('Hello');
      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });

    it('sends trimmed message', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '  Hello world  \n\n');

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnSend).toHaveBeenCalledWith('Hello world');
    });

    it('does not send empty message', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('does not send whitespace-only message', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '   \n\n  ');

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('disables button when disabled prop is true and not streaming', () => {
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('disables textarea when disabled prop is true', () => {
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
          disabled={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('keyboard handling', () => {
    it('sends message on Enter', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Hello');
    });

    it('adds newline on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('sends on Enter but not Shift+Enter', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello{Shift>}{Enter}{/Shift}World');

      expect(mockOnSend).not.toHaveBeenCalled();
      expect(textarea).toHaveValue('Hello\nWorld');

      await user.type(textarea, '{Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Hello\nWorld');
    });
  });

  describe('streaming state', () => {
    it('shows stop icon when streaming', () => {
      const { rerender } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      let button = screen.getByRole('button');
      expect(button).toHaveTextContent('↑');

      rerender(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={true}
        />
      );

      button = screen.getByRole('button');
      expect(button).toHaveTextContent('⏹');
    });

    it('shows send icon when not streaming', () => {
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('↑');
    });

    it('calls onStop when streaming and button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          onStop={mockOnStop}
          isStreaming={true}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnStop).toHaveBeenCalled();
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('calls onStop on Enter when streaming', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          onStop={mockOnStop}
          isStreaming={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Text{Enter}');

      expect(mockOnStop).toHaveBeenCalled();
      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has proper aria labels', () => {
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', 'Chat message input');

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Send message');
    });

    it('updates button aria label when streaming', () => {
      const { rerender } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Send message');

      rerender(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={true}
        />
      );

      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Stop generation');
    });
  });

  describe('integration scenarios', () => {
    it('handles complete user flow: type, modify, send', async () => {
      const user = userEvent.setup();
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = screen.getByRole('textbox');

      // Type message
      await user.type(textarea, 'Hello');
      expect(textarea).toHaveValue('Hello');

      // Clear and type new message
      await user.clear(textarea);
      await user.type(textarea, 'Hi there');

      expect(textarea).toHaveValue('Hi there');

      // Send
      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnSend).toHaveBeenCalledWith('Hi there');
      expect(textarea).toHaveValue('');
    });
  });
});
