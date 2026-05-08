import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EntryStatus, MediaType } from '../../../shared/domain.types';

class MediaDto {
  @IsIn(['image', 'video', 'audio', 'file'])
  type: MediaType;

  @IsUrl({ require_tld: false })
  url: string;
}

class TagDto {
  @IsString()
  name: string;

  @IsBoolean()
  isPrivate: boolean;
}

export class CreateEntryDto {
  @IsMongoId()
  topicId: string;

  @IsMongoId()
  authorId: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media?: MediaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tags?: TagDto[];

  @IsOptional()
  @IsIn(['Draft', 'Debating', 'Final'])
  status?: EntryStatus;
}
