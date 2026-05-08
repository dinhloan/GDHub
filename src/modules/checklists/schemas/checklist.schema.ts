import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ChecklistStatus, ChecklistTemplate } from '../../../shared/domain.types';

export type ChecklistDocument = HydratedDocument<Checklist>;

@Schema({ _id: true, timestamps: true })
export class ChecklistItem {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  driUserId: Types.ObjectId;

  @Prop({ required: true, enum: ['Todo', 'Doing', 'Review', 'Done'], default: 'Todo' })
  status: ChecklistStatus;

  @Prop({ default: '' })
  phase: string;
}

export const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItem);

@Schema({ timestamps: true })
export class Checklist {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Topic', index: true })
  topicId: Types.ObjectId;

  @Prop({ required: true, enum: ['Apple DRI', 'Google Design Sprint', 'Custom'], default: 'Custom' })
  template: ChecklistTemplate;

  @Prop({ default: [], type: [ChecklistItemSchema] })
  items: ChecklistItem[];
}

export const ChecklistSchema = SchemaFactory.createForClass(Checklist);
