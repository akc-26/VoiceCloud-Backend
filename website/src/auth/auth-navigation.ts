import type { Location } from 'react-router-dom';

export interface AuthReturnState {
  returnTo?: string;
}

export function returnToFromLocation(location: Location): string {
  const state = location.state as AuthReturnState | null;
  const value = state?.returnTo;
  return value && value.startsWith('/') ? value : '/';
}

export function referralFromSearch(search: string): string | undefined {
  const value = new URLSearchParams(search).get('ref')?.trim();
  return value || undefined;
}
