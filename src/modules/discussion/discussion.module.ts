import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscussionController } from './discussion.controller';
import { DiscussionGateway } from './discussion.gateway';
import { DiscussionService } from './discussion.service';
import { Message, MessageSchema } from './schemas/message.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }])],
  controllers: [DiscussionController],
  providers: [DiscussionGateway, DiscussionService],
  exports: [DiscussionGateway, DiscussionService],
})
export class DiscussionModule {}
