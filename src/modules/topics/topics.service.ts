import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { DiscussionGateway } from '../discussion/discussion.gateway';
import { GroupsService } from '../groups/groups.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Topic } from './schemas/topic.schema';

@Injectable()
export class TopicsService {
  constructor(
    @InjectModel(Topic.name) private readonly topicModel: Model<Topic>,
    private readonly groupsService: GroupsService,
    private readonly gateway: DiscussionGateway,
  ) {}

  async create(dto: CreateTopicDto) {
    const isLeader = await this.groupsService.isLeader(dto.groupId, dto.leaderId);
    if (!isLeader) {
      throw new BadRequestException('Only the group leader can create topics.');
    }

    return this.topicModel.create({
      ...dto,
      groupId: new Types.ObjectId(dto.groupId),
      leaderId: new Types.ObjectId(dto.leaderId),
      deadline: new Date(dto.deadline),
    });
  }

  async findAll(groupId?: string) {
    const topics = await this.topicModel.find({}).populate('leaderId groupId').sort({ deadline: 1 }).lean();
    if (!groupId) {
      return topics;
    }

    return topics.filter((topic) => {
      const topicGroup = topic.groupId as unknown;
      if (topicGroup && typeof topicGroup === 'object' && '_id' in topicGroup) {
        return String((topicGroup as { _id: unknown })._id) === groupId;
      }
      return String(topicGroup) === groupId;
    });
  }

  async findById(id: string) {
    const topic = await this.topicModel.findById(id).populate('leaderId groupId').lean();
    if (!topic) {
      throw new NotFoundException('Topic not found.');
    }
    return topic;
  }

  async update(id: string, dto: UpdateTopicDto) {
    return this.topicModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        ...(dto.deadline ? { deadline: new Date(dto.deadline) } : {}),
      },
      { new: true },
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async markOverdueTopics() {
    const overdueTopics = await this.topicModel.find({
      deadline: { $lt: new Date() },
      status: { $ne: 'Closed' },
    });

    await Promise.all(
      overdueTopics.map(async (topic) => {
        topic.status = 'Overdue';
        await topic.save();
        this.gateway.emitTopicOverdue(topic.toObject());
      }),
    );
  }
}
