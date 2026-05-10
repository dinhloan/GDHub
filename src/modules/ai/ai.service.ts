import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai?: OpenAI;
  private readonly embeddings?: OpenAIEmbeddings;
  private readonly chatModel: string;
  private readonly transcriptionModel: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY') || this.config.get<string>('AI_API_KEY');
    const baseURL = this.config.get<string>('OPENAI_BASE_URL') || undefined;
    this.chatModel = this.config.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini';
    this.transcriptionModel = this.config.get<string>('OPENAI_TRANSCRIPTION_MODEL') ?? 'whisper-1';

    if (apiKey) {
      this.openai = new OpenAI({ apiKey, baseURL });
      this.embeddings = new OpenAIEmbeddings({
        apiKey,
        model: this.config.get<string>('OPENAI_EMBEDDING_MODEL') ?? 'text-embedding-3-small',
      });
    }
  }

  async embed(text: string) {
    if (!this.embeddings) {
      return this.localEmbedding(text);
    }

    try {
      return await this.embeddings.embedQuery(text);
    } catch (error) {
      this.logger.warn(`Embedding provider failed, using local embedding: ${this.errorMessage(error)}`);
      return this.localEmbedding(text);
    }
  }

  async critique(content: string, template: '6 Thinking Hats' | '5W1H') {
    if (!this.openai) {
      return this.localCritique(content, template);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content:
              'Bạn là AI critic cho nhóm học tập. Trả lời tiếng Việt, ngắn gọn, tập trung vào câu hỏi phản biện có thể thảo luận.',
          },
          {
            role: 'user',
            content: `Phân tích entry sau theo template ${template}. Đóng vai chuyên gia ở 4 lĩnh vực: Khoa học, Công nghệ, Năng lượng, Đời sống.\n\n${content}`,
          },
        ],
      });

      return {
        template,
        questions: response.choices[0].message.content?.split('\n').filter(Boolean) ?? [],
        source: 'llm',
      };
    } catch (error) {
      this.logger.warn(`Critique provider failed, using local critic: ${this.errorMessage(error)}`);
      return this.localCritique(content, template);
    }
  }

  async challengeQuestions(content: string) {
    const systemPrompt =
      'Bạn là chuyên gia phản biện. Hãy dựa vào 4 lĩnh vực: Khoa học, Công nghệ, Năng lượng, Đời sống để đặt ra 3 câu hỏi thách thức cho nội dung sau...';

    if (!this.openai) {
      return this.localChallengeQuestions(content);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content,
          },
        ],
      });

      return {
        questions: this.toQuestionList(response.choices[0].message.content ?? ''),
        source: 'llm',
        model: this.chatModel,
      };
    } catch (error) {
      this.logger.warn(`AI critic failed, using local challenge questions: ${this.errorMessage(error)}`);
      return this.localChallengeQuestions(content);
    }
  }

  async transcribe(file: Express.Multer.File) {
    if (!this.openai) {
      return this.localTranscription(file);
    }

    try {
      const audio = await toFile(file.buffer, file.originalname, { type: file.mimetype });
      const transcription = await this.openai.audio.transcriptions.create({
        file: audio,
        model: this.transcriptionModel,
      });

      return {
        text: transcription.text,
        source: 'llm-transcription',
      };
    } catch (error) {
      this.logger.warn(`Transcription provider failed, using local response: ${this.errorMessage(error)}`);
      return this.localTranscription(file);
    }
  }

  private localEmbedding(text: string) {
    const vector = new Array(64).fill(0);
    for (const [index, char] of Array.from(text.toLowerCase()).entries()) {
      vector[(char.charCodeAt(0) + index) % vector.length] += 1;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }

  private localCritique(content: string, template: '6 Thinking Hats' | '5W1H') {
    const excerpt = content.trim().replace(/\s+/g, ' ').slice(0, 160) || 'nội dung này';
    return {
      template,
      source: 'local',
      questions: [
        `Khoa học: Giả định nào trong "${excerpt}" cần được kiểm chứng bằng bằng chứng cụ thể?`,
        'Công nghệ: Có cách triển khai nào đơn giản hơn nhưng vẫn đạt cùng mục tiêu không?',
        'Năng lượng: Chi phí vận hành, tài nguyên và tác động dài hạn đã được tính đủ chưa?',
        'Đời sống: Người dùng hoặc nhóm học tập sẽ gặp trở ngại thực tế nào khi áp dụng?',
      ],
    };
  }

  private localChallengeQuestions(content: string) {
    const excerpt = content.trim().replace(/\s+/g, ' ').slice(0, 180) || 'nội dung này';
    return {
      source: 'local',
      model: 'local-critic',
      questions: [
        `Khoa học: Giả định quan trọng nhất trong "${excerpt}" có thể được kiểm chứng bằng dữ liệu nào?`,
        'Công nghệ và năng lượng: Giải pháp này có điểm nghẽn kỹ thuật hoặc chi phí vận hành nào dễ bị đánh giá thấp?',
        'Đời sống: Khi áp dụng vào thực tế, nhóm người dùng nào có thể bị ảnh hưởng ngoài dự tính và vì sao?',
      ],
    };
  }

  private toQuestionList(text: string) {
    const questions = text
      .split('\n')
      .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return questions.length ? questions : this.localChallengeQuestions(text).questions;
  }

  private localTranscription(file: Express.Multer.File) {
    return {
      text:
        `Chưa cấu hình dịch vụ chuyển giọng nói thành văn bản cho file "${file.originalname}". ` +
        'Có thể dùng OPENAI_API_KEY hoặc OPENAI_BASE_URL trỏ tới dịch vụ OpenAI-compatible để bật transcription trên backend.',
      source: 'local',
    };
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
