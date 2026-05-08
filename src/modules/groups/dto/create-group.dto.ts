import { ArrayMinSize, IsArray, IsMongoId, IsString, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsMongoId()
  leaderId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  members: string[];
}
