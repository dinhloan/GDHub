import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TopicCategory, TopicStatus } from '../../../shared/domain.types';

export type TopicDocument = HydratedDocument<Topic>;

@Schema({ timestamps: true })
export class Topic {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Group', index: true })
  groupId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  leaderId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ required: true })
  deadline: Date;

  @Prop({ required: true, enum: ['Open', 'Overdue', 'Closed'], default: 'Open', index: true })
  status: TopicStatus;

  @Prop({ required: true, enum: ['Science', 'Tech', 'Life', 'Energy', 'Business', 'Other'], default: 'Other' })
  category: TopicCategory;
}

export const TopicSchema = SchemaFactory.createForClass(Topic);
