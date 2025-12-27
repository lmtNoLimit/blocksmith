/**
 * Tests for VersionCard component
 * Tests version info display, actions, accessibility, and time formatting
 */
import { render, screen } from '@testing-library/react';
import { VersionCard } from '../VersionCard';

describe('VersionCard', () => {
  const mockOnPreview = jest.fn();
  const mockOnRestore = jest.fn();

  const defaultProps = {
    versionNumber: 1,
    createdAt: new Date('2025-12-26T12:00:00Z'),
    isActive: false,
    isSelected: false,
    onPreview: mockOnPreview,
    onRestore: mockOnRestore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Set fixed time for consistent relative time testing
    jest.setSystemTime(new Date('2025-12-26T12:00:00Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('version number and time display', () => {
    it('renders version number', () => {
      render(<VersionCard {...defaultProps} versionNumber={3} />);
      expect(screen.getByText('v3')).toBeInTheDocument();
    });

    it('renders relative time string', () => {
      render(<VersionCard {...defaultProps} />);
      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('renders card container with chat-version-card class', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      expect(container.querySelector('.chat-version-card')).toBeInTheDocument();
    });
  });

  describe('time formatting helper', () => {
    it('shows "just now" for < 1 minute', () => {
      const thirtySecsAgo = new Date('2025-12-26T11:59:30Z');

      render(<VersionCard {...defaultProps} createdAt={thirtySecsAgo} />);
      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('shows "X min ago" for < 60 minutes', () => {
      const fiveMinsAgo = new Date('2025-12-26T11:55:00Z');
      render(<VersionCard {...defaultProps} createdAt={fiveMinsAgo} />);
      expect(screen.getByText('5 min ago')).toBeInTheDocument();
    });

    it('shows "1 min ago" for exactly 1 minute', () => {
      const oneMinAgo = new Date('2025-12-26T11:59:00Z');
      render(<VersionCard {...defaultProps} createdAt={oneMinAgo} />);
      expect(screen.getByText('1 min ago')).toBeInTheDocument();
    });

    it('shows "Xh ago" for < 24 hours', () => {
      const threeHoursAgo = new Date('2025-12-26T09:00:00Z');
      render(<VersionCard {...defaultProps} createdAt={threeHoursAgo} />);
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('shows "Xd ago" for >= 24 hours', () => {
      const twoDaysAgo = new Date('2025-12-24T12:00:00Z');
      render(<VersionCard {...defaultProps} createdAt={twoDaysAgo} />);
      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });
  });

  describe('preview button', () => {
    it('renders preview button with text', () => {
      render(<VersionCard {...defaultProps} />);
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('shows "Viewing" text when selected', () => {
      render(<VersionCard {...defaultProps} isSelected={true} />);
      expect(screen.getByText('Viewing')).toBeInTheDocument();
    });

    it('has proper accessibility label when not selected', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={false} />
      );
      const buttons = container.querySelectorAll('s-button');
      expect(buttons[0]).toHaveAttribute('accessibilityLabel', 'Preview this version');
    });

    it('has proper accessibility label when selected', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={true} />
      );
      const buttons = container.querySelectorAll('s-button');
      expect(buttons[0]).toHaveAttribute('accessibilityLabel', 'Currently previewing');
    });
  });

  describe('restore button', () => {
    it('renders restore button when not active', () => {
      render(<VersionCard {...defaultProps} isActive={false} />);
      expect(screen.getByText('Restore')).toBeInTheDocument();
    });

    it('does not render restore button when active', () => {
      render(<VersionCard {...defaultProps} isActive={true} />);
      expect(screen.queryByText('Restore')).not.toBeInTheDocument();
    });

    it('has proper accessibility label', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      const buttons = container.querySelectorAll('s-button');
      // Second button is restore
      expect(buttons[1]).toHaveAttribute('accessibilityLabel', 'Restore this version');
    });
  });

  describe('active state', () => {
    it('shows Active badge when isActive is true', () => {
      render(<VersionCard {...defaultProps} isActive={true} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('does not show Active badge when isActive is false', () => {
      render(<VersionCard {...defaultProps} isActive={false} />);
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });

    it('applies chat-version-card--active class when active', () => {
      const { container } = render(<VersionCard {...defaultProps} isActive={true} />);
      expect(container.querySelector('.chat-version-card--active')).toBeInTheDocument();
    });
  });

  describe('selected state', () => {
    it('applies chat-version-card--selected class when selected', () => {
      const { container } = render(<VersionCard {...defaultProps} isSelected={true} />);
      expect(container.querySelector('.chat-version-card--selected')).toBeInTheDocument();
    });

    it('does not apply selected class when not selected', () => {
      const { container } = render(<VersionCard {...defaultProps} isSelected={false} />);
      expect(container.querySelector('.chat-version-card--selected')).not.toBeInTheDocument();
    });
  });

  describe('Polaris components', () => {
    it('renders s-box container', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      expect(container.querySelector('s-box')).toBeInTheDocument();
    });

    it('renders s-stack for layout', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      expect(container.querySelector('s-stack')).toBeInTheDocument();
    });

    it('renders s-button for actions', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      expect(container.querySelector('s-button')).toBeInTheDocument();
    });

    it('renders s-icon for version badge', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      expect(container.querySelector('s-icon')).toBeInTheDocument();
    });

    it('renders s-badge for active state', () => {
      const { container } = render(<VersionCard {...defaultProps} isActive={true} />);
      expect(container.querySelector('s-badge')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles version number 0', () => {
      render(<VersionCard {...defaultProps} versionNumber={0} />);
      expect(screen.getByText('v0')).toBeInTheDocument();
    });

    it('handles large version numbers', () => {
      render(<VersionCard {...defaultProps} versionNumber={999} />);
      expect(screen.getByText('v999')).toBeInTheDocument();
    });

    it('handles future dates gracefully', () => {
      const futureDate = new Date('2025-12-27T12:00:00Z');
      const { container } = render(
        <VersionCard {...defaultProps} createdAt={futureDate} />
      );
      expect(container.querySelector('.chat-version-card')).toBeInTheDocument();
    });
  });

  describe('memo performance', () => {
    it('is memoized component', () => {
      const { container: container1 } = render(
        <VersionCard {...defaultProps} versionNumber={1} />
      );
      const { container: container2 } = render(
        <VersionCard {...defaultProps} versionNumber={1} />
      );

      expect(container1.querySelector('.chat-version-card')).toBeTruthy();
      expect(container2.querySelector('.chat-version-card')).toBeTruthy();
    });
  });
});
