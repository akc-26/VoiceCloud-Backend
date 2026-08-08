export const JWT_CONFIG = {
  secret:
    process.env.JWT_SECRET || 'voicecloud_secure_jwt_secret_key_2026_phase16',
  issuer: 'voicecloud-api',
  audience: 'voicecloud-app',
  algorithm: 'HS256' as const,
};
