import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, CalendarDays, LockKeyhole, LogOut, Radio, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage } from '@/api/client';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';
import { communityApi } from '@/features/community/community.api';

export function CommunityDetailsPage(){
  const { communityId='' }=useParams(); const navigate=useNavigate(); const qc=useQueryClient();
  const user=useWebsiteAuthStore(s=>s.user); const authenticated=useWebsiteAuthStore(s=>s.isAuthenticated); const [inviteCode,setInviteCode]=useState(''); const [actionError,setActionError]=useState<string|null>(null);
  const club=useQuery({queryKey:['ph04','community',communityId],queryFn:()=>communityApi.detail(communityId),enabled:Boolean(communityId)});
  const membership=useQuery({queryKey:['ph04','community','membership',club.data?.id,user?.id],queryFn:()=>communityApi.members(club.data!.id,user?.username || '',1,20),enabled:Boolean(authenticated&&club.data?.id&&user?.username)});
  const me=useMemo(()=>membership.data?.data.find(member=>member.userId===user?.id),[membership.data,user?.id]);
  const refresh=()=>{qc.invalidateQueries({queryKey:['ph04','community']});};
  const join=useMutation({mutationFn:()=>communityApi.join(club.data!.id,inviteCode.trim()||undefined),onSuccess:()=>{setActionError(null);refresh();},onError:error=>setActionError(apiErrorMessage(error))});
  const leave=useMutation({mutationFn:()=>communityApi.leave(club.data!.id),onSuccess:()=>{setActionError(null);refresh();},onError:error=>setActionError(apiErrorMessage(error))});
  if(club.isPending)return <div className="vc-page-width vc-ph04-page"><DiscoveryLoading/></div>;
  if(club.isError||!club.data)return <div className="vc-page-width vc-ph04-page"><DiscoveryError error={club.error}/></div>;
  const item=club.data; const isPrivate=item.visibility?.toUpperCase()==='PRIVATE'; const isOwner=item.ownerId===user?.id;
  return <div className="vc-page-width vc-ph04-page">
    <section className="vc-community-detail-hero" style={item.bannerUrl?{backgroundImage:`url(${item.bannerUrl})`}:undefined}>
      <div className="vc-community-detail-hero__avatar">{item.imageUrl?<img src={item.imageUrl} alt=""/>:<span>{item.name.slice(0,1).toUpperCase()}</span>}</div>
      <div><span className="vc-eyebrow">{isPrivate?<><LockKeyhole size={14}/> Private community</>:<><Users size={14}/> Public community</>}</span><h1>{item.name} {item.isVerified?<BadgeCheck size={24}/>:null}</h1><p>@{item.handle} · {item.category}</p></div>
      <div className="vc-community-detail-hero__actions">{!authenticated?<button className="vc-button vc-button--primary" onClick={()=>navigate('/auth/sign-in')}>Sign in to join</button>:isOwner?<span className="vc-owner-pill"><ShieldCheck size={16}/> Owner</span>:me?<button className="vc-button vc-button--secondary" disabled={leave.isPending} onClick={()=>leave.mutate()}><LogOut size={16}/> Leave community</button>:<button className="vc-button vc-button--primary" disabled={join.isPending||(isPrivate&&!inviteCode.trim())} onClick={()=>join.mutate()}>Join community</button>}</div>
    </section>
    {isPrivate&&authenticated&&!me&&!isOwner?<section className="vc-private-join"><div><LockKeyhole size={20}/><div><strong>Invitation required</strong><span>This private community requires the backend-supported invite code.</span></div></div><input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="Enter invite code"/></section>:null}
    {actionError?<div className="vc-inline-error">{actionError}</div>:null}
    <div className="vc-community-layout"><main>
      <section className="vc-ph04-panel"><h2>About this community</h2><p>{item.description || 'No community description has been added yet.'}</p><div className="vc-community-stats"><button onClick={()=>navigate(`/communities/${item.handle}/members`)}><b>{item.memberCount}</b><span>Members</span></button><div><b>{item.hostCount}</b><span>Hosts</span></div><button onClick={()=>navigate(`/communities/${item.handle}/rooms`)}><b>{item.upcomingRoomsCount}</b><span>Upcoming rooms</span></button></div></section>
      <section className="vc-ph04-panel"><div className="vc-ph04-panel__heading"><h2><Radio size={18}/> Community rooms & events</h2><button onClick={()=>navigate(`/communities/${item.handle}/rooms`)}>Browse schedule</button></div><p>VoiceCloud exposes community-linked scheduled rooms through the canonical scheduled-room service. Live club-room discovery is not fabricated here.</p></section>
    </main><aside>
      <section className="vc-ph04-panel"><h2>Community access</h2><ul className="vc-rule-list"><li><Users size={15}/> {item.visibility || 'Public'} visibility</li><li><CalendarDays size={15}/> {item.upcomingRoomsCount} upcoming scheduled rooms</li><li><ShieldCheck size={15}/> Membership roles controlled by backend authority</li></ul></section>
      {item.rules?.length?<section className="vc-ph04-panel"><h2>Rules</h2><ol className="vc-community-rules">{item.rules.map((rule,index)=><li key={`${rule}-${index}`}>{rule}</li>)}</ol></section>:null}
    </aside></div>
  </div>;
}
