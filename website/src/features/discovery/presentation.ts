import type { VoiceCloudRoom, VoiceCloudUser } from './types';

const roomArt = [
  '/website/discovery/midnight.jpg',
  '/website/discovery/chill.jpg',
  '/website/discovery/poetry.jpg',
  '/website/discovery/creators.jpg',
  '/website/discovery/sunday.jpg',
  '/website/discovery/gaming.jpg',
] as const;
const avatars = [
  '/website/discovery/ellie.jpg',
  '/website/discovery/jay.jpg',
  '/website/discovery/sasha.jpg',
  '/website/discovery/ava.jpg',
] as const;

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

export function roomArtwork(room: VoiceCloudRoom) {
  return room.coverUrl || roomArt[hash(room.id || room.title) % roomArt.length];
}

export function userAvatar(user: VoiceCloudUser) {
  return user.avatarUrl || avatars[hash(user.id || user.username) % avatars.length];
}

export function compactNumber(value = 0) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function readableLanguage(value?: string) {
  if (!value) return 'Any language';
  if (value.toLowerCase() === 'en') return 'English';
  return value.toUpperCase();
}
