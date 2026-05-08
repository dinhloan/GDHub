import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MessageType } from '../../../shared/domain.types';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: { createdAt: 'timestamp', updatedAt: false } })
export class Message {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Entry', index: true })
  entryId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ required: true, enum: ['text', 'opinion', 'critique'], default: 'text' })
  type: MessageType;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
