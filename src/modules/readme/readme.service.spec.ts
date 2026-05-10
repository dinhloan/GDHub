import { ReadmeService } from './readme.service';

describe('ReadmeService', () => {
  const service = new ReadmeService();

  it('extracts Stitch frontmatter into metadata', () => {
    const result = service.parseReadme(`---
layout: timeline-board
theme: academic-amber
priority: high
timeline: Q2 research sprint
---
# Discussion Brief

Team notes.
`);

    expect(result.metadata).toEqual(
      expect.objectContaining({
        title: 'Discussion Brief',
        layout: 'timeline-board',
        theme: 'academic-amber',
        priority: 'high',
        timeline: 'Q2 research sprint',
        template: 'stitch-timeline',
      }),
    );
    expect(result.metadata.stitchIntent).toEqual(expect.objectContaining({ source: 'stitch' }));
  });

  it('converts markdown into blocks and sections for the frontend', () => {
    const result = service.parseReadme(`# GDHub

Intro paragraph with **bold** text.

## Run

- Install dependencies
- Start dev server

\`\`\`bash
npm run start:dev
\`\`\`
`);

    expect(result.content.blocks).toEqual(
      expect.arrayContaining([
        { type: 'heading', depth: 1, text: 'GDHub' },
        { type: 'paragraph', text: 'Intro paragraph with bold text.' },
        { type: 'heading', depth: 2, text: 'Run' },
        { type: 'list', ordered: false, items: ['Install dependencies', 'Start dev server'] },
        { type: 'code', language: 'bash', value: 'npm run start:dev' },
      ]),
    );
    expect(result.content.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'GDHub' }),
        expect.objectContaining({ title: 'Run' }),
      ]),
    );
  });
});
