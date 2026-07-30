import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RejectHostDto {
  @ApiPropertyOptional({ example: 'Invalid ID card image or blurry selfie.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
