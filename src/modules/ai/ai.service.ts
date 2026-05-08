import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

@Injectable()
export class AiService {
  private readonly openai?: OpenAI;
  private readonly embeddings?: OpenAIEmbeddings;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.embeddings = new OpenAIEmbeddings({
        apiKey,
        model: 'text-embedding-3-small',
      });
    }
  }

  async embed(text: string) {
    if (!this.embeddings) {
      return this.localEmbedding(text);
    }

    return this.embeddings.embedQuery(text);
  }

  async critique(content: string, template: '6 Thinking Hats' | '5W1H') {
    if (!this.openai) {
      return this.localCritique(content, template);
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
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
      source: 'openai',
    };
  }

  async transcribe(file: Express.Multer.File) {
    if (!this.openai) {
      return {
        text: `Transcription placeholder for ${file.originalname}. Configure OPENAI_API_KEY to use Whisper.`,
        source: 'local',
      };
    }

    const audio = await toFile(file.buffer, file.originalname, { type: file.mimetype });
    const transcription = await this.openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
    });

    return {
      text: transcription.text,
      source: 'openai-whisper',
    };
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
    const excerpt = content.slice(0, 160);
    return {
      template,
      source: 'local',
      questions: [
        `Khoa học: Giả định nào trong "${excerpt}" cần kiểm chứng bằng bằng chứng?`,
        'Công nghệ: Có giải pháp kỹ thuật nào đơn giản hơn nhưng vẫn đạt mục tiêu không?',
        'Năng lượng: Chi phí vận hành, tài nguyên và tác động môi trường đã được tính chưa?',
        'Đời sống: Người dùng hoặc nhóm học tập sẽ gặp trở ngại thực tế nào khi áp dụng?',
      ],
    };
  }
}
