/**
 * Tests for SchemaValidation component
 */

import { render } from '@testing-library/react';
import { SchemaValidation } from '../SchemaValidation';

describe('SchemaValidation', () => {
  const mockValidationPassed: SchemaValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    schema: {
      name: 'Test Section',
    },
  };

  const mockValidationWithErrors: SchemaValidationResult = {
    valid: false,
    errors: [
      {
        valid: false,
        message: 'Missing {% schema %} block',
        suggestion: 'Add a schema block',
        ruleId: 'schema-exists',
        ruleName: 'Schema block exists',
      },
    ],
    warnings: [],
    schema: null,
  };

  const mockValidationWithWarnings: SchemaValidationResult = {
    valid: true,
    errors: [],
    warnings: [
      {
        valid: false,
        message: 'No presets found',
        suggestion: 'Add presets for theme editor',
        ruleId: 'schema-has-presets',
        ruleName: 'Schema has presets',
      },
    ],
    schema: {
      name: 'Test',
    },
  };

  const mockValidationWithBoth: SchemaValidationResult = {
    valid: false,
    errors: [
      {
        valid: false,
        message: 'Invalid JSON',
        suggestion: 'Check syntax',
        ruleId: 'schema-valid-json',
        ruleName: 'Valid JSON in schema',
      },
    ],
    warnings: [
      {
        valid: false,
        message: 'CSS not scoped',
        suggestion: 'Use section ID',
        ruleId: 'css-uses-section-id',
        ruleName: 'CSS uses section ID',
      },
    ],
    schema: null,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationPassed} />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(
        <SchemaValidation
          validation={mockValidationPassed}
          isLoading={true}
        />
      );

      // Look for loading elements - using flexible selectors
      const container = render(
        <SchemaValidation
          validation={mockValidationPassed}
          isLoading={true}
        />
      ).container;

      expect(container.innerHTML).toContain('Validating');
    });

    it('should not show loading state when isLoading is false', () => {
      const { container } = render(
        <SchemaValidation
          validation={mockValidationPassed}
          isLoading={false}
        />
      );

      expect(container.innerHTML).not.toContain('Validating');
    });
  });

  describe('passed validation', () => {
    it('should show success state when validation passes', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationPassed} />
      );

      expect(container.innerHTML).toContain('Ready to publish');
    });

    it('should show check icon on success', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationPassed} />
      );

      expect(container.innerHTML).toContain('check-circle');
    });

    it('should not show errors when validation passes', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationPassed} />
      );

      expect(container.innerHTML).not.toContain('Missing');
    });
  });

  describe('validation errors', () => {
    it('should show error state when validation fails', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithErrors} />
      );

      expect(container.innerHTML).toContain('error');
    });

    it('should show alert icon on error', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithErrors} />
      );

      expect(container.innerHTML).toContain('alert-circle');
    });

    it('should display error count', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithErrors} />
      );

      expect(container.innerHTML).toContain('1 error');
    });

    it('should display error message', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithErrors} />
      );

      expect(container.innerHTML).toContain('Missing {% schema %} block');
    });

    it('should display error suggestion', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithErrors} />
      );

      expect(container.innerHTML).toContain('Add a schema block');
    });

    it('should handle multiple errors', () => {
      const multiErrors: SchemaValidationResult = {
        valid: false,
        errors: [
          {
            valid: false,
            message: 'Error 1',
            ruleId: 'rule-1',
            ruleName: 'Rule 1',
          },
          {
            valid: false,
            message: 'Error 2',
            ruleId: 'rule-2',
            ruleName: 'Rule 2',
          },
        ],
        warnings: [],
        schema: null,
      };

      const { container } = render(
        <SchemaValidation validation={multiErrors} />
      );

      expect(container.innerHTML).toContain('2 errors');
      expect(container.innerHTML).toContain('Error 1');
      expect(container.innerHTML).toContain('Error 2');
    });
  });

  describe('warnings', () => {
    it('should show warnings badge', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithWarnings} />
      );

      expect(container.innerHTML).toContain('1 warning');
    });

    it('should display warning message', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithWarnings} />
      );

      expect(container.innerHTML).toContain('No presets found');
    });

    it('should display warning suggestion', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithWarnings} />
      );

      expect(container.innerHTML).toContain('Add presets for theme editor');
    });

    it('should handle multiple warnings', () => {
      const multiWarnings: SchemaValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          {
            valid: false,
            message: 'Warning 1',
            ruleId: 'warn-1',
            ruleName: 'Warning 1',
          },
          {
            valid: false,
            message: 'Warning 2',
            ruleId: 'warn-2',
            ruleName: 'Warning 2',
          },
        ],
        schema: {
          name: 'Test',
        },
      };

      const { container } = render(
        <SchemaValidation validation={multiWarnings} />
      );

      expect(container.innerHTML).toContain('2 warnings');
      expect(container.innerHTML).toContain('Warning 1');
      expect(container.innerHTML).toContain('Warning 2');
    });
  });

  describe('errors and warnings together', () => {
    it('should display both errors and warnings', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithBoth} />
      );

      expect(container.innerHTML).toContain('1 error');
      expect(container.innerHTML).toContain('1 warning');
      expect(container.innerHTML).toContain('Invalid JSON');
      expect(container.innerHTML).toContain('CSS not scoped');
    });

    it('should show error section before warning section', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithBoth} />
      );

      const errorIndex = container.innerHTML.indexOf('Invalid JSON');
      const warningIndex = container.innerHTML.indexOf('CSS not scoped');

      expect(errorIndex).toBeLessThan(warningIndex);
    });
  });

  describe('edge cases', () => {
    it('should handle validation with no errors or warnings', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationPassed} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle empty error suggestions', () => {
      const validation: SchemaValidationResult = {
        valid: false,
        errors: [
          {
            valid: false,
            message: 'Some error',
            ruleId: 'rule',
            ruleName: 'Rule',
          },
        ],
        warnings: [],
        schema: null,
      };

      const { container } = render(
        <SchemaValidation validation={validation} />
      );

      expect(container.innerHTML).toContain('Some error');
    });

    it('should handle plural/singular correctly for 1 error', () => {
      const { container } = render(
        <SchemaValidation validation={mockValidationWithErrors} />
      );

      expect(container.innerHTML).toContain('1 error');
      expect(container.innerHTML).not.toContain('1 errors');
    });

    it('should handle plural/singular correctly for multiple errors', () => {
      const multiErrors: SchemaValidationResult = {
        valid: false,
        errors: [
          {
            valid: false,
            message: 'Error 1',
            ruleId: 'rule-1',
            ruleName: 'Rule 1',
          },
          {
            valid: false,
            message: 'Error 2',
            ruleId: 'rule-2',
            ruleName: 'Rule 2',
          },
        ],
        warnings: [],
        schema: null,
      };

      const { container } = render(
        <SchemaValidation validation={multiErrors} />
      );

      expect(container.innerHTML).toContain('2 errors');
    });
  });
});
