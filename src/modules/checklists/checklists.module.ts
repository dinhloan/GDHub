import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';
import { Checklist, ChecklistSchema } from './schemas/checklist.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Checklist.name, schema: ChecklistSchema }])],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
})
export class ChecklistsModule {}
