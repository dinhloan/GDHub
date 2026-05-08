import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  create(@Body() dto: CreateChecklistDto) {
    return this.checklistsService.create(dto);
  }

  @Post('template/:template')
  createFromTemplate(
    @Param('template') template: 'Apple DRI' | 'Google Design Sprint',
    @Query('topicId') topicId: string,
    @Query('driUserId') driUserId: string,
  ) {
    return this.checklistsService.createFromTemplate(topicId, template, driUserId);
  }

  @Get('topic/:topicId')
  findByTopic(@Param('topicId') topicId: string) {
    return this.checklistsService.findByTopic(topicId);
  }

  @Patch(':checklistId/items/:itemId')
  updateItem(
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistsService.updateItem(checklistId, itemId, dto);
  }
}
