import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { CritiqueDto } from './dto/critique.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('critique')
  critique(@Body() dto: CritiqueDto) {
    return this.aiService.critique(dto.content, dto.template);
  }

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file'))
  transcribe(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Audio file is required.');
    }
    return this.aiService.transcribe(file);
  }
}
