import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter = require('gray-matter');
import { MarkdownBlock, MarkdownSection, ReadmePayload } from './readme.types';

const STITCH_PROJECT_URL = 'https://stitch.withgoogle.com/projects/7588991082477143008';

@Injectable()
export class ReadmeService {
  private readonly readmePath = join(process.cwd(), 'README.md');

  async getReadme(): Promise<ReadmePayload> {
    const markdown = await readFile(this.readmePath, 'utf8');
    return this.parseReadme(markdown);
  }

  parseReadme(markdown: string): ReadmePayload {
    const parsed = matter(markdown);
    const frontmatter = parsed.data as Record<string, unknown>;
    const blocks = this.parseBlocks(parsed.content);
    const sections = this.buildSections(blocks);
    const title = this.firstHeading(blocks) ?? this.stringValue(frontmatter.title, 'README');
    const layout = this.stringValue(frontmatter.layout, 'knowledge-diary-shell');
    const theme = this.stringValue(frontmatter.theme, 'academic-amber-dark');
    const priority = this.stringValue(frontmatter.priority, 'normal');
    const timeline = this.nullableString(frontmatter.timeline);
    const template = this.stringValue(frontmatter.template, this.resolveTemplate(layout, theme));

    return {
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
      content: {
        raw: parsed.content.trim(),
        blocks,
        sections,
      },
    };
  }

  private parseBlocks(markdown: string): MarkdownBlock[] {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: MarkdownBlock[] = [];
    let paragraph: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    let quote: string[] = [];
    let code: { language: string; lines: string[] } | null = null;

    const flushParagraph = () => {
      if (paragraph.length) {
        blocks.push({ type: 'paragraph', text: this.cleanInlineMarkdown(paragraph.join(' ')) });
        paragraph = [];
      }
    };

    const flushList = () => {
      if (list) {
        blocks.push({ type: 'list', ordered: list.ordered, items: list.items });
        list = null;
      }
    };

    const flushQuote = () => {
      if (quote.length) {
        blocks.push({ type: 'blockquote', text: quote.join(' ').trim() });
        quote = [];
      }
    };

    const flushTextBlocks = () => {
      flushParagraph();
      flushList();
      flushQuote();
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const fenceMatch = trimmed.match(/^```([A-Za-z0-9_-]*)\s*$/);

      if (code) {
        if (fenceMatch) {
          blocks.push({ type: 'code', language: code.language, value: code.lines.join('\n') });
          code = null;
        } else {
          code.lines.push(line);
        }
        continue;
      }

      if (fenceMatch) {
        flushTextBlocks();
        code = { language: fenceMatch[1] ?? '', lines: [] };
        continue;
      }

      if (!trimmed) {
        flushTextBlocks();
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        flushTextBlocks();
        blocks.push({ type: 'horizontalRule' });
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushTextBlocks();
        blocks.push({
          type: 'heading',
          depth: headingMatch[1].length,
          text: this.cleanInlineMarkdown(headingMatch[2]),
        });
        continue;
      }

      const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
      const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      const listMatch = unorderedMatch ?? orderedMatch;
      if (listMatch) {
        flushParagraph();
        flushQuote();
        const ordered = Boolean(orderedMatch);
        if (!list || list.ordered !== ordered) {
          flushList();
          list = { ordered, items: [] };
        }
        list.items.push(this.cleanInlineMarkdown(listMatch[1]));
        continue;
      }

      const quoteMatch = trimmed.match(/^>\s?(.+)$/);
      if (quoteMatch) {
        flushParagraph();
        flushList();
        quote.push(this.cleanInlineMarkdown(quoteMatch[1]));
        continue;
      }

      flushList();
      flushQuote();
      paragraph.push(trimmed);
    }

    if (code) {
      blocks.push({ type: 'code', language: code.language, value: code.lines.join('\n') });
    }
    flushTextBlocks();

    return blocks;
  }

  private buildSections(blocks: MarkdownBlock[]): MarkdownSection[] {
    const sections: MarkdownSection[] = [];
    let current: MarkdownSection | null = null;

    for (const block of blocks) {
      if (block.type === 'heading') {
        current = { title: block.text, depth: block.depth, blocks: [] };
        sections.push(current);
        continue;
      }

      if (!current) {
        current = { title: 'Overview', depth: 1, blocks: [] };
        sections.push(current);
      }
      current.blocks.push(block);
    }

    return sections;
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

  private firstHeading(blocks: MarkdownBlock[]) {
    return blocks.find((block): block is Extract<MarkdownBlock, { type: 'heading' }> => block.type === 'heading')?.text;
  }

  private stringValue(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private nullableString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private cleanInlineMarkdown(value: string) {
    return value
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  }
}
