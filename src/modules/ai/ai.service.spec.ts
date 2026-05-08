import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  function createService() {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    return new AiService(config);
  }

  it('creates deterministic local embeddings when OpenAI is not configured', async () => {
    const service = createService();

    const first = await service.embed('same note');
    const second = await service.embed('same note');

    expect(first).toEqual(second);
    expect(first).toHaveLength(64);
  });

  it('returns local critique questions without API key', async () => {
    const service = createService();

    const result = await service.critique('This entry needs a critical review from multiple angles.', '5W1H');

    expect(result.source).toBe('local');
    expect(result.questions).toHaveLength(4);
    expect(result.questions[0]).toContain('Khoa học');
  });
});
