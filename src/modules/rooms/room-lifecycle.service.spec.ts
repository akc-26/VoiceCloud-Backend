import { BadRequestException } from '@nestjs/common';
import { Room } from './entities/room.entity';
import { RoomLifecycleStatus } from './enums/room-lifecycle-status.enum';
import { RoomLifecycleService } from './room-lifecycle.service';

describe('RoomLifecycleService (WP08-02)', () => {
  const service = new RoomLifecycleService();

  const room = (status: RoomLifecycleStatus): Room =>
    ({
      id: 'room-1',
      hostId: 'host-1',
      title: 'Lifecycle Room',
      status,
      isLive: status === RoomLifecycleStatus.LIVE,
      listenerCount: 7,
      speakerCount: 2,
    }) as Room;

  it('starts an offline room and resets live counters', () => {
    const target = room(RoomLifecycleStatus.OFFLINE);
    const now = new Date('2026-08-05T12:00:00.000Z');

    service.applyStart(target, now);

    expect(target.status).toBe(RoomLifecycleStatus.LIVE);
    expect(target.isLive).toBe(true);
    expect(target.startedAt).toEqual(now);
    expect(target.listenerCount).toBe(0);
    expect(target.speakerCount).toBe(1);
  });

  it('restarts an ended manual room in-place', () => {
    const target = room(RoomLifecycleStatus.ENDED);
    const now = new Date('2026-08-05T12:30:00.000Z');
    service.applyStart(target, now);
    expect(target.status).toBe(RoomLifecycleStatus.LIVE);
    expect(target.isLive).toBe(true);
    expect(target.endedAt).toBeNull();
    expect(target.startedAt).toEqual(now);
    expect(target.listenerCount).toBe(0);
    expect(target.speakerCount).toBe(1);
  });

  it.each([
    RoomLifecycleStatus.LIVE,
    RoomLifecycleStatus.PAUSED,
  ])('rejects start while room is %s', (status) => {
    expect(() => service.applyStart(room(status))).toThrow(BadRequestException);
  });

  it('pauses only a live room and clears isLive', () => {
    const target = room(RoomLifecycleStatus.LIVE);
    service.applyPause(target);
    expect(target.status).toBe(RoomLifecycleStatus.PAUSED);
    expect(target.isLive).toBe(false);
  });

  it('resumes only a paused room', () => {
    const target = room(RoomLifecycleStatus.PAUSED);
    service.applyResume(target);
    expect(target.status).toBe(RoomLifecycleStatus.LIVE);
    expect(target.isLive).toBe(true);
  });

  it.each([RoomLifecycleStatus.LIVE, RoomLifecycleStatus.PAUSED])(
    'ends a %s room and clears live counts',
    (status) => {
      const target = room(status);
      const now = new Date('2026-08-05T13:00:00.000Z');
      service.applyEnd(target, now);
      expect(target.status).toBe(RoomLifecycleStatus.ENDED);
      expect(target.isLive).toBe(false);
      expect(target.endedAt).toEqual(now);
      expect(target.listenerCount).toBe(0);
      expect(target.speakerCount).toBe(0);
    },
  );

  it('keeps ended rooms closed to pause/resume/end until explicitly restarted', () => {
    const target = room(RoomLifecycleStatus.ENDED);
    expect(() => service.applyPause(target)).toThrow(BadRequestException);
    expect(() => service.applyResume(target)).toThrow(BadRequestException);
    expect(() => service.applyEnd(target)).toThrow(BadRequestException);
  });

  it('blocks deletion of live and paused rooms', () => {
    expect(() =>
      service.assertDeletable(room(RoomLifecycleStatus.LIVE)),
    ).toThrow(BadRequestException);
    expect(() =>
      service.assertDeletable(room(RoomLifecycleStatus.PAUSED)),
    ).toThrow(BadRequestException);
  });

  it('allows deletion of offline and ended rooms', () => {
    expect(() =>
      service.assertDeletable(room(RoomLifecycleStatus.OFFLINE)),
    ).not.toThrow();
    expect(() =>
      service.assertDeletable(room(RoomLifecycleStatus.ENDED)),
    ).not.toThrow();
  });
});
