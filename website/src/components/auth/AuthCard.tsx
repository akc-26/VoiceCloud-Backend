import type { PropsWithChildren, ReactNode } from 'react';

export function AuthCard({ title, subtitle, children, footer }: PropsWithChildren<{ title: string; subtitle: string; footer?: ReactNode }>) {
  return (
    <section className="vc-auth-card">
      <div className="vc-auth-card__heading">
        <span className="vc-auth-card__kicker">VoiceCloud account</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
      {footer ? <div className="vc-auth-card__footer">{footer}</div> : null}
    </section>
  );
}
