import { IsIn, IsString, MinLength } from 'class-validator';

export class CritiqueDto {
  @IsString()
  @MinLength(10)
  content: string;

  @IsIn(['6 Thinking Hats', '5W1H'])
  template: '6 Thinking Hats' | '5W1H';
}
