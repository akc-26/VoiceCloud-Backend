import type { Socket } from 'socket.io-client';
import { connectWebsiteSocket, waitForWebsiteSocketReady } from '@/realtime/socket.client';

export interface AckResult { success?: boolean; error?: string; message?: string; reaction?: unknown; [key:string]: unknown }

class RealtimeAckError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'RealtimeAckError';
  }
}

function emitWithAck(socket: Socket, event: string, payload: Record<string, unknown>): Promise<AckResult> {
  return new Promise((resolve, reject) => {
    socket.timeout(6_000).emit(event, payload, (error: Error | null, response: AckResult) => {
      if (error) return reject(error);
      if (response?.success === false) return reject(new RealtimeAckError(response.message || response.error || `${event} failed`, response.error));
      resolve(response || { success: true });
    });
  });
}

export async function ensureRealtimeConnection(): Promise<Socket> {
  return waitForWebsiteSocketReady();
}

export async function joinRealtimeRoom(roomId: string, username?: string) {
  const socket = await ensureRealtimeConnection();
  await emitWithAck(socket, 'presence:join', { roomId, username });
  return socket;
}

export async function rejoinRealtimeRoom(roomId: string) {
  const socket = await ensureRealtimeConnection();
  await emitWithAck(socket, 'presence:reconnect', { roomId });
  return socket;
}

export async function leaveRealtimeRoom(roomId: string) {
  const socket = connectWebsiteSocket();
  if (!socket.connected) return;
  try { await emitWithAck(socket, 'presence:leave', { roomId }); } catch { /* REST leave remains authoritative fallback */ }
}

export async function sendRoomReaction(roomId: string, emoji: string): Promise<AckResult> {
  const socket = await ensureRealtimeConnection();
  try {
    return await emitWithAck(socket, 'reaction:send', { roomId, emoji });
  } catch (error) {
    // A reconnect can recreate the transport before room membership is restored.
    // Re-establish authoritative presence once, then retry the reaction.
    if (error instanceof RealtimeAckError && error.code === 'NOT_IN_ROOM') {
      await emitWithAck(socket, 'presence:reconnect', { roomId });
      return emitWithAck(socket, 'reaction:send', { roomId, emoji });
    }
    throw error;
  }
}

export async function inviteRoomParticipant(roomId: string, targetUserId: string): Promise<AckResult> {
  const socket = await ensureRealtimeConnection();
  return emitWithAck(socket, 'room:invite_participant', { roomId, targetUserId });
}

export async function revokeRoomParticipantInvitation(roomId: string, targetUserId: string): Promise<AckResult> {
  const socket = await ensureRealtimeConnection();
  return emitWithAck(socket, 'room:revoke_invitation', { roomId, targetUserId });
}
