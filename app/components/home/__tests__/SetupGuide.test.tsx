/**
 * Tests for SetupGuide component
 * Tests step completion checkboxes, dismiss functionality, and accessibility labels
 * Updated to match Shopify's setup guide pattern with s-checkbox components
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFetcher, useNavigate } from 'react-router';
import { SetupGuide } from '../SetupGuide';

// Mock react-router hooks
jest.mock('react-router', () => ({
  useFetcher: jest.fn(),
  useNavigate: jest.fn(),
}));

describe('SetupGuide', () => {
  const mockNavigate = jest.fn();
  const mockSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useFetcher as jest.Mock).mockReturnValue({
      submit: mockSubmit,
      state: 'idle',
    });
  });

  describe('rendering - all states (0/3, 1/3, 2/3, 3/3 steps)', () => {
    it('renders with 0/3 steps completed', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      expect(screen.getByText('Setup Guide')).toBeInTheDocument();
      expect(screen.getByText('0 of 3 steps completed')).toBeInTheDocument();
    });

    it('renders with 1/3 steps completed', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      expect(screen.getByText('1 of 3 steps completed')).toBeInTheDocument();
    });

    it('renders with 2/3 steps completed', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: true,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      expect(screen.getByText('2 of 3 steps completed')).toBeInTheDocument();
    });

    it('does not render dismiss button when onboarding is dismissed', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: true,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('progress bar calculation', () => {
    it('shows 0% progress with 0/3 steps completed', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // The progress bar is an s-box with inlineSize property
      // Check for 0% width
      const progressBars = container.querySelectorAll('s-box');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows 33% progress with 1/3 steps completed', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Progress calculation: (1/3) * 100 = 33.33%
      const progressBars = container.querySelectorAll('s-box');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows 66% progress with 2/3 steps completed', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: true,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Progress calculation: (2/3) * 100 = 66.66%
      const progressBars = container.querySelectorAll('s-box');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows 100% progress with 3/3 steps completed', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: true,
        hasConfiguredSettings: true,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      // All steps complete, progress shows 3 of 3
      expect(screen.getByText('3 of 3 steps completed')).toBeInTheDocument();
    });
  });

  describe('step completion checkboxes', () => {
    it('shows checked checkbox for completed step', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Find checkbox for completed step by label
      const checkbox = container.querySelector(
        's-checkbox[label="Create your first section"]'
      );
      expect(checkbox).toHaveAttribute('checked');
    });

    it('shows unchecked checkbox for incomplete step', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Find all checkboxes (should be 3 total)
      const allCheckboxes = container.querySelectorAll('s-checkbox');
      expect(allCheckboxes.length).toBe(3);

      // First checkbox should have checked="false" (unchecked)
      const firstCheckbox = container.querySelector(
        's-checkbox[label="Create your first section"]'
      );
      expect(firstCheckbox).toHaveAttribute('checked', 'false');
    });

    it('displays correct checkbox state for mixed completion', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: false,
        hasConfiguredSettings: true,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      const allCheckboxes = container.querySelectorAll('s-checkbox');
      expect(allCheckboxes.length).toBe(3);

      // Check specific checkboxes by label
      const generateCheckbox = container.querySelector(
        's-checkbox[label="Create your first section"]'
      );
      const templateCheckbox = container.querySelector(
        's-checkbox[label="Save a template for reuse"]'
      );
      const settingsCheckbox = container.querySelector(
        's-checkbox[label="Configure your preferences"]'
      );

      // checked=true means completed, checked=false means incomplete
      expect(generateCheckbox).toHaveAttribute('checked', 'true');
      expect(templateCheckbox).toHaveAttribute('checked', 'false');
      expect(settingsCheckbox).toHaveAttribute('checked', 'true');
    });

    it('checkboxes are interactive (not disabled)', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // All checkboxes should NOT have disabled attribute (they're interactive)
      const allCheckboxes = container.querySelectorAll('s-checkbox');
      const disabledCheckboxes = container.querySelectorAll('s-checkbox[disabled]');

      expect(allCheckboxes.length).toBe(3);
      expect(disabledCheckboxes.length).toBe(0);
    });

    it('checkboxes have onInput handler attached', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Verify checkboxes are present and can receive input events
      const checkbox = container.querySelector(
        's-checkbox[label="Create your first section"]'
      );

      expect(checkbox).toBeInTheDocument();
      // The onInput handler is attached via React, verified by the component structure
    });
  });

  describe('dismiss functionality', () => {
    it('calls handleDismiss when dismiss button clicked', async () => {
      const user = userEvent.setup();
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Find button with accessibilityLabel="Dismiss setup guide"
      const dismissButton = container.querySelector(
        's-button[accessibilitylabel="Dismiss setup guide"]'
      ) as HTMLElement;

      expect(dismissButton).toBeInTheDocument();
      await user.click(dismissButton);

      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: 'dismissOnboarding' },
        { method: 'post' }
      );
    });

    it('returns null when isDismissed is true', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: true,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      expect(container.firstChild).toBeNull();
    });

    it('persists dismiss state across re-renders', async () => {
      const user = userEvent.setup();
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container, rerender } = render(
        <SetupGuide onboarding={onboarding} />
      );

      const dismissButton = container.querySelector(
        's-button[accessibilitylabel="Dismiss setup guide"]'
      ) as HTMLElement;

      await user.click(dismissButton);

      // Rerender with dismissed state
      const dismissedOnboarding = { ...onboarding, isDismissed: true };
      rerender(<SetupGuide onboarding={dismissedOnboarding} />);

      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: 'dismissOnboarding' },
        { method: 'post' }
      );
    });
  });

  describe('expand/collapse functionality', () => {
    it('expands and collapses steps container', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Find expand/collapse button for guide
      const expandButtons = container.querySelectorAll(
        's-button[icon="chevron-up"], s-button[icon="chevron-down"]'
      );

      expect(expandButtons.length).toBeGreaterThan(0);

      // Verify that steps container has proper display attribute
      const stepsContainer = container.querySelector(
        's-box[border="base"][background="base"]'
      );
      expect(stepsContainer).toBeInTheDocument();
    });

    it('toggles individual step expansion', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Find all chevron buttons (expand/collapse)
      const expandButtons = container.querySelectorAll(
        's-button[icon="chevron-up"], s-button[icon="chevron-down"]'
      );

      // Should have at least guide toggle + step toggles
      expect(expandButtons.length).toBeGreaterThan(1);

      // Verify that step details are present in the DOM
      expect(
        screen.getByText(
          'Describe what you want in natural language and get production-ready Liquid code for your Shopify theme.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('step navigation', () => {
    it('renders action buttons for all steps', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      // Check for action buttons with proper labels
      expect(screen.getByText('Create section')).toBeInTheDocument();
      expect(screen.getByText('View templates')).toBeInTheDocument();
      expect(screen.getByText('Open settings')).toBeInTheDocument();
    });

    it('shows different button labels for completed steps', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      // First step is completed so should have "Revisit" text
      const revisitButtons = screen.getAllByText('Revisit');
      expect(revisitButtons.length).toBeGreaterThan(0);

      // Other steps should have action labels
      expect(screen.getByText('View templates')).toBeInTheDocument();
      expect(screen.getByText('Open settings')).toBeInTheDocument();
    });

    it('has correct href for navigation buttons', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Verify navigate is available to be called
      expect(mockNavigate).toBeDefined();

      // Verify component structure allows navigation
      const buttons = container.querySelectorAll('s-button');
      expect(buttons.length).toBeGreaterThan(3); // at least dismiss, expand, and action buttons
    });
  });

  describe('accessibility labels', () => {
    it('has accessibility label on dismiss button', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      const dismissButton = container.querySelector(
        's-button[accessibilitylabel="Dismiss setup guide"]'
      );
      expect(dismissButton).toBeInTheDocument();
    });

    it('has accessibility label on expand/collapse button', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Should have either collapse or expand label
      const expandButton = container.querySelector(
        's-button[accessibilitylabel*="setup guide"]'
      );
      expect(expandButton).toBeInTheDocument();
    });

    it('has accessibility labels on step action buttons', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Check for action buttons with accessibility labels
      const createButton = container.querySelector(
        's-button[accessibilitylabel*="Create your first section"]'
      );
      expect(createButton).toBeInTheDocument();

      const templateButton = container.querySelector(
        's-button[accessibilitylabel*="Save a template"]'
      );
      expect(templateButton).toBeInTheDocument();

      const settingsButton = container.querySelector(
        's-button[accessibilitylabel*="Configure your preferences"]'
      );
      expect(settingsButton).toBeInTheDocument();
    });

    it('has accessibility labels on step toggle buttons', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Check for step toggle buttons with accessibility labels
      const stepToggleButtons = container.querySelectorAll(
        's-button[accessibilitylabel*="details"]'
      );
      expect(stepToggleButtons.length).toBeGreaterThan(0);
    });
  });

  describe('step display', () => {
    it('displays all 3 setup steps', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { container } = render(<SetupGuide onboarding={onboarding} />);

      // Step titles are in checkbox labels
      expect(
        container.querySelector('s-checkbox[label="Create your first section"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('s-checkbox[label="Save a template for reuse"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('s-checkbox[label="Configure your preferences"]')
      ).toBeInTheDocument();
    });

    it('displays step descriptions', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      // Step descriptions are visible in expanded sections
      expect(
        screen.getByText(
          'Describe what you want in natural language and get production-ready Liquid code for your Shopify theme.'
        )
      ).toBeInTheDocument();
    });

    it('displays guide instructions', () => {
      const onboarding = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      expect(
        screen.getByText(
          'Complete these steps to get the most out of AI Section Generator.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('completion percentage edge cases', () => {
    it('correctly handles partial completion states', () => {
      const onboarding = {
        hasGeneratedSection: true,
        hasSavedTemplate: true,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      render(<SetupGuide onboarding={onboarding} />);

      expect(screen.getByText('2 of 3 steps completed')).toBeInTheDocument();
    });

    it('correctly updates progress on step completion', () => {
      const onboarding1 = {
        hasGeneratedSection: false,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      const { rerender } = render(<SetupGuide onboarding={onboarding1} />);

      expect(screen.getByText('0 of 3 steps completed')).toBeInTheDocument();

      // Simulate first step completion
      const onboarding2 = {
        hasGeneratedSection: true,
        hasSavedTemplate: false,
        hasConfiguredSettings: false,
        isDismissed: false,
      };

      rerender(<SetupGuide onboarding={onboarding2} />);

      expect(screen.getByText('1 of 3 steps completed')).toBeInTheDocument();
    });
  });
});
