import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, CalendarDays, MapPin, MessageCircle, UserCheck, UserPlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage } from '@/api/client';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { profileApi } from '@/features/discovery/discovery.api';
import { messagingApi } from '@/features/messaging/messaging.api';
import type { FollowMutationResult } from '@/features/discovery/types';
import { compactNumber, userAvatar } from '@/features/discovery/presentation';
import { DiscoveryError, DiscoveryLoading } from '@/components/discovery/DiscoveryStates';

export function ProfilePage(){
  const {username=''}=useParams();const navigate=useNavigate();const qc=useQueryClient();
  const authUser=useWebsiteAuthStore(s=>s.user);const isAuthenticated=useWebsiteAuthStore(s=>s.isAuthenticated);
  const publicProfile=useQuery({queryKey:['ph03','profile','public',username],queryFn:()=>profileApi.publicByUsername(username),enabled:Boolean(username)});
  const detail=useQuery({queryKey:['ph03','profile','detail',publicProfile.data?.id],queryFn:()=>profileApi.byId(publicProfile.data!.id),enabled:Boolean(isAuthenticated&&publicProfile.data?.id&&publicProfile.data.id!==authUser?.id)});
  const profile=detail.data||publicProfile.data;
  const relationship=detail.data?.relationship;
  const follow=useMutation<FollowMutationResult, Error, void>({mutationFn:()=>relationship?.isFollowing?profileApi.unfollow(profile!.id):profileApi.follow(profile!.id),onSuccess:()=>qc.invalidateQueries({queryKey:['ph03','profile','detail',profile?.id]})});
  const message=useMutation({mutationFn:()=>messagingApi.direct(profile!.id),onSuccess:(conversation)=>navigate(`/messages/${conversation.id}`)});
  if(publicProfile.isPending)return <DiscoveryLoading label="Loading profile…"/>;if(publicProfile.isError)return <DiscoveryError error={publicProfile.error}/>;if(!profile)return null;
  const self=authUser?.id===profile.id;
  return <div className="vc-page-width vc-profile-page">
    <section className="vc-profile-hero"><div className="vc-profile-hero__cover" style={profile.coverUrl?{backgroundImage:`url(${profile.coverUrl})`}:undefined}/><div className="vc-profile-hero__content"><div className="vc-profile-avatar"><img src={userAvatar(profile)} alt=""/>{profile.isOnline?<i/>:null}</div><div className="vc-profile-copy"><span className="vc-profile-badge">{profile.hostBadge||profile.vipBadge||'VoiceCloud Member'}</span><h1>{profile.displayName}{profile.isVerified?<BadgeCheck size={28}/>:null}</h1><strong>@{profile.username}</strong><p>{profile.bio||profile.statusMessage||'VoiceCloud member'}</p><div className="vc-profile-tags">{(profile.customTags||[]).slice(0,4).map(t=><span key={t}>{t}</span>)}</div><div className="vc-profile-actions">{self?<button onClick={()=>navigate('/me')}>My Profile</button>:<><button className="primary" disabled={follow.isPending} onClick={()=>isAuthenticated?follow.mutate():navigate('/auth/sign-in')} >{relationship?.isFollowing?<><UserCheck/>Following</>:<><UserPlus/>Follow</>}</button><button disabled={message.isPending} onClick={()=>isAuthenticated?message.mutate():navigate('/auth/sign-in')}><MessageCircle/>Message</button>{message.isError?<span className="vc-profile-action-error">{apiErrorMessage(message.error)}</span>:null}</>}</div></div></div></section>
    <section className="vc-profile-stats"><div><b>{compactNumber(profile.stats?.followersCount??profile.followersCount)}</b><span>Followers</span></div><div><b>{compactNumber(profile.stats?.followingCount??profile.followingCount)}</b><span>Following</span></div><div><b>{profile.wealthLevel||1}</b><span>Wealth level</span></div><div><b>{profile.charmLevel||1}</b><span>Charm level</span></div></section>
    <div className="vc-profile-columns"><section className="vc-profile-about"><h2>About {profile.displayName.split(' ')[0]}</h2><p>{profile.bio||'No biography has been added yet.'}</p>{profile.country?<span><MapPin size={15}/>{profile.country}</span>:null}{profile.createdAt?<span><CalendarDays size={15}/>Joined {new Date(profile.createdAt).toLocaleDateString(undefined,{year:'numeric',month:'long'})}</span>:null}</section><section className="vc-profile-content"><h2>Interests & identity</h2><div className="vc-profile-interest-grid">{(profile.interests||profile.customTags||[]).length?(profile.interests||profile.customTags||[]).map(t=><span key={t}>{t}</span>):<span>No interests shared publicly.</span>}</div><div className="vc-profile-levels"><div><small>Wealth</small><b>{profile.wealthTitle||`Level ${profile.wealthLevel||1}`}</b></div><div><small>Charm</small><b>{profile.charmTitle||`Level ${profile.charmLevel||1}`}</b></div><div><small>Badges</small><b>{profile.stats?.badgesCount??profile.badges?.length??0}</b></div></div></section></div>
  </div>;
}
