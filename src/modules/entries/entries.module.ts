import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { Entry, EntrySchema } from './schemas/entry.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Entry.name, schema: EntrySchema }]), AiModule],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService, MongooseModule],
})
export class EntriesModule {}
