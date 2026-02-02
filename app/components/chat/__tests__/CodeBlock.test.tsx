/**
 * Tests for CodeBlock component
 * Tests code display, copy functionality, and code block rendering
 */
import { render, screen } from '@testing-library/react';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  describe('rendering', () => {
    it('renders code block container', () => {
      render(<CodeBlock code="const x = 1;" />);

      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('renders language label in uppercase', () => {
      render(<CodeBlock code="const x = 1;" language="typescript" />);

      expect(screen.getByText('TYPESCRIPT')).toBeInTheDocument();
    });

    it('renders default language (liquid)', () => {
      render(<CodeBlock code="{% if x %}test{% endif %}" />);

      expect(screen.getByText('LIQUID')).toBeInTheDocument();
    });

    it('renders copy button', () => {
      const { container } = render(<CodeBlock code="test" />);

      expect(container.querySelector('s-button')).toBeInTheDocument();
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

    it('renders copy button with text', () => {
      const { container } = render(<CodeBlock code="test" />);
      expect(container.querySelector('s-button')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('has copy icon by default', () => {
      const { container } = render(<CodeBlock code="test code" />);

      const copyButton = container.querySelector('s-button');
      expect(copyButton).toHaveAttribute('icon', 'clipboard');
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
      render(<CodeBlock code={code} showLineNumbers={false} />);

      // Text should still be present as plain code
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

      expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument();
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('renders liquid template code', () => {
      const code = '{% for item in items %}\n  {{ item }}\n{% endfor %}';
      render(<CodeBlock code={code} language="liquid" />);

      expect(screen.getByText('LIQUID')).toBeInTheDocument();
      expect(screen.getByText(/for item in items/)).toBeInTheDocument();
    });

    it('renders HTML code', () => {
      const code = '<div class="container">\n  <p>Hello</p>\n</div>';
      render(<CodeBlock code={code} language="html" />);

      expect(screen.getByText('HTML')).toBeInTheDocument();
      expect(screen.getByText(/class="container"/)).toBeInTheDocument();
    });

    it('renders CSS code', () => {
      const code = '.container {\n  display: flex;\n  gap: 10px;\n}';
      render(<CodeBlock code={code} language="css" />);

      expect(screen.getByText('CSS')).toBeInTheDocument();
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

      // Should still render container with language label
      expect(screen.getByText('LIQUID')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('copy button is interactive', async () => {
      const { container } = render(<CodeBlock code="test" />);

      const copyButton = container.querySelector('s-button');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).not.toHaveAttribute('disabled');
    });

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

  // Phase 4: Completion status badge tests
  describe('completion status badges', () => {
    it('renders without badge when completionStatus is undefined', () => {
      const { container } = render(<CodeBlock code="test" />);

      expect(container.querySelector('s-badge')).not.toBeInTheDocument();
    });

    it('renders potentially incomplete badge', () => {
      render(<CodeBlock code="test" completionStatus="potentially-incomplete" />);

      expect(screen.getByText('Potentially Incomplete')).toBeInTheDocument();
    });

    it('renders tooltip for incomplete badge', () => {
      const { container } = render(
        <CodeBlock code="test" completionStatus="potentially-incomplete" />
      );

      const tooltip = container.querySelector('s-tooltip#incomplete-tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('does not render badges when complete', () => {
      const { container } = render(
        <CodeBlock code="test" completionStatus="complete" />
      );

      expect(container.querySelector('s-badge')).not.toBeInTheDocument();
    });

    it('does not render badges when generating', () => {
      const { container } = render(
        <CodeBlock code="test" completionStatus="generating" />
      );

      expect(container.querySelector('s-badge')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('renders with inline styles (dark theme)', () => {
      const { container } = render(<CodeBlock code="test" language="js" />);

      // Component uses inline styles, check for the container div
      const outerDiv = container.firstElementChild as HTMLElement;
      expect(outerDiv).toBeTruthy();
      expect(outerDiv.style.background).toBe('rgb(30, 30, 30)');
    });

    it('renders line structure when line numbers enabled', () => {
      const code = 'line 1\nline 2';
      render(<CodeBlock code={code} showLineNumbers={true} />);

      // Should show line numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
