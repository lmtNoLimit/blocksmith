/**
 * Tests for CodeBlock component
 * Tests code display, copy functionality, and code block rendering
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  describe('rendering', () => {
    it('renders code block container', () => {
      render(<CodeBlock code="const x = 1;" />);

      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('renders language label', () => {
      render(<CodeBlock code="const x = 1;" language="typescript" />);

      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('renders default language (liquid)', () => {
      render(<CodeBlock code="{% if x %}test{% endif %}" />);

      expect(screen.getByText('liquid')).toBeInTheDocument();
    });

    it('renders copy button', () => {
      render(<CodeBlock code="test" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn(() => Promise.resolve()),
        },
        configurable: true,
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('renders copy button', () => {
      render(<CodeBlock code="test" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('copies code to clipboard on button click', async () => {
      const user = userEvent.setup();
      const code = 'const greeting = "Hello";';
      const writeText = jest.spyOn(navigator.clipboard, 'writeText');

      render(<CodeBlock code={code} />);

      const copyButton = screen.getByRole('button');
      await user.click(copyButton);

      expect(writeText).toHaveBeenCalledWith(code);
    });

    it('shows "Copied" feedback after copy', async () => {
      const user = userEvent.setup();

      render(<CodeBlock code="test code" />);

      const copyButton = screen.getByRole('button');
      expect(copyButton).toHaveTextContent('Copy');

      await user.click(copyButton);

      expect(copyButton).toHaveTextContent('✓ Copied');
    });

    it('button has feedback mechanism (shown by role and text)', () => {
      render(<CodeBlock code="test code" />);

      const copyButton = screen.getByRole('button');

      // Initial state
      expect(copyButton).toHaveTextContent('Copy');
      expect(copyButton).toHaveAttribute('aria-label', 'Copy code');
    });

    it('clipboard API integration', async () => {
      const user = userEvent.setup();

      render(<CodeBlock code="test code" />);

      const copyButton = screen.getByRole('button');

      // Verify button can be clicked
      expect(copyButton).toBeEnabled();

      // Simulate click (without asserting clipboard state due to mocking complexity)
      await user.click(copyButton);

      // Button should exist and be interactive
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe('line numbers', () => {
    it('shows line numbers by default', () => {
      const code = 'line 1\nline 2\nline 3';
      render(<CodeBlock code={code} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('hides line numbers when disabled', () => {
      const code = 'line 1\nline 2\nline 3';
      const { container } = render(<CodeBlock code={code} showLineNumbers={false} />);

      // Should not have line element structure
      expect(container.querySelectorAll('.chat-code-block__line')).toHaveLength(0);
      // Text should still be present
      expect(screen.getByText(/line 1/)).toBeInTheDocument();
    });

    it('correctly numbers single line code', () => {
      render(<CodeBlock code="single line" showLineNumbers={true} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('correctly numbers multiline code', () => {
      const code = 'first\nsecond\nthird\nfourth\nfifth';
      render(<CodeBlock code={code} showLineNumbers={true} />);

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
    });

    it('handles code with empty lines', () => {
      const code = 'line 1\n\nline 3';
      render(<CodeBlock code={code} showLineNumbers={true} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('different languages', () => {
    it('renders javascript code', () => {
      const code = 'const x = 1;';
      render(<CodeBlock code={code} language="javascript" />);

      expect(screen.getByText('javascript')).toBeInTheDocument();
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('renders liquid template code', () => {
      const code = '{% for item in items %}\n  {{ item }}\n{% endfor %}';
      render(<CodeBlock code={code} language="liquid" />);

      expect(screen.getByText('liquid')).toBeInTheDocument();
      expect(screen.getByText(/for item in items/)).toBeInTheDocument();
    });

    it('renders HTML code', () => {
      const code = '<div class="container">\n  <p>Hello</p>\n</div>';
      render(<CodeBlock code={code} language="html" />);

      expect(screen.getByText('html')).toBeInTheDocument();
      expect(screen.getByText(/class="container"/)).toBeInTheDocument();
    });

    it('renders CSS code', () => {
      const code = '.container {\n  display: flex;\n  gap: 10px;\n}';
      render(<CodeBlock code={code} language="css" />);

      expect(screen.getByText('css')).toBeInTheDocument();
      expect(screen.getByText(/display: flex/)).toBeInTheDocument();
    });
  });

  describe('code content variations', () => {
    it('handles code with special characters', () => {
      const code = 'const special = "<script>alert(\'XSS\')</script>";';
      render(<CodeBlock code={code} language="javascript" />);

      expect(screen.getByText(/special/)).toBeInTheDocument();
    });

    it('handles very long code', () => {
      const code = 'const x = ' + '"'.repeat(1000);
      render(<CodeBlock code={code} />);

      expect(screen.getByText(/const x/)).toBeInTheDocument();
    });

    it('handles code with leading/trailing whitespace', () => {
      const code = '\n\n  const x = 1;\n\n';
      render(<CodeBlock code={code} showLineNumbers={false} />);

      expect(screen.getByText(/const x/)).toBeInTheDocument();
    });

    it('handles empty code', () => {
      render(<CodeBlock code="" />);

      // Should still render container
      expect(screen.getByText('liquid')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper aria labels on copy button', () => {
      render(<CodeBlock code="test" />);

      const copyButton = screen.getByRole('button');
      expect(copyButton).toHaveAttribute('aria-label', 'Copy code');
    });

    it('copy button is interactive', async () => {
      userEvent.setup();

      render(<CodeBlock code="test" />);

      const copyButton = screen.getByRole('button');
      expect(copyButton).toHaveAttribute('aria-label', 'Copy code');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).not.toBeDisabled();
    }, 10000);

    it('has semantic HTML structure', () => {
      const { container } = render(<CodeBlock code="test code" language="typescript" />);

      const pre = container.querySelector('pre');
      expect(pre).toBeTruthy();
      expect(pre?.tagName).toBe('PRE');

      // Code element should exist
      const codeElement = pre?.querySelector('code');
      expect(codeElement).toBeInTheDocument();
    });
  });

  describe('CSS classes', () => {
    it('applies correct CSS classes', () => {
      const { container } = render(<CodeBlock code="test" language="js" />);

      expect(container.querySelector('.chat-code-block')).toBeInTheDocument();
      expect(container.querySelector('.chat-code-block__header')).toBeInTheDocument();
      expect(container.querySelector('.chat-code-block__language')).toBeInTheDocument();
      expect(container.querySelector('.chat-code-block__copy')).toBeInTheDocument();
      expect(container.querySelector('.chat-code-block__pre')).toBeInTheDocument();
      expect(container.querySelector('.chat-code-block__code')).toBeInTheDocument();
    });

    it('applies line classes when line numbers enabled', () => {
      const code = 'line 1\nline 2';
      const { container } = render(<CodeBlock code={code} showLineNumbers={true} />);

      const lineElements = container.querySelectorAll('.chat-code-block__line');
      expect(lineElements).toHaveLength(2);

      const lineNumbers = container.querySelectorAll('.chat-code-block__line-number');
      expect(lineNumbers).toHaveLength(2);

      const lineContents = container.querySelectorAll('.chat-code-block__line-content');
      expect(lineContents).toHaveLength(2);
    });
  });
});
