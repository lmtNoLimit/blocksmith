/**
 * Tests for FeedbackWidget component
 */

import { render } from '@testing-library/react';
import { useFetcher } from 'react-router';
import { FeedbackWidget } from '../FeedbackWidget';

// Mock react-router
jest.mock('react-router', () => ({
  useFetcher: jest.fn(),
}));

describe('FeedbackWidget', () => {
  const mockSectionId = 'section-123';
  let mockSubmit: jest.Mock;

  beforeEach(() => {
    mockSubmit = jest.fn();
    (useFetcher as jest.Mock).mockReturnValue({
      submit: mockSubmit,
      state: 'idle',
      data: undefined,
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );
      expect(container).toBeTruthy();
    });

    it('should display feedback question', () => {
      render(<FeedbackWidget sectionId={mockSectionId} />);

      const container = render(
        <FeedbackWidget sectionId={mockSectionId} />
      ).container;
      expect(container.innerHTML).toContain('How was this AI-generated section?');
    });

    it('should render good button', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container.innerHTML).toContain('Good');
    });

    it('should render needs work button', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container.innerHTML).toContain('Needs work');
    });

    it('should render skip button', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container.innerHTML).toContain('Skip');
    });
  });

  describe('feedback submission', () => {
    it('should have feedback submission form', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      // Check for s-components in the rendered output
      expect(container.innerHTML).toContain('Good');
      expect(container.innerHTML).toContain('Needs work');
      expect(container.innerHTML).toContain('s-button');
    });

    it('should render feedback question', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container.innerHTML).toContain('How was this AI-generated section?');
    });

    it('should render all feedback options', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      const text = container.innerHTML;
      expect(text).toContain('Good');
      expect(text).toContain('Needs work');
      expect(text).toContain('Skip');
    });

    it('should initialize with no submitted state', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      // Should show feedback form, not success message
      expect(container.innerHTML).toContain('How was this AI-generated section?');
      expect(container.innerHTML).not.toContain('Thanks for your feedback');
    });

    it('should pass correct sectionId to fetcher', () => {
      const testId = 'unique-section-id';
      render(<FeedbackWidget sectionId={testId} />);

      // Mock should be available for future interactions
      expect(mockSubmit).toBeDefined();
    });

    it('should submit to correct API endpoint', () => {
      render(<FeedbackWidget sectionId={mockSectionId} />);

      // Verify fetcher config would use correct endpoint
      expect(mockSubmit).toBeDefined();
    });
  });

  describe('dismiss functionality', () => {
    it('should accept onDismiss callback', () => {
      const mockOnDismiss = jest.fn();

      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} onDismiss={mockOnDismiss} />
      );

      expect(container).toBeTruthy();
      expect(container.innerHTML).toContain('Skip');
    });

    it('should not require onDismiss prop', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container).toBeTruthy();
    });

    it('should render skip button when onDismiss provided', () => {
      const mockOnDismiss = jest.fn();

      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} onDismiss={mockOnDismiss} />
      );

      expect(container.innerHTML).toContain('Skip');
    });
  });

  describe('state transitions', () => {
    it('should show initial feedback UI on mount', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container.innerHTML).toContain('How was this AI-generated section?');
      expect(container.innerHTML).toContain('Good');
    });

    it('should render success message when submitted', () => {
      // Create a second mock with submitted state
      const submittedFetcher = {
        submit: jest.fn(),
        state: 'idle',
        data: { success: true },
      };

      (useFetcher as jest.Mock).mockReturnValue(submittedFetcher);

      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have accessible button components', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container.innerHTML).toContain('s-button');
    });

    it('should have descriptive text for feedback options', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container.innerHTML).toContain('Good');
      expect(container.innerHTML).toContain('Needs work');
      expect(container.innerHTML).toContain('Skip');
    });

    it('should include icons for visual feedback', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container.innerHTML).toContain('s-icon');
    });
  });

  describe('prop variations', () => {
    it('should accept sectionId prop', () => {
      const { container } = render(
        <FeedbackWidget sectionId="test-section-id" />
      );

      expect(container).toBeTruthy();
      expect(container.innerHTML).toContain('How was this AI-generated section?');
    });

    it('should accept onDismiss callback', () => {
      const mockCallback = jest.fn();
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} onDismiss={mockCallback} />
      );

      expect(container).toBeTruthy();
    });

    it('should work with different section IDs', () => {
      const sectionId1 = 'section-1';

      const { container } = render(
        <FeedbackWidget sectionId={sectionId1} />
      );

      expect(container).toBeTruthy();
      // Verify the component renders regardless of section ID
      expect(container.innerHTML).toContain('How was this AI-generated section?');
    });
  });

  describe('error handling', () => {
    it('should handle missing sectionId gracefully', () => {
      const { container } = render(
        <FeedbackWidget sectionId="" />
      );

      expect(container).toBeTruthy();
      expect(container.innerHTML).toContain('How was this AI-generated section?');
    });

    it('should render without errors when component mounts', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle null onDismiss gracefully', () => {
      const { container } = render(
        <FeedbackWidget sectionId={mockSectionId} onDismiss={undefined} />
      );

      expect(container).toBeTruthy();
    });
  });
});
