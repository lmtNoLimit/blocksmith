// @jest-environment node
import { AIService, SYSTEM_PROMPT } from '../ai.server';

// Mock GoogleGenerativeAI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => '{% schema %}{"name":"Test"}{% endschema %}',
          candidates: [{ finishReason: 'STOP' }],
        },
      }),
      generateContentStream: jest.fn().mockReturnValue({
        stream: (async function* () {
          yield { text: () => 'chunk1' };
          yield { text: () => 'chunk2' };
        })(),
        response: Promise.resolve({
          candidates: [{ finishReason: 'STOP' }],
        }),
      }),
    }),
  })),
}));

describe('AIService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('SYSTEM_PROMPT', () => {
    it('exports SYSTEM_PROMPT constant', () => {
      expect(SYSTEM_PROMPT).toBeDefined();
      expect(SYSTEM_PROMPT).toContain('Shopify Liquid code generator');
    });
  });

  describe('generateSection', () => {
    it('returns mock section when no API key', async () => {
      const service = new AIService();
      const result = await service.generateSection('test prompt');

      expect(result).toContain('{% schema %}');
      expect(result).toContain('AI Generated Section');
    });

    it('includes prompt in mock response', async () => {
      const service = new AIService();
      const result = await service.generateSection('hero banner');

      expect(result).toContain('hero banner');
    });
  });

  describe('generateSectionStream', () => {
    it('yields mock chunks when no API key', async () => {
      const service = new AIService();
      const chunks: string[] = [];

      for await (const chunk of service.generateSectionStream('test')) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('{% schema %}');
    });
  });

  describe('getMockSection', () => {
    it('generates valid Liquid section structure', () => {
      const service = new AIService();
      const mock = service.getMockSection('test');

      expect(mock).toContain('{% schema %}');
      expect(mock).toContain('{% endschema %}');
      expect(mock).toContain('{% style %}');
      expect(mock).toContain('{% endstyle %}');
      expect(mock).toContain('presets');
    });
  });

  describe('enhancePrompt', () => {
    it('returns enhanced prompt with variations when no API key', async () => {
      const service = new AIService();
      const result = await service.enhancePrompt('hero section');

      expect(result.enhanced).toBeDefined();
      expect(result.enhanced).toContain('hero section');
      expect(result.variations).toHaveLength(3);
    });

    it('includes context in enhancement', async () => {
      const service = new AIService();
      const result = await service.enhancePrompt('banner', {
        sectionType: 'hero',
        themeStyle: 'modern',
      });

      expect(result.enhanced).toContain('hero');
    });
  });
});
