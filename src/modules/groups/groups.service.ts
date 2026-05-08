import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateGroupDto } from './dto/create-group.dto';
import { Group } from './schemas/group.schema';

@Injectable()
export class GroupsService {
  constructor(@InjectModel(Group.name) private readonly groupModel: Model<Group>) {}

  async create(dto: CreateGroupDto) {
    const members = Array.from(new Set([dto.leaderId, ...dto.members]));
    return this.groupModel.create({
      name: dto.name,
      leaderId: new Types.ObjectId(dto.leaderId),
      members: members.map((id) => new Types.ObjectId(id)),
    });
  }

  async findAll() {
    return this.groupModel.find().populate('leaderId members').sort({ createdAt: -1 }).lean();
  }

  async isLeader(groupId: string, userId: string) {
    const group = await this.groupModel.findById(groupId).select('leaderId').lean();
    return group?.leaderId?.toString() === userId;
  }
}
