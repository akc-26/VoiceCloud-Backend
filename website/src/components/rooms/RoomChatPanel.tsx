import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import type { ChatMessage } from '@/features/messaging/types';

export function RoomChatPanel({
  messages,
  currentUserId,
  sending,
  disabled = false,
  onSend,
  onReact,
}: {
  messages: ChatMessage[];
  currentUserId?: string;
  sending: boolean;
  disabled?: boolean;
  onSend: (content: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const [text, setText] = useState('');
  const streamRef = useRef<HTMLDivElement | null>(null);
  const visible = useMemo(
    () => messages.filter((message) => message.type === 'text' || message.type === 'announcement'),
    [messages],
  );

  useEffect(() => {
    const element = streamRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }, [visible.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending || disabled) return;
    onSend(value);
    setText('');
  }

  return (
    <section className="vc-room-panel vc-room-chat">
      <header>
        <div>
          <span className="vc-eyebrow"><MessageCircle size={14} /> Room chat</span>
          <h2>Live conversation</h2>
        </div>
        {disabled ? <span className="vc-room-chat__paused">Paused</span> : null}
      </header>
      <div ref={streamRef} className="vc-room-chat__stream">
        {visible.length ? visible.map((message) => {
          const mine = message.senderId === currentUserId;
          const senderName = mine
            ? 'You'
            : message.sender?.displayName || message.sender?.username || 'VoiceCloud user';
          return (
            <article key={message.id} className={mine ? 'mine' : ''}>
              <small>
                {senderName} · {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </small>
              <p>{message.content}</p>
              <footer>
                {message.reactions?.length ? <span>{message.reactions.map((reaction) => reaction.emoji).join(' ')}</span> : <span />}
                <button type="button" disabled={disabled} onClick={() => !disabled && onReact(message.id, '💜')}>
                  <Heart size={12} /> React
                </button>
              </footer>
            </article>
          );
        }) : (
          <div className="vc-room-chat__empty">No messages yet. Start the room conversation.</div>
        )}
      </div>
      <form className="vc-room-chat__composer" onSubmit={submit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2000}
          placeholder={disabled ? 'Chat is paused until the broadcast resumes…' : 'Say something to the room…'}
          aria-label="Room message"
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !text.trim() || sending}>
          <Send size={16} /><span>Send</span>
        </button>
      </form>
    </section>
  );
}
