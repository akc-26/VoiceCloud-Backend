import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateScheduledRoomDto } from './create-scheduled-room.dto';
import { ScheduledRoomStatus } from '../../../common/enums';

export class UpdateScheduledRoomDto extends PartialType(
  CreateScheduledRoomDto,
) {
  @ApiPropertyOptional({
    enum: ScheduledRoomStatus,
    description: 'Scheduled room status',
  })
  @IsOptional()
  @IsEnum(ScheduledRoomStatus)
  status?: ScheduledRoomStatus;
}
