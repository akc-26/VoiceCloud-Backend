import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs, Typography, Link, Box } from '@mui/material';
import { ChevronRight, Home } from 'lucide-react';
import { BRAND_CONFIG } from '@shared/branding';

const routeNameMap: Record<string, string> = {
  '': 'Dashboard',
  dashboard: 'Dashboard',
  analytics: 'Analytics & Insights',
  rooms: 'Live Rooms',
  schedule: 'Stream Schedule',
  audience: 'Audience & Fans',
  followers: 'Followers',
  subscribers: 'Subscriptions & Perks',
  wallet: 'Creator Wallet',
  earnings: 'Revenue & Earnings',
  gifts: 'Virtual Gifts',
  'payout-requests': 'Payout Requests',
  notifications: 'Notifications Center',
  profile: 'Creator Profile',
  verification: 'Host Verification',
  settings: 'Studio Settings',
  help: 'Help & Knowledge Base',
};

export const CreatorBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname
    .split('/')
    .filter((value) => value && value !== 'creator');

  return (
    <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
      <Breadcrumbs
        separator={<ChevronRight size={13} style={{ opacity: 0.5 }} />}
        aria-label="breadcrumb"
        sx={{ fontSize: '0.75rem', fontWeight: 500 }}
      >
        <Link
          component={RouterLink}
          to="/dashboard"
          color="text.secondary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <Home size={13} />
          {BRAND_CONFIG.products.creator.shortName}
        </Link>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const displayName =
            routeNameMap[value] ||
            value.charAt(0).toUpperCase() + value.slice(1);
          return last ? (
            <Typography
              key={to}
              color="text.primary"
              sx={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {displayName}
            </Typography>
          ) : (
            <Link
              key={to}
              component={RouterLink}
              to={to}
              color="text.secondary"
              underline="hover"
              sx={{ fontSize: '0.75rem' }}
            >
              {displayName}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
