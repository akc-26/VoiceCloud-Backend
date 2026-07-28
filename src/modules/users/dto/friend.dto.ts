import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SendFriendRequestDto {
  @ApiProperty({ example: 'target-user-uuid', description: 'User ID to receive friend request' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiPropertyOptional({ example: 'Hey! Let’s connect on the platform.', description: 'Optional message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: 'close_friends', description: 'Category label' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class UpdateFriendCategoryDto {
  @ApiPropertyOptional({ example: 'family', description: 'Category label (e.g. friends, close_friends, family, work)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Johnny', description: 'Custom nickname/alias' })
  @IsOptional()
  @IsString()
  alias?: string;
}

export class NearbyUsersQueryDto {
  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minLevel?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
