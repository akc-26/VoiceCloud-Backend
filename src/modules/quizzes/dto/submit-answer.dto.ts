import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Zero-based selected option index', example: 1 })
  @IsNumber()
  @Min(0)
  selectedOptionIndex: number;

  @ApiProperty({ description: 'Time taken in seconds to answer', example: 4.2 })
  @IsNumber()
  @Min(0)
  timeTakenSeconds: number;
}
