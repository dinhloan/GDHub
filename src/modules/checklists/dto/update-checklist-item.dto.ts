import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ChecklistStatus } from '../../../shared/domain.types';

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsIn(['Todo', 'Doing', 'Review', 'Done'])
  status?: ChecklistStatus;

  @IsOptional()
  @IsString()
  phase?: string;
}
