import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { ChecklistStatus, ChecklistTemplate } from '../../../shared/domain.types';

class ChecklistItemDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsMongoId()
  driUserId: string;

  @IsOptional()
  @IsIn(['Todo', 'Doing', 'Review', 'Done'])
  status?: ChecklistStatus;

  @IsOptional()
  @IsString()
  phase?: string;
}

export class CreateChecklistDto {
  @IsMongoId()
  topicId: string;

  @IsIn(['Apple DRI', 'Google Design Sprint', 'Custom'])
  template: ChecklistTemplate;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items: ChecklistItemDto[];
}
