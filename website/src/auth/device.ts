const DEVICE_STORAGE_KEY = 'voicecloud-web-device-v1';

export interface WebsiteDeviceMetadata {
  deviceId: string;
  deviceName: string;
  deviceType: 'web';
  osVersion?: string;
  appVersion: string;
}

function browserName(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Web Browser';
}

export function getWebsiteDeviceMetadata(): WebsiteDeviceMetadata {
  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!deviceId) {
    deviceId = `web_${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }

  return {
    deviceId,
    deviceName: `${browserName()} on ${navigator.platform || 'Desktop'}`,
    deviceType: 'web',
    osVersion: navigator.platform || undefined,
    appVersion: 'web-1.0',
  };
}
