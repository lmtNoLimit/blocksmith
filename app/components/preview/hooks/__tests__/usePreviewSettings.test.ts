import { renderHook, act } from '@testing-library/react';
import { usePreviewSettings } from '../usePreviewSettings';

// Mock useResourceFetcher hook
jest.mock('../useResourceFetcher', () => ({
  useResourceFetcher: () => ({
    fetchProduct: jest.fn(),
    fetchCollection: jest.fn(),
    error: null,
  }),
}));

// Sample liquid code with schema
const liquidWithSchema = `
{% schema %}
{
  "name": "Test Section",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Title",
      "default": "Default Title"
    },
    {
      "type": "range",
      "id": "font_size",
      "label": "Font Size",
      "min": 12,
      "max": 48,
      "default": 16
    }
  ]
}
{% endschema %}
`;

const liquidNoSchema = '<div>No schema</div>';

describe('usePreviewSettings', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should parse schema from liquid code', () => {
      const { result } = renderHook(() => usePreviewSettings(liquidWithSchema));

      expect(result.current.parsedSchema).not.toBeNull();
      expect(result.current.schemaSettings).toHaveLength(2);
    });

    it('should return null schema for code without schema', () => {
      const { result } = renderHook(() => usePreviewSettings(liquidNoSchema));

      expect(result.current.parsedSchema).toBeNull();
      expect(result.current.schemaSettings).toHaveLength(0);
    });

    it('should initialize settings with defaults', () => {
      const { result } = renderHook(() => usePreviewSettings(liquidWithSchema));

      expect(result.current.settingsValues).toEqual({
        title: 'Default Title',
        font_size: 16,
      });
    });

    it('should start with isDirty false', () => {
      const { result } = renderHook(() => usePreviewSettings(liquidWithSchema));

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('isDirty tracking', () => {
    it('should set isDirty true when settings change', () => {
      const { result } = renderHook(() => usePreviewSettings(liquidWithSchema));

      act(() => {
        result.current.setSettingsValues({
          title: 'New Title',
          font_size: 16,
        });
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should set isDirty false when settings match defaults', () => {
      const { result } = renderHook(() => usePreviewSettings(liquidWithSchema));

      // Change settings
      act(() => {
        result.current.setSettingsValues({
          title: 'New Title',
          font_size: 20,
        });
      });
      expect(result.current.isDirty).toBe(true);

      // Change back to defaults
      act(() => {
        result.current.setSettingsValues({
          title: 'Default Title',
          font_size: 16,
        });
      });
      expect(result.current.isDirty).toBe(false);
    });

    it('should set isDirty false after reset', () => {
      const { result } = renderHook(() => usePreviewSettings(liquidWithSchema));

      // Change settings
      act(() => {
        result.current.setSettingsValues({
          title: 'New Title',
          font_size: 20,
        });
      });
      expect(result.current.isDirty).toBe(true);

      // Reset
      act(() => {
        result.current.resetToSchemaDefaults();
      });
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('debounced callback', () => {
    it('should call onSettingsChange after debounce period', () => {
      const onSettingsChange = jest.fn();
      const { result } = renderHook(() =>
        usePreviewSettings(liquidWithSchema, { onSettingsChange, debounceMs: 1000 })
      );

      act(() => {
        result.current.setSettingsValues({
          title: 'New Title',
          font_size: 16,
        });
      });

      // Callback should not be called immediately
      expect(onSettingsChange).not.toHaveBeenCalled();

      // Fast forward past debounce time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(onSettingsChange).toHaveBeenCalledWith(
        { title: 'New Title', font_size: 16 },
        true
      );
    });

    it('should coalesce multiple rapid changes to single callback', () => {
      const onSettingsChange = jest.fn();
      const { result } = renderHook(() =>
        usePreviewSettings(liquidWithSchema, { onSettingsChange, debounceMs: 1000 })
      );

      // Make multiple rapid changes
      act(() => {
        result.current.setSettingsValues({ title: 'Title 1', font_size: 16 });
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      act(() => {
        result.current.setSettingsValues({ title: 'Title 2', font_size: 18 });
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      act(() => {
        result.current.setSettingsValues({ title: 'Title 3', font_size: 20 });
      });

      // Should not have been called yet
      expect(onSettingsChange).not.toHaveBeenCalled();

      // Fast forward past debounce
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should only be called once with final values
      expect(onSettingsChange).toHaveBeenCalledTimes(1);
      expect(onSettingsChange).toHaveBeenCalledWith(
        { title: 'Title 3', font_size: 20 },
        true
      );
    });

    it('should use default debounce of 2000ms', () => {
      const onSettingsChange = jest.fn();
      const { result } = renderHook(() =>
        usePreviewSettings(liquidWithSchema, { onSettingsChange })
      );

      act(() => {
        result.current.setSettingsValues({ title: 'New', font_size: 16 });
      });

      // Not called at 1500ms
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(onSettingsChange).not.toHaveBeenCalled();

      // Called at 2000ms
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('resetToSchemaDefaults', () => {
    it('should reset values to schema defaults', () => {
      const { result } = renderHook(() => usePreviewSettings(liquidWithSchema));

      act(() => {
        result.current.setSettingsValues({ title: 'Changed', font_size: 30 });
      });
      expect(result.current.settingsValues.title).toBe('Changed');

      act(() => {
        result.current.resetToSchemaDefaults();
      });

      expect(result.current.settingsValues).toEqual({
        title: 'Default Title',
        font_size: 16,
      });
    });

    it('should call onSettingsChange immediately with hasChanges false', () => {
      const onSettingsChange = jest.fn();
      const { result } = renderHook(() =>
        usePreviewSettings(liquidWithSchema, { onSettingsChange })
      );

      act(() => {
        result.current.setSettingsValues({ title: 'Changed', font_size: 30 });
      });

      // Clear previous calls from debounced callback
      onSettingsChange.mockClear();

      act(() => {
        result.current.resetToSchemaDefaults();
      });

      // Should be called immediately (not debounced)
      expect(onSettingsChange).toHaveBeenCalledWith(
        { title: 'Default Title', font_size: 16 },
        false
      );
    });
  });

  describe('forceSync', () => {
    it('should immediately call onSettingsChange with current state', () => {
      const onSettingsChange = jest.fn();
      const { result } = renderHook(() =>
        usePreviewSettings(liquidWithSchema, { onSettingsChange })
      );

      act(() => {
        result.current.setSettingsValues({ title: 'Custom', font_size: 24 });
      });

      // Clear previous calls
      onSettingsChange.mockClear();

      act(() => {
        result.current.forceSync();
      });

      expect(onSettingsChange).toHaveBeenCalledWith(
        { title: 'Custom', font_size: 24 },
        true
      );
    });

    it('should report isDirty false when values match defaults', () => {
      const onSettingsChange = jest.fn();
      const { result } = renderHook(() =>
        usePreviewSettings(liquidWithSchema, { onSettingsChange })
      );

      act(() => {
        result.current.forceSync();
      });

      expect(onSettingsChange).toHaveBeenCalledWith(
        { title: 'Default Title', font_size: 16 },
        false
      );
    });
  });

  describe('schema changes', () => {
    it('should reset state when liquid code changes', () => {
      const { result, rerender } = renderHook(
        ({ code }) => usePreviewSettings(code),
        { initialProps: { code: liquidWithSchema } }
      );

      // Change settings
      act(() => {
        result.current.setSettingsValues({ title: 'Modified', font_size: 30 });
      });
      expect(result.current.isDirty).toBe(true);

      // Change liquid code - this would parse new schema
      const newLiquid = `
{% schema %}
{
  "name": "Different Section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "New Default"
    }
  ]
}
{% endschema %}
`;

      rerender({ code: newLiquid });

      // State should be reset based on new schema
      expect(result.current.isDirty).toBe(false);
      expect(result.current.settingsValues).toEqual({ heading: 'New Default' });
    });
  });

  /**
   * Phase 05 Edge Cases - Settings Sync Flow Testing
   * Tests for sync scenarios documented in plans/260106-2006-section-settings-sync/phase-05-testing.md
   */
  describe('Phase 05 Sync Flow Edge Cases', () => {
    describe('Multiple Rapid Edits', () => {
      it('should coalesce rapid edits into single callback', () => {
        const onSettingsChange = jest.fn();
        const { result } = renderHook(() =>
          usePreviewSettings(liquidWithSchema, { onSettingsChange, debounceMs: 2000 })
        );

        // Simulate typing "abc" quickly (< 2s total)
        act(() => {
          result.current.setSettingsValues({ title: 'a', font_size: 16 });
        });
        act(() => {
          jest.advanceTimersByTime(100);
        });
        act(() => {
          result.current.setSettingsValues({ title: 'ab', font_size: 16 });
        });
        act(() => {
          jest.advanceTimersByTime(100);
        });
        act(() => {
          result.current.setSettingsValues({ title: 'abc', font_size: 16 });
        });

        // Should not have been called yet
        expect(onSettingsChange).not.toHaveBeenCalled();

        // Fast forward past debounce
        act(() => {
          jest.advanceTimersByTime(2000);
        });

        // Should only be called ONCE with final value "abc"
        expect(onSettingsChange).toHaveBeenCalledTimes(1);
        expect(onSettingsChange).toHaveBeenCalledWith(
          { title: 'abc', font_size: 16 },
          true
        );
      });

      it('should not include intermediate states in callback', () => {
        const onSettingsChange = jest.fn();
        const { result } = renderHook(() =>
          usePreviewSettings(liquidWithSchema, { onSettingsChange, debounceMs: 2000 })
        );

        // Make multiple rapid changes
        const intermediateValues = ['H', 'He', 'Hel', 'Hell', 'Hello'];
        intermediateValues.forEach((value, i) => {
          act(() => {
            result.current.setSettingsValues({ title: value, font_size: 16 });
          });
          if (i < intermediateValues.length - 1) {
            act(() => {
              jest.advanceTimersByTime(100);
            });
          }
        });

        // Fast forward to trigger callback
        act(() => {
          jest.advanceTimersByTime(2000);
        });

        // Verify only final value was passed
        expect(onSettingsChange).toHaveBeenCalledTimes(1);
        expect(onSettingsChange).toHaveBeenCalledWith(
          { title: 'Hello', font_size: 16 },
          true
        );
      });
    });

    describe('Reset Functionality', () => {
      it('should reset UI to schema defaults and clear isDirty', () => {
        const { result } = renderHook(() => usePreviewSettings(liquidWithSchema));

        // Edit multiple settings
        act(() => {
          result.current.setSettingsValues({ title: 'Changed', font_size: 24 });
        });
        expect(result.current.isDirty).toBe(true);
        expect(result.current.settingsValues.title).toBe('Changed');

        // Reset
        act(() => {
          result.current.resetToSchemaDefaults();
        });

        // Verify reset to defaults
        expect(result.current.settingsValues).toEqual({
          title: 'Default Title',
          font_size: 16,
        });
        expect(result.current.isDirty).toBe(false);
      });

      it('should notify callback with hasChanges=false on reset', () => {
        const onSettingsChange = jest.fn();
        const { result } = renderHook(() =>
          usePreviewSettings(liquidWithSchema, { onSettingsChange })
        );

        // Edit settings
        act(() => {
          result.current.setSettingsValues({ title: 'Changed', font_size: 24 });
        });
        onSettingsChange.mockClear();

        // Reset
        act(() => {
          result.current.resetToSchemaDefaults();
        });

        // Callback should be called immediately with hasChanges=false
        expect(onSettingsChange).toHaveBeenCalledWith(
          { title: 'Default Title', font_size: 16 },
          false
        );
      });
    });

    describe('AI Regeneration Simulation', () => {
      it('should reset settings when schema changes (simulating AI regeneration)', () => {
        const onSettingsChange = jest.fn();
        const { result, rerender } = renderHook(
          ({ code }) => usePreviewSettings(code, { onSettingsChange }),
          { initialProps: { code: liquidWithSchema } }
        );

        // User edits settings
        act(() => {
          result.current.setSettingsValues({ title: 'User Edit', font_size: 20 });
        });
        expect(result.current.isDirty).toBe(true);

        // Simulate AI regenerating section with new schema
        const aiGeneratedLiquid = `
{% schema %}
{
  "name": "AI Generated Section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "AI Default"
    },
    {
      "type": "color",
      "id": "bg_color",
      "label": "Background",
      "default": "#ffffff"
    }
  ]
}
{% endschema %}
`;

        rerender({ code: aiGeneratedLiquid });

        // Settings should reset to new AI defaults
        expect(result.current.isDirty).toBe(false);
        expect(result.current.settingsValues).toEqual({
          heading: 'AI Default',
          bg_color: '#ffffff',
        });
      });
    });

    describe('Empty/Invalid Schema Handling', () => {
      it('should handle code without schema gracefully', () => {
        const { result } = renderHook(() => usePreviewSettings(liquidNoSchema));

        expect(result.current.parsedSchema).toBeNull();
        expect(result.current.schemaSettings).toHaveLength(0);
        expect(result.current.settingsValues).toEqual({});
        expect(result.current.isDirty).toBe(false);
      });

      it('should handle empty string code', () => {
        const { result } = renderHook(() => usePreviewSettings(''));

        expect(result.current.parsedSchema).toBeNull();
        expect(result.current.schemaSettings).toHaveLength(0);
        expect(result.current.settingsValues).toEqual({});
      });

      it('should handle malformed JSON in schema', () => {
        const malformedLiquid = '{% schema %}{ invalid json {% endschema %}';
        const { result } = renderHook(() => usePreviewSettings(malformedLiquid));

        expect(result.current.parsedSchema).toBeNull();
        expect(result.current.schemaSettings).toHaveLength(0);
      });
    });

    describe('Callback Cleanup', () => {
      it('should cancel debounced callback on unmount', () => {
        const onSettingsChange = jest.fn();
        const { result, unmount } = renderHook(() =>
          usePreviewSettings(liquidWithSchema, { onSettingsChange, debounceMs: 2000 })
        );

        // Make a change
        act(() => {
          result.current.setSettingsValues({ title: 'Changed', font_size: 16 });
        });

        // Unmount before debounce completes
        unmount();

        // Advance timers past debounce
        act(() => {
          jest.advanceTimersByTime(3000);
        });

        // Callback should NOT have been called after unmount
        expect(onSettingsChange).not.toHaveBeenCalled();
      });
    });
  });
});
