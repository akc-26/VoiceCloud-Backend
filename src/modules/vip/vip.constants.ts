export const VIP_REDIS_KEYS = {
  SESSION_CACHE: (userId: string) => `vip:session:${userId}`,
  BENEFITS_CACHE: (level: number) => `vip:benefits:${level}`,
  ALL_TIERS_CACHE: 'vip:tiers:all',
  REWARDS_CACHE: (level: number) => `vip:rewards:${level}`,
  PROGRESS_CACHE: (userId: string) => `vip:progress:${userId}`,
};

export const DEFAULT_VIP_BENEFITS = [
  {
    key: 'animated_profile_frame',
    name: 'Animated Profile Frames',
    description: 'Exclusive animated frames around your avatar across the app',
    category: 'visual',
    minVipLevel: 1,
    metadata: { frameUrl: '/assets/vip/frames/animated-gold.png' },
  },
  {
    key: 'exclusive_badge',
    name: 'Exclusive VIP Badges',
    description:
      'Dynamic VIP status badges displayed on profile, rooms, chat, messaging & gifts',
    category: 'badge',
    minVipLevel: 1,
    metadata: { badgeType: 'crown' },
  },
  {
    key: 'entrance_effect',
    name: 'Exclusive Entrance Effects',
    description:
      'Special animated entrance effect whenever you join a voice room',
    category: 'visual',
    minVipLevel: 2,
    metadata: { effectKey: 'golden_dragon' },
  },
  {
    key: 'priority_room_entry',
    name: 'Priority Room Entry',
    description:
      'Bypass room capacity limits and enter rooms with priority status',
    category: 'privilege',
    minVipLevel: 3,
    metadata: { maxBypassRatio: 1.2 },
  },
  {
    key: 'higher_gifting_limit',
    name: 'Higher Gifting Limits',
    description: 'Send massive combo gift blasts up to 9999x per transaction',
    category: 'limit',
    minVipLevel: 3,
    metadata: { maxGiftingMultiplier: 9999 },
  },
  {
    key: 'exclusive_gifts',
    name: 'Exclusive VIP Gifts',
    description:
      'Access to purchase exclusive VIP-only animated and mythic gifts',
    category: 'privilege',
    minVipLevel: 4,
    metadata: { vipDiscountPercent: 10 },
  },
  {
    key: 'vip_chat_bubble',
    name: 'VIP Chat Bubble',
    description:
      'Custom styled chat bubble background for all in-room and direct messages',
    category: 'chat',
    minVipLevel: 2,
    metadata: { bubbleStyle: 'royal-gold' },
  },
  {
    key: 'vip_name_color',
    name: 'VIP Name Color',
    description:
      'Custom golden & sparkling username color in chat, room lists and leaderboards',
    category: 'visual',
    minVipLevel: 1,
    metadata: { color: '#FFD700' },
  },
  {
    key: 'additional_friend_limit',
    name: 'Additional Friend Limits',
    description:
      'Expand maximum allowed friends list capacity up to 1,000 friends',
    category: 'limit',
    minVipLevel: 2,
    metadata: { bonusFriends: 500 },
  },
  {
    key: 'additional_room_limit',
    name: 'Additional Room Creation Limits',
    description:
      'Create and manage up to 10 active public voice rooms simultaneously',
    category: 'limit',
    minVipLevel: 4,
    metadata: { bonusRooms: 5 },
  },
  {
    key: 'exclusive_emojis',
    name: 'Exclusive Emojis',
    description:
      'Unlock animated VIP emojis for live room chat and instant messaging',
    category: 'chat',
    minVipLevel: 1,
    metadata: { emojiPackId: 'vip_gold_v1' },
  },
  {
    key: 'exclusive_stickers',
    name: 'Exclusive Stickers',
    description: 'High quality animated VIP stickers for room reactions',
    category: 'chat',
    minVipLevel: 2,
    metadata: { stickerPackId: 'vip_luxury_stickers' },
  },
];
