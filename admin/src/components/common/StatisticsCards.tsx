import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export interface StatItem {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  iconBgColor?: string;
  description?: string;
}

interface StatisticsCardsProps {
  stats: StatItem[];
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ stats }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 2.5,
      }}
    >
      {stats.map((stat, idx) => (
        <Card key={idx} elevation={0}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">
                {stat.title}
              </Typography>
              <Avatar
                sx={{
                  bgcolor: stat.iconBgColor || 'primary.light',
                  color: 'primary.main',
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                }}
              >
                {stat.icon}
              </Avatar>
            </Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
              {stat.value}
            </Typography>
            {(stat.change || stat.description) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {stat.change && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: stat.isPositive ? 'success.main' : 'error.main',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {stat.isPositive ? (
                      <TrendingUpIcon fontSize="small" sx={{ mr: 0.2 }} />
                    ) : (
                      <TrendingDownIcon fontSize="small" sx={{ mr: 0.2 }} />
                    )}
                    {stat.change}
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  {stat.description || 'vs previous month'}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};
