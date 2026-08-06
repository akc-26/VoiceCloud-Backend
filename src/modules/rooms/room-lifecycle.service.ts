import { BadRequestException, Injectable } from '@nestjs/common';
import { Room } from './entities/room.entity';
import { RoomLifecycleStatus } from './enums/room-lifecycle-status.enum';

export type RoomLifecycleAction = 'start' | 'pause' | 'resume' | 'end';

const ALLOWED_TRANSITIONS: Record<
  RoomLifecycleAction,
  readonly RoomLifecycleStatus[]
> = {
  start: [RoomLifecycleStatus.OFFLINE],
  pause: [RoomLifecycleStatus.LIVE],
  resume: [RoomLifecycleStatus.PAUSED],
  end: [RoomLifecycleStatus.LIVE, RoomLifecycleStatus.PAUSED],
};

@Injectable()
export class RoomLifecycleService {
  normalize(status: string | null | undefined): RoomLifecycleStatus {
    switch (status) {
      case RoomLifecycleStatus.LIVE:
        return RoomLifecycleStatus.LIVE;
      case RoomLifecycleStatus.PAUSED:
        return RoomLifecycleStatus.PAUSED;
      case RoomLifecycleStatus.ENDED:
        return RoomLifecycleStatus.ENDED;
      case RoomLifecycleStatus.OFFLINE:
      case undefined:
      case null:
      case '':
        return RoomLifecycleStatus.OFFLINE;
      default:
        throw new BadRequestException(`Unsupported room status: ${status}`);
    }
  }

  assertTransition(room: Room, action: RoomLifecycleAction): void {
    const current = this.normalize(room.status);
    if (!ALLOWED_TRANSITIONS[action].includes(current)) {
      throw new BadRequestException(
        `Cannot ${action} room while it is ${current}`,
      );
    }
  }

  applyStart(room: Room, now = new Date()): void {
    this.assertTransition(room, 'start');
    room.status = RoomLifecycleStatus.LIVE;
    room.isLive = true;
    room.startedAt = now;
    room.endedAt = null;
    room.speakerCount = Math.max(room.speakerCount || 0, 1);
  }

  applyPause(room: Room): void {
    this.assertTransition(room, 'pause');
    room.status = RoomLifecycleStatus.PAUSED;
    room.isLive = false;
  }

  applyResume(room: Room): void {
    this.assertTransition(room, 'resume');
    room.status = RoomLifecycleStatus.LIVE;
    room.isLive = true;
  }

  applyEnd(room: Room, now = new Date()): void {
    this.assertTransition(room, 'end');
    room.status = RoomLifecycleStatus.ENDED;
    room.isLive = false;
    room.endedAt = now;
    room.listenerCount = 0;
    room.speakerCount = 0;
  }

  assertDeletable(room: Room): void {
    const current = this.normalize(room.status);
    if (
      current === RoomLifecycleStatus.LIVE ||
      current === RoomLifecycleStatus.PAUSED
    ) {
      throw new BadRequestException(
        'A live or paused room must be ended before it can be deleted',
      );
    }
  }
}
