import { BadRequestException } from '@nestjs/common';
import { TopicsService } from './topics.service';

describe('TopicsService', () => {
  const groupId = '6650f7e0f2a2b55f7f4a1001';
  const leaderId = '6650f7e0f2a2b55f7f4a2001';

  function createService(isLeader = true) {
    const topicModel = {
      create: jest.fn((payload) => Promise.resolve({ _id: 'topic-1', ...payload })),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    const groupsService = {
      isLeader: jest.fn().mockResolvedValue(isLeader),
    };
    const gateway = {
      emitTopicOverdue: jest.fn(),
    };

    return {
      service: new TopicsService(topicModel as never, groupsService as never, gateway as never),
      topicModel,
      groupsService,
      gateway,
    };
  }

  it('rejects topic creation from non-leaders', async () => {
    const { service } = createService(false);

    await expect(
      service.create({
        groupId,
        leaderId,
        title: 'Unauthorized topic',
        description: '',
        deadline: new Date().toISOString(),
        category: 'Tech',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a topic when the requester is group leader', async () => {
    const { service, topicModel, groupsService } = createService(true);

    await service.create({
      groupId,
      leaderId,
      title: 'Leader topic',
      description: 'Valid topic',
      deadline: '2026-05-20T00:00:00.000Z',
      category: 'Science',
    });

    expect(groupsService.isLeader).toHaveBeenCalledWith(groupId, leaderId);
    expect(topicModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Leader topic',
        category: 'Science',
      }),
    );
  });

  it('marks overdue open topics and emits realtime notifications', async () => {
    const { service, topicModel, gateway } = createService(true);
    const save = jest.fn().mockResolvedValue(undefined);
    const overdueTopic = {
      status: 'Open',
      save,
      toObject: () => ({ _id: 'topic-overdue', status: 'Overdue' }),
    };
    topicModel.find.mockResolvedValue([overdueTopic]);

    await service.markOverdueTopics();

    expect(topicModel.find).toHaveBeenCalledWith({
      deadline: { $lt: expect.any(Date) },
      status: { $ne: 'Closed' },
    });
    expect(overdueTopic.status).toBe('Overdue');
    expect(save).toHaveBeenCalled();
    expect(gateway.emitTopicOverdue).toHaveBeenCalledWith({ _id: 'topic-overdue', status: 'Overdue' });
  });
});
