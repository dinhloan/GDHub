import { BadRequestException } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';

describe('ChecklistsService', () => {
  const topicId = '6650f7e0f2a2b55f7f4a1001';
  const userId = '6650f7e0f2a2b55f7f4a2001';

  function createService() {
    const model = {
      create: jest.fn((payload) => Promise.resolve({ _id: 'checklist-1', ...payload })),
      find: jest.fn(() => ({
        populate: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue([{ _id: 'checklist-1' }]),
        })),
      })),
      findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'checklist-1' }),
    };

    return {
      service: new ChecklistsService(model as never),
      model,
    };
  }

  it('requires a DRI user on every item', async () => {
    const { service } = createService();

    await expect(
      service.create({
        topicId,
        template: 'Apple DRI',
        items: [{ title: 'Owner checkpoint', driUserId: '', status: 'Todo' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates Google Design Sprint checklist phases', async () => {
    const { service, model } = createService();

    await service.createFromTemplate(topicId, 'Google Design Sprint', userId);

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'Google Design Sprint',
        items: expect.arrayContaining([
          expect.objectContaining({ phase: 'Understand', status: 'Todo' }),
          expect.objectContaining({ phase: 'Test', status: 'Todo' }),
        ]),
      }),
    );
  });

  it('updates an item with positional $set fields', async () => {
    const { service, model } = createService();

    await service.updateItem('checklist-1', 'item-1', { status: 'Review', phase: 'Decide' });

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'checklist-1', 'items._id': 'item-1' },
      { $set: { 'items.$.status': 'Review', 'items.$.phase': 'Decide' } },
      { new: true },
    );
  });
});
