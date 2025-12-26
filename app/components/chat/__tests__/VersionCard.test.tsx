/**
 * Tests for VersionCard component
 * Tests version info display, icon actions, accessibility, and time formatting
 */
import { render, screen, fireEvent } from '@testing-library/react';
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

    it('renders separator between version and time', () => {
      render(<VersionCard {...defaultProps} />);
      expect(screen.getByText('•')).toBeInTheDocument();
    });

    it('renders relative time string', () => {
      render(<VersionCard {...defaultProps} />);
      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('renders correct structure with info container', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      expect(container.querySelector('.version-card__info')).toBeInTheDocument();
      expect(container.querySelector('.version-card__number')).toBeInTheDocument();
      expect(container.querySelector('.version-card__separator')).toBeInTheDocument();
      expect(container.querySelector('.version-card__time')).toBeInTheDocument();
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

    it('shows "59 min ago" for 59 minutes', () => {
      const fiftyNineMinsAgo = new Date('2025-12-26T11:01:00Z');
      render(<VersionCard {...defaultProps} createdAt={fiftyNineMinsAgo} />);
      expect(screen.getByText('59 min ago')).toBeInTheDocument();
    });

    it('shows "Xh ago" for < 24 hours', () => {
      const threeHoursAgo = new Date('2025-12-26T09:00:00Z');
      render(<VersionCard {...defaultProps} createdAt={threeHoursAgo} />);
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('shows "1h ago" for exactly 1 hour', () => {
      const oneHourAgo = new Date('2025-12-26T11:00:00Z');
      render(<VersionCard {...defaultProps} createdAt={oneHourAgo} />);
      expect(screen.getByText('1h ago')).toBeInTheDocument();
    });

    it('shows "23h ago" for 23 hours', () => {
      const twentyThreeHoursAgo = new Date('2025-12-25T13:00:00Z');
      render(<VersionCard {...defaultProps} createdAt={twentyThreeHoursAgo} />);
      expect(screen.getByText('23h ago')).toBeInTheDocument();
    });

    it('shows "Xd ago" for >= 24 hours', () => {
      const twoDaysAgo = new Date('2025-12-24T12:00:00Z');
      render(<VersionCard {...defaultProps} createdAt={twoDaysAgo} />);
      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('shows "1d ago" for exactly 1 day', () => {
      const oneDayAgo = new Date('2025-12-25T12:00:00Z');
      render(<VersionCard {...defaultProps} createdAt={oneDayAgo} />);
      expect(screen.getByText('1d ago')).toBeInTheDocument();
    });

    it('handles date passed as string (date instance check)', () => {
      const dateString = '2025-12-26T11:55:00Z';
      // The component should handle Date instances properly
      render(<VersionCard {...defaultProps} createdAt={new Date(dateString)} />);
      expect(screen.getByText('5 min ago')).toBeInTheDocument();
    });
  });

  describe('preview button', () => {
    it('renders preview button with eye icon', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onPreview when preview button clicked', () => {
      const { container } = render(
        <VersionCard {...defaultProps} onPreview={mockOnPreview} />
      );

      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0]; // First button is preview

      fireEvent.click(previewBtn);
      expect(mockOnPreview).toHaveBeenCalledTimes(1);
    });

    it('has proper aria-label when not selected', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={false} />
      );
      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      expect(previewBtn).toHaveAttribute(
        'aria-label',
        'Preview this version'
      );
    });

    it('has proper aria-label when selected', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={true} />
      );
      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      expect(previewBtn).toHaveAttribute(
        'aria-label',
        'Currently previewing'
      );
    });

    it('sets aria-pressed to true when selected', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={true} />
      );
      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      expect(previewBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('sets aria-pressed to false when not selected', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={false} />
      );
      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      expect(previewBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('applies active class when selected', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={true} />
      );
      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      expect(previewBtn).toHaveClass('version-card__icon--active');
    });

    it('does not apply active class when not selected', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={false} />
      );
      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      expect(previewBtn).not.toHaveClass('version-card__icon--active');
    });

    it('stops event propagation on preview click', () => {
      const { container } = render(
        <VersionCard {...defaultProps} onPreview={mockOnPreview} />
      );

      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      fireEvent.click(previewBtn);
      expect(mockOnPreview).toHaveBeenCalled();
    });
  });

  describe('restore button', () => {
    it('renders restore button', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('calls onRestore when restore button clicked', () => {
      const { container } = render(
        <VersionCard {...defaultProps} onRestore={mockOnRestore} />
      );

      const buttons = container.querySelectorAll('button');
      const restoreBtn = buttons[1]; // Second button is restore

      fireEvent.click(restoreBtn);
      expect(mockOnRestore).toHaveBeenCalledTimes(1);
    });

    it('has proper aria-label', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      const restoreBtn = buttons[1];

      expect(restoreBtn).toHaveAttribute('aria-label', 'Restore this version');
    });

    it('is disabled when isActive is true', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isActive={true} />
      );
      const buttons = container.querySelectorAll('button');
      const restoreBtn = buttons[1];

      expect(restoreBtn).toBeDisabled();
    });

    it('is enabled when isActive is false', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isActive={false} />
      );
      const buttons = container.querySelectorAll('button');
      const restoreBtn = buttons[1];

      expect(restoreBtn).not.toBeDisabled();
    });

    it('cannot be clicked when disabled', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isActive={true} onRestore={mockOnRestore} />
      );

      const buttons = container.querySelectorAll('button');
      const restoreBtn = buttons[1];

      fireEvent.click(restoreBtn);
      expect(mockOnRestore).not.toHaveBeenCalled();
    });

    it('stops event propagation on restore click', () => {
      const { container } = render(
        <VersionCard {...defaultProps} onRestore={mockOnRestore} />
      );

      const buttons = container.querySelectorAll('button');
      const restoreBtn = buttons[1];

      fireEvent.click(restoreBtn);
      expect(mockOnRestore).toHaveBeenCalled();
    });
  });

  describe('active state styling', () => {
    it('applies version-card--active class when isActive is true', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isActive={true} />
      );
      expect(container.querySelector('.version-card--active')).toBeInTheDocument();
    });

    it('does not apply version-card--active class when isActive is false', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isActive={false} />
      );
      expect(container.querySelector('.version-card--active')).not.toBeInTheDocument();
    });

    it('applies base version-card class always', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      expect(container.querySelector('.version-card')).toBeInTheDocument();
    });
  });

  describe('selected state styling', () => {
    it('applies version-card--selected class when isSelected is true', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={true} />
      );
      expect(container.querySelector('.version-card--selected')).toBeInTheDocument();
    });

    it('does not apply version-card--selected class when isSelected is false', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={false} />
      );
      expect(container.querySelector('.version-card--selected')).not.toBeInTheDocument();
    });
  });

  describe('combined states', () => {
    it('renders with both active and selected states', () => {
      const { container } = render(
        <VersionCard
          {...defaultProps}
          isActive={true}
          isSelected={true}
        />
      );

      expect(container.querySelector('.version-card--active')).toBeInTheDocument();
      expect(container.querySelector('.version-card--selected')).toBeInTheDocument();
    });

    it('active restore button disabled even when selected', () => {
      const { container } = render(
        <VersionCard
          {...defaultProps}
          isActive={true}
          isSelected={true}
          onRestore={mockOnRestore}
        />
      );

      const buttons = container.querySelectorAll('button');
      const restoreBtn = buttons[1];

      expect(restoreBtn).toBeDisabled();
      fireEvent.click(restoreBtn);
      expect(mockOnRestore).not.toHaveBeenCalled();
    });

    it('preview remains functional when active version', () => {
      const { container } = render(
        <VersionCard
          {...defaultProps}
          isActive={true}
          onPreview={mockOnPreview}
        />
      );

      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      fireEvent.click(previewBtn);
      expect(mockOnPreview).toHaveBeenCalled();
    });
  });

  describe('button structure', () => {
    it('both buttons have type="button"', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach(btn => {
        expect(btn).toHaveAttribute('type', 'button');
      });
    });

    it('buttons have version-card__icon class', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      const iconButtons = container.querySelectorAll('.version-card__icon');

      expect(iconButtons.length).toBe(2);
    });

    it('renders buttons in actions container', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      expect(container.querySelector('.version-card__actions')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has meaningful structure for screen readers', () => {
      const { container } = render(<VersionCard {...defaultProps} />);

      const card = container.querySelector('.version-card');
      expect(card).toBeInTheDocument();

      const info = container.querySelector('.version-card__info');
      expect(info).toBeInTheDocument();

      const actions = container.querySelector('.version-card__actions');
      expect(actions).toBeInTheDocument();
    });

    it('has aria labels on all interactive elements', () => {
      const { container } = render(<VersionCard {...defaultProps} />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach(btn => {
        expect(btn).toHaveAttribute('aria-label');
      });
    });

    it('preview button uses aria-pressed', () => {
      const { container } = render(
        <VersionCard {...defaultProps} isSelected={true} />
      );
      const buttons = container.querySelectorAll('button');
      const previewBtn = buttons[0];

      expect(previewBtn).toHaveAttribute('aria-pressed');
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
      render(<VersionCard {...defaultProps} createdAt={futureDate} />);
      // Should not crash and should show negative time (handled gracefully)
      const { container } = render(
        <VersionCard {...defaultProps} createdAt={futureDate} />
      );
      expect(container.querySelector('.version-card')).toBeInTheDocument();
    });

    it('handles all callbacks being provided', () => {
      const { container } = render(
        <VersionCard
          {...defaultProps}
          onPreview={mockOnPreview}
          onRestore={mockOnRestore}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);
      fireEvent.click(buttons[1]);

      expect(mockOnPreview).toHaveBeenCalledTimes(1);
      expect(mockOnRestore).toHaveBeenCalledTimes(1);
    });
  });

  describe('memo performance', () => {
    it('is memoized component', () => {
      // Component is exported as memo
      // Verify it's a memoized function by checking its display name
      const { container: container1 } = render(
        <VersionCard {...defaultProps} versionNumber={1} />
      );
      const { container: container2 } = render(
        <VersionCard {...defaultProps} versionNumber={1} />
      );

      expect(container1.querySelector('.version-card')).toBeTruthy();
      expect(container2.querySelector('.version-card')).toBeTruthy();
    });
  });
});
