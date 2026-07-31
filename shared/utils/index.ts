/**
 * Shared Utilities & Helpers
 * Module: @shared/utils
 */

export function formatDate(date: string | Date, includeTime = false): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const dateStr = d.toISOString().split('T')[0];
  if (!includeTime) return dateStr;
  const timeStr = d.toTimeString().split(' ')[0];
  return `${dateStr} ${timeStr}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return `${text.substring(0, maxLength)}...`;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildQueryString(params: Record<string, any>): string {
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `?${query}` : '';
}
