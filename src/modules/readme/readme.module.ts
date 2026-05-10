import { Module } from '@nestjs/common';
import { ReadmeController } from './readme.controller';
import { ReadmeService } from './readme.service';

@Module({
  controllers: [ReadmeController],
  providers: [ReadmeService],
  exports: [ReadmeService],
})
export class ReadmeModule {}
