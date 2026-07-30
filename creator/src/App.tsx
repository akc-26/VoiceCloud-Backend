import React from 'react';
import { APP_NAMES, THEME_TOKENS } from '@shared';

export default function App() {
  return (
    <div
      style={{
        fontFamily: THEME_TOKENS.typography.fontFamily,
        minHeight: '100vh',
        backgroundColor: THEME_TOKENS.colors.neutral[50],
        color: THEME_TOKENS.colors.neutral[900],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: THEME_TOKENS.borderRadius.lg,
          padding: '2.5rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
          border: `1px solid ${THEME_TOKENS.colors.neutral[200]}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: THEME_TOKENS.colors.secondary[500] + '15',
            color: THEME_TOKENS.colors.secondary[600],
            borderRadius: THEME_TOKENS.borderRadius.full,
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          Phase VC-PH03 Prepared
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          {APP_NAMES.CREATOR_STUDIO}
        </h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Welcome to VoiceCloud Creator Studio. Multi-application hosting infrastructure is ready for VC-PH04.
        </p>
        <div
          style={{
            padding: '1rem',
            backgroundColor: THEME_TOKENS.colors.neutral[100],
            borderRadius: THEME_TOKENS.borderRadius.md,
            fontSize: '0.85rem',
            color: '#475569',
          }}
        >
          Hosted at <code>/creator</code> | Managed by VoiceCloud Backend Foundation
        </div>
      </div>
    </div>
  );
}
