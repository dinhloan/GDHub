import { Controller, Get } from '@nestjs/common';
import { ReadmeService } from './readme.service';

@Controller('readme')
export class ReadmeController {
  constructor(private readonly readmeService: ReadmeService) {}

  @Get()
  findOne() {
    return this.readmeService.getReadme();
  }
}
