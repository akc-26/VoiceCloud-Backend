import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCheck, Send } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage } from '@/api/client';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { profileApi } from '@/features/discovery/discovery.api';
import { messagingApi } from '@/features/messaging/messaging.api';

export function ConversationPage(){
  const {conversationId=''}=useParams();const navigate=useNavigate();const qc=useQueryClient();const me=useWebsiteAuthStore(s=>s.user);const [draft,setDraft]=useState('');const [sendError,setSendError]=useState<string|null>(null);
  const conversation=useQuery({queryKey:['ph04','conversation',conversationId],queryFn:()=>messagingApi.conversation(conversationId),enabled:Boolean(conversationId)});
  const messages=useQuery({queryKey:['ph04','conversation','messages',conversationId],queryFn:()=>messagingApi.messages(conversationId),enabled:Boolean(conversationId),refetchInterval:5_000});
  const otherId=conversation.data?.type==='direct'?conversation.data.members.find(member=>member.userId!==me?.id&&!member.leftAt)?.userId:undefined;
  const other=useQuery({queryKey:['ph04','conversation-user',otherId],queryFn:()=>profileApi.byId(otherId!),enabled:Boolean(otherId)});
  const title=conversation.data?.name || other.data?.displayName || (conversation.data?.type==='direct'?'Direct conversation':'VoiceCloud conversation');
  const send=useMutation({mutationFn:(content:string)=>messagingApi.sendMessage(conversationId,content),onSuccess:()=>{setDraft('');setSendError(null);qc.invalidateQueries({queryKey:['ph04','conversation','messages',conversationId]});qc.invalidateQueries({queryKey:['ph04','messages','conversations']});},onError:error=>setSendError(apiErrorMessage(error))});
  const newestId=useMemo(()=>messages.data?.messages.at(-1)?.id,[messages.data]);
  useEffect(()=>{if(!newestId)return;void messagingApi.markRead(conversationId,newestId).then(()=>qc.invalidateQueries({queryKey:['ph04','messages','conversations']}));},[conversationId,newestId,qc]);
  // Direct/group chat has no canonical conversation socket-join contract in R11; use bounded HTTP refresh instead of misusing voice-room presence events.
  function submit(event:FormEvent){event.preventDefault();const value=draft.trim();if(value&&!send.isPending)send.mutate(value)}
  if(conversation.isPending)return <div className="vc-page-width vc-ph04-page"><DiscoveryLoading/></div>;if(conversation.isError)return <div className="vc-page-width vc-ph04-page"><DiscoveryError error={conversation.error}/></div>;
  return <div className="vc-page-width vc-ph04-page"><section className="vc-chat-page"><header className="vc-chat-header"><button type="button" className="vc-icon-button" onClick={()=>navigate('/messages')}><ArrowLeft/></button><div className="vc-avatar-fallback">{other.data?.avatarUrl?<img src={other.data.avatarUrl} alt=""/>:title.slice(0,1).toUpperCase()}</div><div><h1>{title}</h1><span>{conversation.data?.type} conversation</span></div></header><main className="vc-chat-stream">{messages.isPending?<DiscoveryLoading/>:messages.isError?<DiscoveryError error={messages.error}/>:messages.data?.messages.length?messages.data.messages.map(message=>{const mine=message.senderId===me?.id;return <div key={message.id} className={`vc-chat-bubble${mine?' mine':''}`}><p>{message.content || `[${message.type}]`}</p><small>{new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}{message.isEdited?' · edited':''}{mine?<CheckCheck size={13}/>:null}</small></div>}):<div className="vc-chat-empty"><h2>Start the conversation</h2><p>Your first message will be sent through the VoiceCloud chat service.</p></div>}</main>{sendError?<div className="vc-inline-error vc-chat-error">{sendError}</div>:null}<form className="vc-chat-composer" onSubmit={submit}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" aria-label="Message"/><button className="vc-button vc-button--primary" disabled={!draft.trim()||send.isPending} type="submit"><Send size={16}/> Send</button></form></section></div>}
