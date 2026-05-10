import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import matter = require('gray-matter');
import { Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { Entry } from './schemas/entry.schema';

const STITCH_PROJECT_URL = 'https://stitch.withgoogle.com/projects/7588991082477143008';
const DEFAULT_STITCH_METADATA = {
  title: 'Collaborative Knowledge Diary',
  layout: 'knowledge-diary-shell',
  theme: 'academic-amber-dark',
  priority: 'normal',
  timeline: null as string | null,
  template: 'stitch-academic-amber',
};

@Injectable()
export class EntriesService {
  constructor(
    @InjectModel(Entry.name) private readonly entryModel: Model<Entry>,
    private readonly aiService: AiService,
  ) {}

  async create(dto: CreateEntryDto) {
    const vectorEmbedding = await this.aiService.embed(dto.content);
    const aiCritic = dto.status === 'Debating' ? await this.createAiCritic(dto.content) : undefined;
    const entry = await this.entryModel.create({
      ...dto,
      topicId: new Types.ObjectId(dto.topicId),
      authorId: new Types.ObjectId(dto.authorId),
      vectorEmbedding,
      ...(aiCritic ? { aiCritic } : {}),
    });
    return this.enrichEntry(entry);
  }

  async findAll(topicId?: string) {
    const directEntries = await this.entryModel.find(topicId ? { topicId } : {}).populate('authorId topicId').sort({ updatedAt: -1 }).lean();
    if (!topicId || directEntries.length) {
      return directEntries.map((entry) => this.enrichEntry(entry));
    }

    const entries = await this.entryModel.find({}).populate('authorId topicId').sort({ updatedAt: -1 }).lean();
    return entries.filter((entry) => this.matchesRef(entry.topicId, topicId)).map((entry) => this.enrichEntry(entry));
  }

  async findById(id: string) {
    const entry = await this.entryModel.findById(id).populate('authorId topicId').lean();
    if (!entry) {
      throw new NotFoundException('Entry not found.');
    }
    return this.enrichEntry(entry);
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
    return this.enrichEntry(entry);
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

  private enrichEntry<T extends { content?: string }>(entry: T) {
    const plainEntry = this.toPlainObject(entry);
    if (!plainEntry.content) {
      return plainEntry;
    }

    const parsed = matter(plainEntry.content);
    const frontmatter = parsed.data ?? {};
    const content = parsed.content.trim();
    const layout = this.stringValue(frontmatter.layout, DEFAULT_STITCH_METADATA.layout);
    const theme = this.stringValue(frontmatter.theme, DEFAULT_STITCH_METADATA.theme);
    const priority = this.stringValue(frontmatter.priority, DEFAULT_STITCH_METADATA.priority);
    const timeline = this.nullableString(frontmatter.timeline);
    const template = this.stringValue(frontmatter.template, this.resolveTemplate(layout, theme));
    const title = this.stringValue(frontmatter.title, this.firstHeading(content) ?? DEFAULT_STITCH_METADATA.title);

    return {
      ...plainEntry,
      content,
      metadata: {
        title,
        layout,
        theme,
        priority,
        timeline,
        template,
        stitchIntent: {
          source: 'stitch',
          projectUrl: STITCH_PROJECT_URL,
          layout,
          theme,
          priority,
          timeline,
          template,
        },
        frontmatter,
      },
    };
  }

  private toPlainObject<T>(entry: T): T {
    if (entry && typeof entry === 'object' && 'toObject' in entry && typeof entry.toObject === 'function') {
      return entry.toObject();
    }
    return entry;
  }

  private resolveTemplate(layout: string, theme: string) {
    const normalizedLayout = layout.toLowerCase();
    const normalizedTheme = theme.toLowerCase();

    if (normalizedLayout.includes('timeline')) {
      return 'stitch-timeline';
    }
    if (normalizedLayout.includes('graph')) {
      return 'stitch-knowledge-graph';
    }
    if (normalizedTheme.includes('amber') || normalizedTheme.includes('academic')) {
      return 'stitch-academic-amber';
    }
    return 'stitch-default';
  }

  private firstHeading(markdown: string) {
    return markdown
      .split(/\r?\n/)
      .map((line) => line.match(/^#\s+(.+)$/)?.[1]?.trim())
      .find(Boolean);
  }

  private stringValue(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private nullableString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
