import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackTaskEventDto {
  @ApiProperty({
    description:
      'Event key (e.g., login, check_in, join_room, stay_room_min, host_room, create_room, send_gifts, receive_gifts, chat_messages, follow_users, invite_friends, complete_profile, wallet_purchase, vip_subscription, listen_room, become_speaker, room_share)',
    example: 'join_room',
  })
  @IsString()
  eventKey: string;

  @ApiPropertyOptional({
    description: 'Increment count for event',
    default: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({
    description: 'Optional metadata for event context',
    example: '{"roomId":"room-101"}',
  })
  @IsString()
  @IsOptional()
  metadata?: string;
}
