import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscussionModule } from '../discussion/discussion.module';
import { GroupsModule } from '../groups/groups.module';
import { Topic, TopicSchema } from './schemas/topic.schema';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Topic.name, schema: TopicSchema }]),
    GroupsModule,
    DiscussionModule,
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService, MongooseModule],
})
export class TopicsModule {}
