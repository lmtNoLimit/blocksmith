// @jest-environment jsdom
import {
  buildConversationPrompt,
  getChatSystemPrompt,
  summarizeOldMessages,
} from '../context-builder';
import type { ConversationContext } from '../../types/ai.types';
import type { ModelMessage } from '../../types/chat.types';

describe('buildConversationPrompt', () => {
  it('should include current code when provided', () => {
    const context: ConversationContext = {
      currentCode: '{% schema %}{"name": "Test"}{% endschema %}<div>Test</div>',
      recentMessages: [],
    };

    const result = buildConversationPrompt('Make it blue', context);

    expect(result).toContain('=== CURRENT SECTION CODE ===');
    expect(result).toContain('{% schema %}');
    expect(result).toContain('```liquid');
  });

  it('should include recent messages', () => {
    const context: ConversationContext = {
      recentMessages: [
        { role: 'user', content: 'Add a button' },
        { role: 'assistant', content: 'Here is the button code...' },
      ],
    };

    const result = buildConversationPrompt('Change color', context);

    expect(result).toContain('=== RECENT CONVERSATION ===');
    expect(result).toContain('User: Add a button');
    expect(result).toContain('Assistant: Here is the button');
  });

  it('should truncate long messages', () => {
    const longMessage = 'A'.repeat(600);
    const context: ConversationContext = {
      recentMessages: [
        { role: 'user', content: longMessage },
      ],
    };

    const result = buildConversationPrompt('Next', context);

    expect(result).toContain('...[truncated]');
    expect(result.length).toBeLessThan(longMessage.length);
  });

  it('should include summarized history', () => {
    const context: ConversationContext = {
      recentMessages: [],
      summarizedHistory: 'Previous conversation covered color changes and button styling.',
    };

    const result = buildConversationPrompt('Continue', context);

    expect(result).toContain('=== EARLIER CONTEXT (SUMMARIZED) ===');
    expect(result).toContain('color changes and button');
  });

  it('should include user request at the end', () => {
    const context: ConversationContext = {
      recentMessages: [],
    };

    const result = buildConversationPrompt('Make heading larger', context);

    expect(result).toContain('=== USER REQUEST ===');
    expect(result).toContain('Make heading larger');
    expect(result.endsWith('Make heading larger')).toBe(true);
  });
});

describe('getChatSystemPrompt', () => {
  it('should append chat extension to base prompt', () => {
    const basePrompt = 'You are an expert Shopify developer.';
    const result = getChatSystemPrompt(basePrompt);

    expect(result).toContain(basePrompt);
    expect(result).toContain('=== CONVERSATION MODE ===');
    expect(result).toContain('RULES:');
    expect(result.length).toBeGreaterThan(basePrompt.length);
  });

  it('should include marker-based output instructions', () => {
    const result = getChatSystemPrompt('Base');

    expect(result).toContain('===START LIQUID===');
    expect(result).toContain('===END LIQUID===');
    expect(result).toContain('COMPLETE updated section');
  });
});

describe('summarizeOldMessages', () => {
  it('should return empty string for empty messages', () => {
    expect(summarizeOldMessages([])).toBe('');
  });

  it('should detect color-related topics', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'Change the color to blue' },
      { role: 'assistant', content: 'Done' },
    ];

    const result = summarizeOldMessages(messages);

    expect(result).toContain('color changes');
  });

  it('should detect button-related topics', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'Add a button at the bottom' },
      { role: 'assistant', content: 'Added' },
    ];

    const result = summarizeOldMessages(messages);

    expect(result).toContain('button modifications');
  });

  it('should detect multiple topics', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'Change the heading font' },
      { role: 'user', content: 'Add more spacing between elements' },
      { role: 'user', content: 'Make it responsive' },
    ];

    const result = summarizeOldMessages(messages);

    expect(result).toContain('heading styling');
    expect(result).toContain('spacing adjustments');
    expect(result).toContain('responsive design');
  });

  it('should count user messages', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'First request' },
      { role: 'assistant', content: 'Response 1' },
      { role: 'user', content: 'Second request' },
      { role: 'assistant', content: 'Response 2' },
      { role: 'user', content: 'Third request' },
    ];

    const result = summarizeOldMessages(messages);

    expect(result).toContain('3 refinement requests made');
  });

  it('should detect background and padding topics', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'Change the background' },
      { role: 'user', content: 'Add more padding' },
      { role: 'user', content: 'Adjust the margin' },
    ];

    const result = summarizeOldMessages(messages);

    expect(result).toContain('background styling');
    expect(result).toContain('padding adjustments');
    expect(result).toContain('margin changes');
  });
});
