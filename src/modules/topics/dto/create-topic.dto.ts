import { IsDateString, IsIn, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';
import { TopicCategory } from '../../../shared/domain.types';

export class CreateTopicDto {
  @IsMongoId()
  groupId: string;

  @IsMongoId()
  leaderId: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  deadline: string;

  @IsIn(['Science', 'Tech', 'Life', 'Energy', 'Business', 'Other'])
  category: TopicCategory;
}
