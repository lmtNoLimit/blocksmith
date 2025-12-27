/**
 * Tests for ChatInput component
 * Tests component rendering and basic functionality
 * Note: Polaris Web Components require special handling in tests
 */
import { render, screen } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSend = jest.fn();
  const mockOnStop = jest.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
    mockOnStop.mockClear();
  });

  describe('rendering', () => {
    it('renders s-text-area element', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      expect(container.querySelector('s-text-area')).toBeInTheDocument();
    });

    it('renders s-button element', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      expect(container.querySelector('s-button')).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const textarea = container.querySelector('s-text-area');
      expect(textarea).toHaveAttribute('placeholder', 'Describe changes to your section...');
    });

    it('renders with custom placeholder', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
          placeholder="Custom placeholder"
        />
      );

      const textarea = container.querySelector('s-text-area');
      expect(textarea).toHaveAttribute('placeholder', 'Custom placeholder');
    });

    it('renders hint text', () => {
      render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      expect(screen.getByText(/Press Enter to send/)).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables textarea when disabled prop is true', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
          disabled={true}
        />
      );

      const textarea = container.querySelector('s-text-area');
      expect(textarea).toHaveAttribute('disabled');
    });

    it('disables button when disabled prop is true and not streaming', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
          disabled={true}
        />
      );

      const button = container.querySelector('s-button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('streaming state', () => {
    it('shows stop-circle icon when streaming', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={true}
        />
      );

      const button = container.querySelector('s-button');
      expect(button).toHaveAttribute('icon', 'stop-circle');
    });

    it('shows send icon when not streaming', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const button = container.querySelector('s-button');
      expect(button).toHaveAttribute('icon', 'send');
    });

    it('shows critical tone when streaming', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={true}
        />
      );

      const button = container.querySelector('s-button');
      expect(button).toHaveAttribute('tone', 'critical');
    });
  });

  describe('accessibility', () => {
    it('has accessibility label for send button', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      const button = container.querySelector('s-button');
      expect(button).toHaveAttribute('accessibilityLabel', 'Send message');
    });

    it('has accessibility label for stop button when streaming', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={true}
        />
      );

      const button = container.querySelector('s-button');
      expect(button).toHaveAttribute('accessibilityLabel', 'Stop generation');
    });
  });

  describe('container structure', () => {
    it('renders with input container wrapper', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      expect(container.querySelector('.chat-input-container')).toBeInTheDocument();
    });

    it('renders with s-box wrapper', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      expect(container.querySelector('s-box')).toBeInTheDocument();
    });

    it('renders with s-stack for layout', () => {
      const { container } = render(
        <ChatInput
          onSend={mockOnSend}
          isStreaming={false}
        />
      );

      expect(container.querySelector('s-stack')).toBeInTheDocument();
    });
  });
});
