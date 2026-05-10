import { EntriesService } from './entries.service';

describe('EntriesService', () => {
  const topicId = '6650f7e0f2a2b55f7f4a1001';
  const authorId = '6650f7e0f2a2b55f7f4a2001';

  function createFindChain(result: unknown[]) {
    return {
      populate: jest.fn(() => ({
        sort: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue(result),
        })),
        lean: jest.fn().mockResolvedValue(result),
      })),
      lean: jest.fn().mockResolvedValue(result),
    };
  }

  function createService(entries: unknown[] = []) {
    const entryModel = {
      create: jest.fn((payload) => Promise.resolve({ _id: 'entry-1', ...payload })),
      find: jest.fn(() => createFindChain(entries)),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    const aiService = {
      embed: jest.fn().mockResolvedValue([1, 0, 0]),
      challengeQuestions: jest.fn().mockResolvedValue({
        questions: ['Question 1', 'Question 2', 'Question 3'],
        source: 'llm',
        model: 'gpt-test',
      }),
    };

    return {
      service: new EntriesService(entryModel as never, aiService as never),
      entryModel,
      aiService,
    };
  }

  it('creates an entry with generated embedding', async () => {
    const { service, entryModel, aiService } = createService();

    await service.create({
      topicId,
      authorId,
      content: 'Knowledge graph note',
      status: 'Debating',
      tags: [{ name: 'graph', isPrivate: false }],
      media: [],
    });

    expect(aiService.embed).toHaveBeenCalledWith('Knowledge graph note');
    expect(entryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Knowledge graph note',
        vectorEmbedding: [1, 0, 0],
        aiCritic: expect.objectContaining({
          questions: ['Question 1', 'Question 2', 'Question 3'],
          source: 'llm',
        }),
      }),
    );
  });

  it('generates AI critic questions when an entry moves to Debating', async () => {
    const { service, entryModel, aiService } = createService();
    entryModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'entry-1',
        content: 'Draft thesis',
        status: 'Draft',
      }),
    });
    entryModel.findByIdAndUpdate.mockResolvedValue({ _id: 'entry-1', status: 'Debating' });

    await service.update('entry-1', { status: 'Debating' });

    expect(aiService.challengeQuestions).toHaveBeenCalledWith('Draft thesis');
    expect(entryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({
        status: 'Debating',
        aiCritic: expect.objectContaining({
          questions: ['Question 1', 'Question 2', 'Question 3'],
          model: 'gpt-test',
        }),
      }),
      { new: true },
    );
  });

  it('sorts semantic search results by cosine similarity and limits to top five', async () => {
    const entries = [
      { _id: 'low', vectorEmbedding: [0, 1, 0], content: 'low' },
      { _id: 'high', vectorEmbedding: [1, 0, 0], content: 'high' },
      { _id: 'mid', vectorEmbedding: [0.5, 0.5, 0], content: 'mid' },
      { _id: 'four', vectorEmbedding: [0.4, 0.6, 0], content: 'four' },
      { _id: 'five', vectorEmbedding: [0.3, 0.7, 0], content: 'five' },
      { _id: 'six', vectorEmbedding: [0.2, 0.8, 0], content: 'six' },
    ];
    const { service } = createService(entries);

    const result = await service.semanticSearch('graph', topicId);

    expect(result).toHaveLength(5);
    expect(result[0]._id).toBe('high');
    expect(result[0].similarity).toBeCloseTo(1);
  });

  it('builds graph edges for topic ownership and shared public tags', async () => {
    const entries = [
      {
        _id: { toString: () => 'entry-a' },
        content: 'Alpha entry',
        status: 'Draft',
        tags: [{ name: 'shared', isPrivate: false }],
      },
      {
        _id: { toString: () => 'entry-b' },
        content: 'Beta entry',
        status: 'Final',
        tags: [{ name: 'shared', isPrivate: false }],
      },
    ];
    const { service } = createService(entries);

    const graph = await service.graph(topicId);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: topicId, target: 'entry-a', label: 'belongs to' }),
        expect.objectContaining({ source: 'entry-a', target: 'entry-b', label: 'shared tag' }),
      ]),
    );
  });
});
