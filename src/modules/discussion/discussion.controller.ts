import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { DiscussionService } from './discussion.service';

@Controller('discussion')
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Post('messages')
  create(@Body() dto: CreateMessageDto) {
    return this.discussionService.create(dto);
  }

  @Get('entries/:entryId/messages')
  findByEntry(@Param('entryId') entryId: string) {
    return this.discussionService.findByEntry(entryId);
  }
}
