import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { Entry } from './schemas/entry.schema';

@Injectable()
export class EntriesService {
  constructor(
    @InjectModel(Entry.name) private readonly entryModel: Model<Entry>,
    private readonly aiService: AiService,
  ) {}

  async create(dto: CreateEntryDto) {
    const vectorEmbedding = await this.aiService.embed(dto.content);
    const aiCritic = dto.status === 'Debating' ? await this.createAiCritic(dto.content) : undefined;
    return this.entryModel.create({
      ...dto,
      topicId: new Types.ObjectId(dto.topicId),
      authorId: new Types.ObjectId(dto.authorId),
      vectorEmbedding,
      ...(aiCritic ? { aiCritic } : {}),
    });
  }

  async findAll(topicId?: string) {
    const directEntries = await this.entryModel.find(topicId ? { topicId } : {}).populate('authorId topicId').sort({ updatedAt: -1 }).lean();
    if (!topicId || directEntries.length) {
      return directEntries;
    }

    const entries = await this.entryModel.find({}).populate('authorId topicId').sort({ updatedAt: -1 }).lean();
    return entries.filter((entry) => this.matchesRef(entry.topicId, topicId));
  }

  async findById(id: string) {
    const entry = await this.entryModel.findById(id).populate('authorId topicId').lean();
    if (!entry) {
      throw new NotFoundException('Entry not found.');
    }
    return entry;
  }

  async update(id: string, dto: UpdateEntryDto) {
    const existing = await this.entryModel.findById(id).lean();
    if (!existing) {
      throw new NotFoundException('Entry not found.');
    }

    const vectorEmbedding = dto.content ? await this.aiService.embed(dto.content) : undefined;
    const nextContent = dto.content ?? existing.content;
    const isMovingToDebating = dto.status === 'Debating' && existing.status !== 'Debating';
    const aiCritic = isMovingToDebating ? await this.createAiCritic(nextContent) : undefined;
    const entry = await this.entryModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        ...(dto.topicId ? { topicId: new Types.ObjectId(dto.topicId) } : {}),
        ...(dto.authorId ? { authorId: new Types.ObjectId(dto.authorId) } : {}),
        ...(vectorEmbedding ? { vectorEmbedding } : {}),
        ...(aiCritic ? { aiCritic } : {}),
      },
      { new: true },
    );
    if (!entry) {
      throw new NotFoundException('Entry not found.');
    }
    return entry;
  }

  async remove(id: string) {
    const entry = await this.entryModel.findByIdAndDelete(id).lean();
    if (!entry) {
      throw new NotFoundException('Entry not found.');
    }
    return { deleted: true, id };
  }

  async semanticSearch(query: string, topicId?: string) {
    const queryVector = await this.aiService.embed(query);
    const entries = await this.findAll(topicId);

    return entries
      .map((entry) => ({
        ...entry,
        similarity: this.cosineSimilarity(queryVector, entry.vectorEmbedding ?? []),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }

  async graph(topicId: string) {
    let entries = await this.entryModel.find({ topicId }).lean();
    if (!entries.length) {
      entries = (await this.entryModel.find({}).lean()).filter((entry) => this.matchesRef(entry.topicId, topicId));
    }
    const nodes = [
      { id: topicId, type: 'topic', label: 'Topic' },
      ...entries.map((entry) => ({
        id: entry._id.toString(),
        type: 'entry',
        label: entry.content.slice(0, 48),
        status: entry.status,
        tags: entry.tags,
      })),
    ];
    const edges = entries.flatMap((entry) => [
      { id: `${topicId}-${entry._id}`, source: topicId, target: entry._id.toString(), label: 'belongs to' },
      ...entries
        .filter((candidate) => candidate._id.toString() !== entry._id.toString())
        .filter((candidate) => this.hasSharedPublicTag(entry.tags ?? [], candidate.tags ?? []))
        .map((candidate) => ({
          id: `${entry._id}-${candidate._id}`,
          source: entry._id.toString(),
          target: candidate._id.toString(),
          label: 'shared tag',
        })),
    ]);

    return { nodes, edges };
  }

  private cosineSimilarity(left: number[], right: number[]) {
    if (!left.length || !right.length || left.length !== right.length) {
      return 0;
    }

    const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
    const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
    const rightMagnitude = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
    return dot / ((leftMagnitude || 1) * (rightMagnitude || 1));
  }

  private hasSharedPublicTag(left: { name: string; isPrivate: boolean }[], right: { name: string; isPrivate: boolean }[]) {
    const rightTags = new Set(right.filter((tag) => !tag.isPrivate).map((tag) => tag.name.toLowerCase()));
    return left.some((tag) => !tag.isPrivate && rightTags.has(tag.name.toLowerCase()));
  }

  private matchesRef(value: unknown, id: string) {
    if (value && typeof value === 'object' && '_id' in value) {
      return String((value as { _id: unknown })._id) === id;
    }
    return String(value) === id;
  }

  private async createAiCritic(content: string) {
    const result = await this.aiService.challengeQuestions(content);
    return {
      ...result,
      generatedAt: new Date(),
    };
  }
}
