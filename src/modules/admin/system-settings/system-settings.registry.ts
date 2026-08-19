import { SettingValueType } from '../entities/system-setting.entity';

export interface SystemSettingDefinition {
  key: string;
  group: string;
  title: string;
  description: string;
  value: string;
  valueType: SettingValueType;
  defaultValue: string;
  validationRules?: Record<string, unknown>;
  isEditable: boolean;
  isPublic: boolean;
}

export const MAX_ROOM_CAPACITY_LIMIT = 10_000;
export const MAX_SPEAKER_SEATS_LIMIT = 100;

export const STREAMING_PROVIDERS = [
  'mediamtx',
  'livekit',
  'antmedia',
  'agora',
] as const;
export const STREAMING_CODECS = ['opus', 'aac', 'lc3'] as const;
export const STREAMING_REGIONS = [
  'us-east',
  'us-west',
  'eu-central',
  'ap-south',
] as const;
export const STREAM_KEY_POLICIES = [
  'auto_rotate_90d',
  'auto_rotate_30d',
  'per_session',
  'manual',
] as const;

export const OPERATIONAL_SETTING_KEYS = [
  'maintenance_mode',
  'maintenance_message',
  'max_room_capacity',
  'max_speaker_seats',
] as const;

export const STREAMING_INFRASTRUCTURE_SETTING_KEYS = [
  'streaming_provider',
  'rtmp_server_url',
  'webrtc_server_url',
  'turn_stun_servers',
  'recording_enabled',
  'low_latency_mode',
  'default_bitrate',
  'codec',
  'region',
  'stream_key_policy',
] as const;

export const OPERATIONAL_SETTING_DEFINITIONS: SystemSettingDefinition[] = [
  {
    key: 'maintenance_mode',
    group: 'maintenance',
    title: 'Maintenance Mode',
    description: 'Enable the platform maintenance lock',
    value: 'false',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'false',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'maintenance_message',
    group: 'maintenance',
    title: 'Maintenance Message',
    description: 'Message displayed while maintenance mode is active',
    value:
      'System is undergoing scheduled maintenance. Please try again shortly.',
    valueType: SettingValueType.STRING,
    defaultValue:
      'System is undergoing scheduled maintenance. Please try again shortly.',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'max_room_capacity',
    group: 'rtc',
    title: 'Maximum Room Capacity',
    description: 'Maximum audience participants allowed in a room',
    value: '500',
    valueType: SettingValueType.NUMBER,
    defaultValue: '500',
    validationRules: { min: 2, max: MAX_ROOM_CAPACITY_LIMIT },
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'max_speaker_seats',
    group: 'rtc',
    title: 'Maximum Speaker Seats',
    description: 'Maximum numbered speaking seats available in a room',
    value: '12',
    valueType: SettingValueType.NUMBER,
    defaultValue: '12',
    validationRules: { min: 1, max: MAX_SPEAKER_SEATS_LIMIT },
    isEditable: true,
    isPublic: true,
  },
];

export const STREAMING_INFRASTRUCTURE_SETTING_DEFINITIONS: SystemSettingDefinition[] =
  [
    {
      key: 'streaming_provider',
      group: 'streaming',
      title: 'Streaming Provider',
      description: 'Administrator-selected streaming infrastructure provider',
      value: 'mediamtx',
      valueType: SettingValueType.STRING,
      defaultValue: 'mediamtx',
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'rtmp_server_url',
      group: 'streaming',
      title: 'RTMP Ingest Server URL',
      description: 'Primary RTMP or RTMPS ingest endpoint',
      value: 'rtmps://live.voicecloud.app:443/live',
      valueType: SettingValueType.STRING,
      defaultValue: 'rtmps://live.voicecloud.app:443/live',
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'webrtc_server_url',
      group: 'streaming',
      title: 'WebRTC Gateway URL',
      description: 'WebRTC or secure WebSocket signalling endpoint',
      value: 'wss://webrtc.voicecloud.app:443/v1',
      valueType: SettingValueType.STRING,
      defaultValue: 'wss://webrtc.voicecloud.app:443/v1',
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'turn_stun_servers',
      group: 'streaming',
      title: 'TURN and STUN Servers',
      description: 'JSON array of administrator-managed TURN and STUN URIs',
      value: JSON.stringify([
        'turn:turn.voicecloud.app:3478',
        'stun:stun.l.google.com:19302',
      ]),
      valueType: SettingValueType.JSON,
      defaultValue: JSON.stringify([
        'turn:turn.voicecloud.app:3478',
        'stun:stun.l.google.com:19302',
      ]),
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'recording_enabled',
      group: 'streaming',
      title: 'Cloud Recording Enabled',
      description: 'Allow automated live-stream cloud recording',
      value: 'true',
      valueType: SettingValueType.BOOLEAN,
      defaultValue: 'true',
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'low_latency_mode',
      group: 'streaming',
      title: 'Low-Latency Mode',
      description: 'Enable the administrator-selected low-latency policy',
      value: 'true',
      valueType: SettingValueType.BOOLEAN,
      defaultValue: 'true',
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'default_bitrate',
      group: 'streaming',
      title: 'Default Audio Bitrate',
      description: 'Default streaming audio bitrate in kilobits per second',
      value: '324',
      valueType: SettingValueType.NUMBER,
      defaultValue: '324',
      validationRules: { min: 32, max: 512 },
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'codec',
      group: 'streaming',
      title: 'Audio Codec',
      description: 'Default administrator-selected audio codec',
      value: 'opus',
      valueType: SettingValueType.STRING,
      defaultValue: 'opus',
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'region',
      group: 'streaming',
      title: 'Streaming Region',
      description: 'Default edge ingest region',
      value: 'us-east',
      valueType: SettingValueType.STRING,
      defaultValue: 'us-east',
      isEditable: true,
      isPublic: false,
    },
    {
      key: 'stream_key_policy',
      group: 'streaming',
      title: 'Stream Key Rotation Policy',
      description: 'Administrator-selected stream-key rotation policy',
      value: 'auto_rotate_90d',
      valueType: SettingValueType.STRING,
      defaultValue: 'auto_rotate_90d',
      isEditable: true,
      isPublic: false,
    },
  ];

export const MANAGED_SETTING_KEYS = new Set<string>([
  ...OPERATIONAL_SETTING_KEYS,
  ...STREAMING_INFRASTRUCTURE_SETTING_KEYS,
]);

export function findManagedSettingDefinition(
  key: string,
): SystemSettingDefinition | undefined {
  return [
    ...OPERATIONAL_SETTING_DEFINITIONS,
    ...STREAMING_INFRASTRUCTURE_SETTING_DEFINITIONS,
  ].find((definition) => definition.key === key);
}
