export type ConversationType = 'direct' | 'group' | 'room';
export type MessageType = 'text' | 'image' | 'document' | 'gif' | 'sticker' | 'voice_note' | 'announcement';

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  muted: boolean;
  joinedAt: string;
  leftAt?: string | null;
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: { id?: string; username?: string; displayName?: string; avatarUrl?: string | null } | null;
  type: MessageType;
  content?: string | null;
  attachments?: Array<{ url: string; type: string; name?: string; size?: number; mimeType?: string }> | null;
  replyToId?: string | null;
  isPinned: boolean;
  isEdited: boolean;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  reactions?: Array<{ id?: string; messageId?: string; userId: string; emoji: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  roomId?: string | null;
  createdById?: string | null;
  ownerId?: string | null;
  lastMessageId?: string | null;
  lastMessageAt?: string | null;
  members: ConversationMember[];
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
  isMuted?: boolean;
}

export interface ConversationList {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
}

export interface MessagePage {
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}
