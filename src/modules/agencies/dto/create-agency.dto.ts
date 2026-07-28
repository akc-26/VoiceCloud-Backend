import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAgencyDto {
  @ApiProperty({ example: 'Starlight Talent Agency' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Leading voice talent and host management agency.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/logos/starlight.png',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
