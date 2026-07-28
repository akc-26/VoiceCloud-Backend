import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuizQuestionDto {
  @ApiProperty({ description: 'Round number for this question', example: 1 })
  @IsNumber()
  @Min(1)
  roundNumber: number;

  @ApiProperty({ description: 'Question text', example: 'What is the capital of France?' })
  @IsString()
  questionText: string;

  @ApiProperty({
    description: 'Options array',
    example: ['London', 'Paris', 'Berlin', 'Madrid'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options: string[];

  @ApiProperty({ description: 'Zero-based index of correct option', example: 1 })
  @IsNumber()
  @Min(0)
  correctOptionIndex: number;

  @ApiPropertyOptional({ description: 'Duration in seconds for question', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  durationSeconds?: number = 30;

  @ApiPropertyOptional({ description: 'Points awarded for correct answer', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  points?: number = 100;
}

export class CreateQuizDto {
  @ApiProperty({ description: 'Room ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Quiz Title', example: 'Music Trivia Challenge' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Quiz Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Total number of rounds', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalRounds?: number = 1;

  @ApiProperty({ type: [QuizQuestionDto], description: 'List of quiz questions across rounds' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  @ArrayMinSize(1)
  questions: QuizQuestionDto[];
}
