import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { TopicCategory, TopicStatus } from '../../../shared/domain.types';

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsIn(['Open', 'Overdue', 'Closed'])
  status?: TopicStatus;

  @IsOptional()
  @IsIn(['Science', 'Tech', 'Life', 'Energy', 'Business', 'Other'])
  category?: TopicCategory;
}
