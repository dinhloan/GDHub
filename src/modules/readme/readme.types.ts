export type MarkdownBlock =
  | {
      type: 'heading';
      depth: number;
      text: string;
    }
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'list';
      ordered: boolean;
      items: string[];
    }
  | {
      type: 'code';
      language: string;
      value: string;
    }
  | {
      type: 'blockquote';
      text: string;
    }
  | {
      type: 'horizontalRule';
    };

export interface MarkdownSection {
  title: string;
  depth: number;
  blocks: MarkdownBlock[];
}

export interface ReadmeMetadata {
  title: string;
  layout: string;
  theme: string;
  priority: string;
  timeline: string | null;
  template: string;
  stitchIntent: {
    source: 'stitch';
    projectUrl: string;
    layout: string;
    theme: string;
    priority: string;
    timeline: string | null;
    template: string;
  };
  frontmatter: Record<string, unknown>;
}

export interface ReadmePayload {
  metadata: ReadmeMetadata;
  content: {
    raw: string;
    blocks: MarkdownBlock[];
    sections: MarkdownSection[];
  };
}
