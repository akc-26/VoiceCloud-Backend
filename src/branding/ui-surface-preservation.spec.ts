import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const adminRoutes = [
  '/login',
  '/unauthorized',
  '/',
  '/dashboard',
  '/users',
  '/rooms',
  '/wallet',
  '/gifts',
  '/vip',
  '/hosts',
  '/rankings',
  '/tasks-achievements',
  '/store',
  '/referrals',
  '/reports',
  '/moderation',
  '/announcements',
  '/notifications',
  '/messaging',
  '/rtc',
  '/cms',
  '/feature-flags',
  '/provider-configs',
  '/providers',
  '/backups',
  '/auth-management',
  '/system-settings',
  '/app-versions',
  '/audit-logs',
  '/analytics',
  '/support',
  '/profile',
  '*',
];

const creatorRoutes = [
  '/',
  '/login',
  '/dashboard',
  '/analytics',
  '/rooms',
  '/schedule',
  '/audience',
  '/followers',
  '/subscribers',
  '/wallet',
  '/earnings',
  '/gifts',
  '/payout-requests',
  '/notifications',
  '/profile',
  '/verification',
  '/settings',
  '/help',
  '*',
];

function declaredRoutes(source: string): string[] {
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map(
    (match) => match[1],
  );
}

describe('Admin and Creator UI surface preservation', () => {
  it('preserves every accepted Admin route', () => {
    expect(declaredRoutes(read('admin/src/routes/AppRoutes.tsx'))).toEqual(
      adminRoutes,
    );
  });

  it('preserves every accepted Creator route', () => {
    expect(declaredRoutes(read('creator/src/routes/AppRoutes.tsx'))).toEqual(
      creatorRoutes,
    );
  });
});
