import { AlertTriangle, LoaderCircle, SearchX } from 'lucide-react';
import { apiErrorMessage } from '@/api/client';

export function DiscoveryLoading({ label = 'Loading VoiceCloud…' }: { label?: string }) {
  return <div className="vc-discovery-state"><LoaderCircle className="vc-spin"/><strong>{label}</strong></div>;
}
export function DiscoveryError({ error }: { error: unknown }) {
  return <div className="vc-discovery-state is-error"><AlertTriangle/><strong>Couldn’t load this section</strong><p>{apiErrorMessage(error)}</p></div>;
}
export function DiscoveryEmpty({ title = 'Nothing here yet', description = 'VoiceCloud will show results here when they are available.' }: { title?: string; description?: string }) {
  return <div className="vc-discovery-state"><SearchX/><strong>{title}</strong><p>{description}</p></div>;
}
