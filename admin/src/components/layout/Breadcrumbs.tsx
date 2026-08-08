import React from 'react';
import {
  Box,
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (location.pathname === '/dashboard') return null;

  return (
    <Box sx={{ minHeight: 26, display: 'flex', alignItems: 'center' }}>
      <MuiBreadcrumbs
        separator={
          <NavigateNextIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
        }
        aria-label="breadcrumb"
      >
        <Link
          component={RouterLink}
          to="/dashboard"
          underline="hover"
          color="text.secondary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.72rem',
            fontWeight: 500,
          }}
        >
          <HomeOutlinedIcon sx={{ mr: 0.5, fontSize: 15 }} />
          Dashboard
        </Link>
        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const formattedName = name
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

          return isLast ? (
            <Typography
              key={routeTo}
              variant="caption"
              color="text.primary"
              sx={{ fontWeight: 600 }}
            >
              {formattedName}
            </Typography>
          ) : (
            <Link
              key={routeTo}
              component={RouterLink}
              to={routeTo}
              underline="hover"
              color="text.secondary"
              sx={{ fontSize: '0.72rem', fontWeight: 500 }}
            >
              {formattedName}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};
