import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(dto: CreateUserDto) {
    return this.userModel.findOneAndUpdate(
      { email: dto.email.toLowerCase() },
      { $setOnInsert: dto },
      { new: true, upsert: true },
    );
  }

  async findAll() {
    return this.userModel.find().sort({ createdAt: -1 }).lean();
  }

  async findById(id: string) {
    return this.userModel.findById(id).lean();
  }
}
