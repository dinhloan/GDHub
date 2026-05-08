import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AiModule } from './modules/ai/ai.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { DiscussionModule } from './modules/discussion/discussion.module';
import { EntriesModule } from './modules/entries/entries.module';
import { GroupsModule } from './modules/groups/groups.module';
import { TopicsModule } from './modules/topics/topics.module';
import { UsersModule } from './modules/users/users.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['.env.development', '.env'], isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/gdhub',
      }),
    }),
    UsersModule,
    GroupsModule,
    TopicsModule,
    EntriesModule,
    DiscussionModule,
    ChecklistsModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
