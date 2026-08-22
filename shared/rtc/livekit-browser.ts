export type BrowserAudioState =
  | 'idle'
  | 'loading-sdk'
  | 'connecting'
  | 'connected'
  | 'publishing'
  | 'muted'
  | 'playback-blocked'
  | 'disconnected'
  | 'error';

export interface BrowserRtcSessionOptions {
  serverUrl: string;
  token: string;
  publishMicrophone?: boolean;
  sdkUrl?: string;
  onState?: (state: BrowserAudioState, detail?: string) => void;
  onParticipantCount?: (count: number) => void;
}

export interface BrowserRtcSession {
  provider: 'livekit';
  enableMicrophone(): Promise<void>;
  disableMicrophone(): Promise<void>;
  startAudio(): Promise<void>;
  disconnect(): Promise<void>;
  isMicrophoneEnabled(): boolean;
  participantCount(): number;
}

const DEFAULT_LIVEKIT_SDK_URLS = [
  'https://cdn.jsdelivr.net/npm/livekit-client@2.22.0/dist/livekit-client.umd.min.js',
  'https://unpkg.com/livekit-client@2.22.0/dist/livekit-client.umd.js',
] as const;

let sdkPromise: Promise<any> | null = null;

function configuredSdkUrls(explicitUrl?: string): string[] {
  const runtimeOverride = (window as typeof window & {
    __VOICECLOUD_LIVEKIT_CLIENT_URL__?: string;
  }).__VOICECLOUD_LIVEKIT_CLIENT_URL__;
  const preferred = explicitUrl?.trim() || runtimeOverride?.trim();
  const urls = preferred
    ? [preferred, ...DEFAULT_LIVEKIT_SDK_URLS]
    : [...DEFAULT_LIVEKIT_SDK_URLS];
  return Array.from(new Set(urls.filter(Boolean)));
}

function loadLiveKitScript(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.dataset.voicecloudLivekitSdk = url;
    script.onload = () => {
      const sdk = (window as any).LivekitClient;
      if (sdk) {
        resolve(sdk);
        return;
      }
      script.remove();
      reject(new Error(`LiveKit browser SDK loaded from ${url} without exposing LivekitClient`));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Unable to load LiveKit browser SDK from ${url}`));
    };
    document.head.appendChild(script);
  });
}

function loadLiveKitSdk(explicitUrl?: string): Promise<any> {
  const existing = (window as any).LivekitClient;
  if (existing) return Promise.resolve(existing);
  if (sdkPromise) return sdkPromise;

  const urls = configuredSdkUrls(explicitUrl);
  sdkPromise = (async () => {
    const failures: string[] = [];
    for (const url of urls) {
      try {
        const sdk = await loadLiveKitScript(url);
        if (typeof sdk.isBrowserSupported === 'function' && !sdk.isBrowserSupported()) {
          throw new Error('This browser does not provide the WebRTC APIs required by LiveKit');
        }
        return sdk;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new Error(
      `Unable to load the LiveKit browser SDK. Tried ${urls.join(', ')}. ${failures.join(' | ')}`,
    );
  })().catch((error) => {
    sdkPromise = null;
    throw error;
  });

  return sdkPromise;
}

function ensureAudioMount(): HTMLElement {
  let mount = document.getElementById('voicecloud-rtc-audio');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'voicecloud-rtc-audio';
    mount.setAttribute('aria-hidden', 'true');
    mount.style.position = 'fixed';
    mount.style.width = '1px';
    mount.style.height = '1px';
    mount.style.overflow = 'hidden';
    mount.style.opacity = '0';
    mount.style.pointerEvents = 'none';
    document.body.appendChild(mount);
  }
  return mount;
}

export async function connectLiveKitAudio(
  options: BrowserRtcSessionOptions,
): Promise<BrowserRtcSession> {
  if (!options.serverUrl?.trim()) {
    throw new Error('LiveKit server URL is missing from the authoritative RTC token response');
  }
  if (!options.token?.trim()) {
    throw new Error('LiveKit participant token is missing');
  }

  options.onState?.('loading-sdk');
  const sdk = await loadLiveKitSdk(options.sdkUrl);
  options.onState?.('connecting');

  const room = new sdk.Room({ adaptiveStream: true, dynacast: true });
  const audioMount = ensureAudioMount();
  const attached = new Set<HTMLMediaElement>();

  const updateCount = () =>
    options.onParticipantCount?.((room.remoteParticipants?.size || 0) + 1);

  const attachTrack = (track: any) => {
    const kind = String(track?.kind || '').toLowerCase();
    if (kind !== 'audio' && kind !== String(sdk.Track?.Kind?.Audio || '').toLowerCase()) return;
    const element = track.attach?.() as HTMLMediaElement | undefined;
    if (!element) return;
    element.autoplay = true;
    if (element instanceof HTMLVideoElement) element.playsInline = true;
    audioMount.appendChild(element);
    attached.add(element);
    const play = element.play?.();
    if (play && typeof play.catch === 'function') {
      void play.catch(() => options.onState?.('playback-blocked', 'Browser audio playback requires user interaction'));
    }
  };

  const detachTrack = (track: any) => {
    const elements = track?.detach?.() || [];
    for (const element of elements) {
      attached.delete(element);
      element.remove?.();
    }
  };

  room.on?.(sdk.RoomEvent.TrackSubscribed, attachTrack);
  room.on?.(sdk.RoomEvent.TrackUnsubscribed, detachTrack);
  room.on?.(sdk.RoomEvent.ParticipantConnected, updateCount);
  room.on?.(sdk.RoomEvent.ParticipantDisconnected, updateCount);
  room.on?.(sdk.RoomEvent.Disconnected, () => options.onState?.('disconnected'));

  await room.connect(options.serverUrl, options.token, { autoSubscribe: true });
  updateCount();
  options.onState?.('connected');

  try {
    await room.startAudio?.();
  } catch {
    options.onState?.('playback-blocked', 'Click Enable Audio to allow room playback');
  }

  if (options.publishMicrophone) {
    await room.localParticipant.setMicrophoneEnabled(true);
    options.onState?.('publishing');
  }

  return {
    provider: 'livekit',
    async enableMicrophone() {
      await room.localParticipant.setMicrophoneEnabled(true);
      options.onState?.('publishing');
    },
    async disableMicrophone() {
      await room.localParticipant.setMicrophoneEnabled(false);
      options.onState?.('muted');
    },
    async startAudio() {
      await room.startAudio?.();
      for (const element of attached) await element.play?.();
      options.onState?.(
        room.localParticipant?.isMicrophoneEnabled ? 'publishing' : 'connected',
      );
    },
    async disconnect() {
      try {
        await room.localParticipant.setMicrophoneEnabled(false);
      } catch {
        // best-effort local device release
      }
      room.disconnect?.();
      for (const element of attached) element.remove?.();
      attached.clear();
      options.onState?.('disconnected');
    },
    isMicrophoneEnabled() {
      return Boolean(room.localParticipant?.isMicrophoneEnabled);
    },
    participantCount() {
      return (room.remoteParticipants?.size || 0) + 1;
    },
  };
}
