export interface ResolvedLiveKitConfig {
  serverUrl: string;
  apiKey: string;
  apiSecret: string;
  tokenExpiration?: number;
}

function firstString(config: Record<string, unknown> | null | undefined, keys: string[]): string {
  for (const key of keys) {
    const value = config?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function resolveLiveKitProviderConfig(
  config: Record<string, unknown> | null | undefined,
): ResolvedLiveKitConfig {
  const rawServerUrl = firstString(config, ['serverUrl', 'url', 'wsUrl', 'host']);
  let serverUrl = rawServerUrl.replace(/\/$/, '');
  if (/^https?:\/\//i.test(serverUrl)) {
    serverUrl = serverUrl.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
  }
  const rawExpiration = config?.tokenExpiration;
  const tokenExpiration = Number.isSafeInteger(Number(rawExpiration))
    ? Number(rawExpiration)
    : undefined;

  return {
    serverUrl,
    apiKey: firstString(config, ['apiKey', 'livekitApiKey']),
    apiSecret: firstString(config, ['apiSecret', 'livekitApiSecret', 'secret']),
    tokenExpiration,
  };
}

export function liveKitHttpBaseUrl(serverUrl: string): string {
  return serverUrl
    .replace(/^wss:\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://')
    .replace(/\/$/, '');
}
