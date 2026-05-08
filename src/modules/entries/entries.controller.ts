import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntriesService } from './entries.service';

const uploadDirectory = 'uploads';

const imageStorage = diskStorage({
  destination: (_request, _file, callback) => {
    if (!existsSync(uploadDirectory)) {
      mkdirSync(uploadDirectory, { recursive: true });
    }
    callback(null, uploadDirectory);
  },
  filename: (_request, file, callback) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `entry-${suffix}${extname(file.originalname)}`);
  },
});

@Controller('entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  create(@Body() dto: CreateEntryDto) {
    return this.entriesService.create(dto);
  }

  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: imageStorage,
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        callback(null, file.mimetype.startsWith('image/'));
      },
    }),
  )
  uploadMedia(@UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    if (!file) {
      throw new BadRequestException('Only image files are supported.');
    }

    const baseUrl = `${request.protocol}://${request.get('host')}`;
    return {
      type: 'image',
      url: `${baseUrl}/uploads/${file.filename}`,
    };
  }

  @Get()
  findAll(@Query('topicId') topicId?: string) {
    return this.entriesService.findAll(topicId);
  }

  @Get('search')
  search(@Query('q') query: string, @Query('topicId') topicId?: string) {
    return this.entriesService.semanticSearch(query ?? '', topicId);
  }

  @Get('graph/:topicId')
  graph(@Param('topicId') topicId: string) {
    return this.entriesService.graph(topicId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entriesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEntryDto) {
    return this.entriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.entriesService.remove(id);
  }
}
