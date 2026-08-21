import { apiErrorMessage } from '@/api/client';
import type { RoomAccessIssue, VoiceCloudRoomDetail } from './types';

export function roomRestrictionLabels(room: VoiceCloudRoomDetail): string[] {
  const labels: string[] = [];
  if (room.isLocked) labels.push('Locked');
  if (room.isInviteOnly) labels.push('Invite only');
  if (room.isTicketRequired || room.isPremium) labels.push('Ticket required');
  if (room.isSubscriberOnly) labels.push('Subscribers only');
  if (room.isVerifiedOnly) labels.push('Verified accounts');
  if (room.clubId) labels.push('Community room');
  return labels;
}

export function roomAccessIssue(error: unknown): RoomAccessIssue {
  const message = apiErrorMessage(error);
  const normalized = message.toLowerCase();
  if (normalized.includes('ticket')) return { reason: 'ticket', title: 'Ticket required', message };
  if (normalized.includes('subscription')) return { reason: 'subscription', title: 'Subscription required', message };
  if (normalized.includes('verified')) return { reason: 'verification', title: 'Verification required', message };
  if (normalized.includes('club membership')) return { reason: 'club', title: 'Community membership required', message };
  if (normalized.includes('invitation')) return { reason: 'invite', title: 'Invitation required', message };
  if (normalized.includes('locked')) return { reason: 'locked', title: 'This room is locked', message };
  if (normalized.includes('capacity') || normalized.includes('full')) return { reason: 'full', title: 'Room is full', message };
  if (normalized.includes('closed')) return { reason: 'closed', title: 'Room is closed', message };
  if (normalized.includes('not joinable') || normalized.includes('offline') || normalized.includes('ended')) return { reason: 'offline', title: 'Room is not live', message };
  return { reason: 'unknown', title: 'Unable to join this room', message };
}
