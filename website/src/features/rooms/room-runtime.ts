import { roomApi } from './room.api';
import { joinRealtimeRoom, leaveRealtimeRoom, rejoinRealtimeRoom } from './room-realtime';
import type { RtcJoinResult } from './types';
import { useRoomSessionStore } from './room-session.store';

const pendingJoins = new Map<string, Promise<RtcJoinResult>>();
const pendingRejoins = new Map<string, Promise<RtcJoinResult>>();

export function establishRoomRuntime(roomId: string, username?: string, existingRtc?: RtcJoinResult | null) {
  const active = pendingJoins.get(roomId);
  if (active) return active;
  const operation = (async () => {
    const rtc = existingRtc?.roomId === roomId ? existingRtc : await roomApi.join(roomId);
    await joinRealtimeRoom(roomId, username);
    return rtc;
  })().finally(() => pendingJoins.delete(roomId));
  pendingJoins.set(roomId, operation);
  return operation;
}

export function reconnectRoomRuntime(roomId: string, previousToken?: string) {
  const active = pendingRejoins.get(roomId);
  if (active) return active;
  const operation = (async () => {
    const rtc = await roomApi.rejoin(roomId, previousToken);
    await rejoinRealtimeRoom(roomId);
    return rtc;
  })().finally(() => pendingRejoins.delete(roomId));
  pendingRejoins.set(roomId, operation);
  return operation;
}

export async function leaveRoomRuntime(roomId: string) {
  await leaveRealtimeRoom(roomId);
  await roomApi.leave(roomId);
}

const pendingLeaveTimers = new Map<string, number>();

export function cancelScheduledRoomLeave(roomId: string) {
  const timer = pendingLeaveTimers.get(roomId);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    pendingLeaveTimers.delete(roomId);
  }
}

export function scheduleRoomLeave(roomId: string, delayMs = 180) {
  cancelScheduledRoomLeave(roomId);
  const timer = window.setTimeout(() => {
    pendingLeaveTimers.delete(roomId);
    void leaveRoomRuntime(roomId).catch(() => undefined).finally(() => {
      if (useRoomSessionStore.getState().roomId === roomId) useRoomSessionStore.getState().reset();
    });
  }, delayMs);
  pendingLeaveTimers.set(roomId, timer);
}
