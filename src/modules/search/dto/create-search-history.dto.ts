import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSearchHistoryDto {
  @ApiProperty({
    description: 'Search query string to record',
    example: 'rock music room',
  })
  @IsNotEmpty()
  @IsString()
  query: string;
}
