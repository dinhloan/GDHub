import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { Checklist } from './schemas/checklist.schema';

@Injectable()
export class ChecklistsService {
  constructor(@InjectModel(Checklist.name) private readonly checklistModel: Model<Checklist>) {}

  async create(dto: CreateChecklistDto) {
    if (dto.items.some((item) => !item.driUserId)) {
      throw new BadRequestException('Every checklist item must have exactly one DRI user.');
    }

    return this.checklistModel.create({
      topicId: new Types.ObjectId(dto.topicId),
      template: dto.template,
      items: dto.items.map((item) => ({
        ...item,
        driUserId: new Types.ObjectId(item.driUserId),
        status: item.status ?? 'Todo',
      })),
    });
  }

  async createFromTemplate(topicId: string, template: 'Apple DRI' | 'Google Design Sprint', driUserId: string) {
    const phases =
      template === 'Google Design Sprint'
        ? ['Understand', 'Sketch', 'Decide', 'Prototype', 'Test']
        : ['Define Owner', 'Plan', 'Execute', 'Review'];

    return this.create({
      topicId,
      template,
      items: phases.map((phase) => ({
        title: `${phase} checkpoint`,
        driUserId,
        phase,
        status: 'Todo',
      })),
    });
  }

  async findByTopic(topicId: string) {
    return this.checklistModel.find({ topicId }).populate('items.driUserId topicId').lean();
  }

  async updateItem(checklistId: string, itemId: string, dto: UpdateChecklistItemDto) {
    return this.checklistModel.findOneAndUpdate(
      { _id: checklistId, 'items._id': itemId },
      {
        $set: Object.fromEntries(
          Object.entries(dto).map(([key, value]) => [`items.$.${key}`, value]),
        ),
      },
      { new: true },
    );
  }
}
