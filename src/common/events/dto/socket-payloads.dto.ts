import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
} from 'class-validator';

export class RoomEventBaseDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class SpeakerQueueJoinDto extends RoomEventBaseDto {
  @IsOptional()
  @IsString()
  username?: string;
}

export class SpeakerQueueLeaveDto extends RoomEventBaseDto {}

export class SpeakerQueueReorderDto extends RoomEventBaseDto {
  @IsArray()
  @IsString({ each: true })
  orderedUserIds: string[];
}

export class StageInviteDto extends RoomEventBaseDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class StageAcceptInvitationDto extends RoomEventBaseDto {}

export class StageRejectInvitationDto extends RoomEventBaseDto {}

export class StagePromoteDto extends RoomEventBaseDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class StageDemoteDto extends RoomEventBaseDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class StageRemoveDto extends RoomEventBaseDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class StageMuteDto extends RoomEventBaseDto {
  @IsOptional()
  @IsString()
  targetUserId?: string;
}

export class StageUnmuteDto extends RoomEventBaseDto {
  @IsOptional()
  @IsString()
  targetUserId?: string;
}

export class EmojiReactionDto extends RoomEventBaseDto {
  @IsString()
  @IsNotEmpty()
  emoji: string;
}

export class SendGiftEventDto extends RoomEventBaseDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  giftId: string;

  @IsOptional()
  @IsString()
  giftName?: string;

  @IsOptional()
  @IsString()
  giftCategory?: string;

  @IsOptional()
  @IsNumber()
  coinValue?: number;

  @IsOptional()
  @IsString()
  animationUrl?: string;
}

export class UpdateRoomTopicDto extends RoomEventBaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class PresenceJoinDto extends RoomEventBaseDto {
  @IsOptional()
  @IsString()
  username?: string;
}

export class PresenceLeaveDto extends RoomEventBaseDto {}

export class TypingStatusDto extends RoomEventBaseDto {
  @IsBoolean()
  isTyping: boolean;
}
