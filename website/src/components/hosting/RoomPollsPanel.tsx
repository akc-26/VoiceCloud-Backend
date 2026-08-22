import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Plus, Square } from 'lucide-react';
import { apiErrorMessage } from '@/api/client';
import { hostingApi } from '@/features/hosting/hosting.api';

export function RoomPollsPanel({ roomId, isHost, enabled }: { roomId: string; isHost: boolean; enabled: boolean }) {
  const qc=useQueryClient(); const [title,setTitle]=useState(''); const [optionA,setOptionA]=useState(''); const [optionB,setOptionB]=useState(''); const [notice,setNotice]=useState('');
  const polls=useQuery({queryKey:['ph06','polls',roomId],queryFn:()=>hostingApi.roomPolls(roomId),enabled:Boolean(roomId),refetchInterval:5000});
  const refresh=()=>void qc.invalidateQueries({queryKey:['ph06','polls',roomId]});
  const create=useMutation({mutationFn:()=>hostingApi.createPoll(roomId,title.trim(),[optionA.trim(),optionB.trim()]),onSuccess:()=>{setTitle('');setOptionA('');setOptionB('');refresh();setNotice('Poll is live.')},onError:e=>setNotice(apiErrorMessage(e))});
  const stop=useMutation({mutationFn:hostingApi.stopPoll,onSuccess:refresh,onError:e=>setNotice(apiErrorMessage(e))});
  const vote=useMutation({mutationFn:({pollId,optionId}:{pollId:string;optionId:string})=>hostingApi.votePoll(pollId,[optionId]),onSuccess:refresh,onError:e=>setNotice(apiErrorMessage(e))});
  const active=polls.data?.find(p=>String(p.status).toLowerCase()==='active');
  function submit(e:FormEvent){e.preventDefault();if(title.trim()&&optionA.trim()&&optionB.trim())create.mutate()}
  return <section className="vc-ph06-interactive-panel"><header><span className="vc-eyebrow"><BarChart3/>Live poll</span><h2>{active?active.title:'No active poll'}</h2></header>{notice?<div className="vc-ph06-alert">{notice}</div>:null}{active?<div className="vc-ph06-poll-options">{active.options.map(opt=><button key={opt.id} disabled={!enabled||isHost||vote.isPending} onClick={()=>vote.mutate({pollId:active.id,optionId:opt.id})}><span>{opt.text||opt.optionText||'Option'}</span><b>{opt.voteCount??opt.votesCount??0} votes</b></button>)}</div>:null}{isHost?<>{active?<button className="vc-button vc-button--secondary" disabled={stop.isPending} onClick={()=>stop.mutate(active.id)}><Square/>Stop Poll</button>:<form className="vc-ph06-interactive-form" onSubmit={submit}><label>Question<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ask the room something"/></label><label>Option 1<input value={optionA} onChange={e=>setOptionA(e.target.value)}/></label><label>Option 2<input value={optionB} onChange={e=>setOptionB(e.target.value)}/></label><button className="vc-button vc-button--primary" disabled={!enabled||create.isPending}><Plus/>Start Poll</button></form>}</>:!active?<p className="vc-room-muted">The host has not started a poll.</p>:<small>Choose one option. You can change your vote while the poll is active.</small>}</section>
}
