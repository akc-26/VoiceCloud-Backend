import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs, Typography, Link, Box } from '@mui/material';
import { ChevronRight, Home } from 'lucide-react';

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
  settings: 'Studio Settings',
  help: 'Help & Knowledge Base',
};

export const CreatorBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x && x !== 'creator');

  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
      <Breadcrumbs
        separator={<ChevronRight size={14} style={{ opacity: 0.6 }} />}
        aria-label="breadcrumb"
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 500,
        }}
      >
        <Link
          component={RouterLink}
          to="/creator"
          color="inherit"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <Home size={14} />
          Creator Studio
        </Link>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/creator/${pathnames.slice(0, index + 1).join('/')}`;
          const displayName = routeNameMap[value] || value.charAt(0).toUpperCase() + value.slice(1);

          return last ? (
            <Typography key={to} color="text.primary" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              {displayName}
            </Typography>
          ) : (
            <Link
              key={to}
              component={RouterLink}
              to={to}
              color="inherit"
              underline="hover"
              sx={{ fontSize: '0.8125rem' }}
            >
              {displayName}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
