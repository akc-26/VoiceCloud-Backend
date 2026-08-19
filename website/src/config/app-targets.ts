function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveAppBase(configured: string | undefined, productionPath: string): string {
  const explicit = configured?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  // During website Vite development (:3003), Admin/Creator are not owned by
  // the consumer SPA. The local full VoiceCloud application on :3000 serves
  // the compiled /admin and /creator applications, so cross-app hand-offs must
  // leave the website dev origin.
  if (import.meta.env.DEV) {
    return `http://localhost:3000${productionPath}`;
  }

  return productionPath;
}

export function creatorStudioUrl(path = ''): string {
  const base = resolveAppBase(import.meta.env.VITE_CREATOR_APP_URL, '/creator');
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
  return `${base}${suffix}`;
}

export function adminPortalUrl(path = ''): string {
  const base = resolveAppBase(import.meta.env.VITE_ADMIN_APP_URL, '/admin');
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
  return `${base}${suffix}`;
}
