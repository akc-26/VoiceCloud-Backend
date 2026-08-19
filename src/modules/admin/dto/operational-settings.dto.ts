import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, Length, Max, Min } from 'class-validator';
import {
  MAX_ROOM_CAPACITY_LIMIT,
  MAX_SPEAKER_SEATS_LIMIT,
} from '../system-settings/system-settings.registry';

export class OperationalSettingsResponseDto {
  @ApiProperty()
  maintenanceMode: boolean;

  @ApiProperty()
  maintenanceMessage: string;

  @ApiProperty()
  maxRoomCapacity: number;

  @ApiProperty()
  maxSpeakerSeats: number;

  @ApiProperty()
  updatedAt: string;
}

export class UpdateOperationalSettingsDto {
  @ApiProperty()
  @IsBoolean()
  maintenanceMode: boolean;

  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString()
  @Length(1, 500)
  maintenanceMessage: string;

  @ApiProperty({ minimum: 2, maximum: MAX_ROOM_CAPACITY_LIMIT })
  @IsInt()
  @Min(2)
  @Max(MAX_ROOM_CAPACITY_LIMIT)
  maxRoomCapacity: number;

  @ApiProperty({ minimum: 1, maximum: MAX_SPEAKER_SEATS_LIMIT })
  @IsInt()
  @Min(1)
  @Max(MAX_SPEAKER_SEATS_LIMIT)
  maxSpeakerSeats: number;
}
