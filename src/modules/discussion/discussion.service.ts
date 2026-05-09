import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateMessageDto } from './dto/create-message.dto';
import { DiscussionGateway } from './discussion.gateway';
import { Message } from './schemas/message.schema';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly gateway: DiscussionGateway,
  ) {}

  async create(dto: CreateMessageDto) {
    const message = await this.messageModel.create({
      ...dto,
      entryId: new Types.ObjectId(dto.entryId),
      userId: new Types.ObjectId(dto.userId),
    });
    const populated = await message.populate('userId');
    this.gateway.emitMessage(dto.entryId, populated.toObject());
    return populated;
  }

  async findByEntry(entryId: string) {
    const messages = await this.messageModel
      .find({ entryId: new Types.ObjectId(entryId) })
      .populate('userId')
      .sort({ timestamp: 1 })
      .lean();
    if (messages.length) {
      return messages;
    }

    return this.messageModel.find({ entryId }).populate('userId').sort({ timestamp: 1 }).lean();
  }
}
