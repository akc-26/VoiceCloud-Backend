import { useQuery } from '@tanstack/react-query';
import { MessageCircleMore, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { profileApi } from '@/features/discovery/discovery.api';
import { messagingApi } from '@/features/messaging/messaging.api';
import type { Conversation } from '@/features/messaging/types';

function ConversationRow({conversation}:{conversation:Conversation}){
  const navigate=useNavigate(); const me=useWebsiteAuthStore(s=>s.user);
  const otherId=conversation.type==='direct'?conversation.members.find(member=>member.userId!==me?.id&&!member.leftAt)?.userId:undefined;
  const other=useQuery({queryKey:['ph04','conversation-user',otherId],queryFn:()=>profileApi.byId(otherId!),enabled:Boolean(otherId)});
  const title=conversation.name || other.data?.displayName || (conversation.type==='direct'?'Direct conversation':conversation.type==='room'?'Room conversation':'Group conversation');
  const subtitle=conversation.lastMessage?.content || (conversation.lastMessage?.type?`Sent ${conversation.lastMessage.type}`:'No messages yet');
  return <button type="button" className="vc-conversation-row" onClick={()=>navigate(`/messages/${conversation.id}`)}><div className="vc-avatar-fallback">{conversation.avatarUrl?<img src={conversation.avatarUrl} alt=""/>:other.data?.avatarUrl?<img src={other.data.avatarUrl} alt=""/>:title.slice(0,1).toUpperCase()}</div><div className="vc-conversation-row__copy"><strong>{title}</strong><span>{subtitle}</span></div><div className="vc-conversation-row__meta"><small>{conversation.lastMessageAt?new Date(conversation.lastMessageAt).toLocaleDateString():''}</small>{conversation.unreadCount?<b>{conversation.unreadCount}</b>:null}</div></button>;
}

export function MessagesPage(){const [search,setSearch]=useState('');const conversations=useQuery({queryKey:['ph04','messages','conversations',search],queryFn:()=>messagingApi.conversations(search)});return <div className="vc-page-width vc-ph04-page"><section className="vc-ph04-titlebar"><div><span className="vc-eyebrow"><MessageCircleMore size={14}/> Messages</span><h1>Your conversations</h1><p>Direct, group and room conversations are loaded from the authenticated VoiceCloud chat service.</p></div><b className="vc-title-count">{conversations.data?.total??'—'}</b></section><label className="vc-ph04-search vc-ph04-search--wide"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations"/></label><section className="vc-message-shell"><main className="vc-conversation-list">{conversations.isPending?<DiscoveryLoading/>:conversations.isError?<DiscoveryError error={conversations.error}/>:conversations.data?.conversations.length?conversations.data.conversations.map(conversation=><ConversationRow key={conversation.id} conversation={conversation}/>):<DiscoveryEmpty title="No conversations yet" description="When you start or join a conversation it will appear here."/>}</main><aside className="vc-message-info"><MessageCircleMore size={28}/><h2>Private messaging</h2><p>Messages are created and read through the canonical `/chat` authority. No local-only conversation data is fabricated.</p></aside></section></div>}
