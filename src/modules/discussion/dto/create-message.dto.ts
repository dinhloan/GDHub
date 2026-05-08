import { IsIn, IsMongoId, IsString, MinLength } from 'class-validator';
import { MessageType } from '../../../shared/domain.types';

export class CreateMessageDto {
  @IsMongoId()
  entryId: string;

  @IsMongoId()
  userId: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsIn(['text', 'opinion', 'critique'])
  type: MessageType;
}
