import React from 'react';
import { BRAND_CONFIG, THEME_TOKENS } from '@shared';

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
          maxWidth: '650px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: THEME_TOKENS.borderRadius.lg,
          padding: '3rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
          border: `1px solid ${THEME_TOKENS.colors.neutral[200]}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: THEME_TOKENS.colors.primary[500] + '15',
            color: THEME_TOKENS.colors.primary[600],
            borderRadius: THEME_TOKENS.borderRadius.full,
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          Live Audio Platform
        </div>
        <h1
          style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}
        >
          {BRAND_CONFIG.products.website.fullName}
        </h1>
        <p
          style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}
        >
          Real-time voice streaming, creator tools, and community experiences in
          one platform.
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
          {BRAND_CONFIG.identity.tagline}
        </div>
      </div>
    </div>
  );
}
