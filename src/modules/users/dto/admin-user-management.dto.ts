import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
  IsEmail,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminAdjustLevelDto {
  @ApiProperty({ example: 'wealth', enum: ['wealth', 'charm'] })
  @IsString()
  @IsIn(['wealth', 'charm'])
  type: 'wealth' | 'charm';

  @ApiProperty({ example: 10, description: 'Target level (1 - 100)' })
  @IsNumber()
  @Min(1)
  @Max(100)
  level: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Optional experience points override',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exp?: number;
}

export class CreateBadgeDto {
  @ApiProperty({
    example: 'Top-Giver-2026',
    description: 'Unique badge code identifier',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Top Giver 2026', description: 'Badge display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Awarded to top donors of 2026' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/badges/top-giver.png',
  })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiProperty({
    example: 'wealth',
    description: 'wealth | charm | event | vip | creator | system',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}


export class UpdateBadgeDto {
  @ApiPropertyOptional({ example: 'Top Giver 2026' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Awarded to top donors of 2026' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/badges/top-giver.png' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ example: 'wealth' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminCreateUserDto {
  @ApiProperty({ example: 'new_user' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'New User' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ example: 'new.user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ['USER', 'CREATOR'], default: 'USER' })
  @IsString()
  @IsIn(['USER', 'CREATOR'])
  role: 'USER' | 'CREATOR';

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;
}

export class AdminResetPasswordDto {
  @ApiProperty({ example: 'NewSecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
