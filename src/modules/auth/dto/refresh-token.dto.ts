import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'JWT Refresh Token', example: 'eyJhbGci...' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Optional refresh token to revoke', example: 'eyJhbGci...' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
