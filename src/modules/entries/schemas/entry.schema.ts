import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EntryStatus, MediaType } from '../../../shared/domain.types';

export type EntryDocument = HydratedDocument<Entry>;

@Schema({ _id: false })
export class EntryMedia {
  @Prop({ required: true, enum: ['image', 'video', 'audio', 'file'] })
  type: MediaType;

  @Prop({ required: true })
  url: string;
}

export const EntryMediaSchema = SchemaFactory.createForClass(EntryMedia);

@Schema({ _id: false })
export class EntryTag {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: false })
  isPrivate: boolean;
}

export const EntryTagSchema = SchemaFactory.createForClass(EntryTag);

@Schema({ timestamps: true })
export class Entry {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Topic', index: true })
  topicId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  authorId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: [], type: [EntryMediaSchema] })
  media: EntryMedia[];

  @Prop({ default: [], type: [EntryTagSchema], index: true })
  tags: EntryTag[];

  @Prop({ required: true, enum: ['Draft', 'Debating', 'Final'], default: 'Draft', index: true })
  status: EntryStatus;

  @Prop({ default: [] })
  vectorEmbedding: number[];
}

export const EntrySchema = SchemaFactory.createForClass(Entry);
