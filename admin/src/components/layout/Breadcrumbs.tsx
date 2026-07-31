import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <Box sx={{ py: 1 }}>
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
        aria-label="breadcrumb"
      >
        <Link
          component={RouterLink}
          to="/dashboard"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem', fontWeight: 500 }}
        >
          <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
          Home
        </Link>
        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const formattedName = name.replace(/-/g, ' ').toUpperCase();

          return isLast ? (
            <Typography key={name} variant="caption" color="text.primary" sx={{ fontWeight: 700 }}>
              {formattedName}
            </Typography>
          ) : (
            <Link
              key={name}
              component={RouterLink}
              to={routeTo}
              underline="hover"
              color="inherit"
              sx={{ fontSize: '0.8125rem' }}
            >
              {formattedName}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};
