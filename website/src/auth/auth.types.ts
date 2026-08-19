export interface WebsiteUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isVip: boolean;
  isGuest: boolean;
  role: string;
  referralCode?: string;
  profileCompletion?: number;
  bio?: string;
  country?: string;
  preferredLanguage?: string;
  interests?: string[];
  isCreatorEnabled?: boolean;
}

export interface WebsiteAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: WebsiteUser;
  sessionId?: string;
  deviceId?: string;
}

export interface WebsiteRefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}
