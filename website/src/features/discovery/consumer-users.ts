import type { VoiceCloudUser } from './types';

const consumerRoles = new Set(['USER', 'CREATOR']);

export type ConsumerViewerIdentity =
  | string
  | null
  | undefined
  | { id?: string | null; username?: string | null };

function viewerIdentity(viewer: ConsumerViewerIdentity) {
  if (!viewer) return { id: null, username: null };
  if (typeof viewer === 'string') return { id: viewer, username: null };
  return {
    id: viewer.id ?? null,
    username: viewer.username?.trim().toLowerCase() || null,
  };
}

/**
 * Consumer-facing identity policy.
 * Platform administration/guest identities must never be rendered as ordinary
 * people in the consumer website. A missing role is tolerated for legacy
 * relationship DTOs that omit role while still returning a valid consumer user.
 */
export function isConsumerVisibleUser(user: VoiceCloudUser) {
  if (user.isGuest) return false;
  if (user.role && !consumerRoles.has(user.role.toUpperCase())) return false;
  return true;
}

/**
 * Discovery/search policy adds self-exclusion on top of consumer visibility.
 * We compare both immutable id and normalized username as defense in depth for
 * mixed/legacy API payloads.
 */
export function isConsumerDiscoverableUser(
  user: VoiceCloudUser,
  viewer?: ConsumerViewerIdentity,
) {
  if (!isConsumerVisibleUser(user)) return false;
  const current = viewerIdentity(viewer);
  if (current.id && user.id === current.id) return false;
  if (current.username && user.username?.trim().toLowerCase() === current.username) return false;
  return true;
}

export function visibleConsumerUsers(
  users: VoiceCloudUser[] | undefined,
  viewer?: ConsumerViewerIdentity,
) {
  return (users ?? []).filter((user) => isConsumerDiscoverableUser(user, viewer));
}

export function consumerVisibleUsers(users: VoiceCloudUser[] | undefined) {
  return (users ?? []).filter(isConsumerVisibleUser);
}
