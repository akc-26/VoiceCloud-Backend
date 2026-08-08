import React from 'react';
import {
  alpha,
  Avatar,
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
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
  accentColor?: string;
}

interface StatisticsCardsProps {
  stats: StatItem[];
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ stats }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, minmax(0, 1fr))',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
          xl: 'repeat(4, minmax(0, 1fr))',
        },
        gap: 1.5,
      }}
    >
      {stats.map((stat) => {
        const accent = stat.accentColor || theme.palette.primary.main;
        const iconBg =
          stat.iconBgColor ||
          alpha(accent, theme.palette.mode === 'dark' ? 0.18 : 0.08);

        return (
          <Card
            key={stat.title}
            elevation={0}
            sx={{ position: 'relative', overflow: 'hidden', minHeight: 126 }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: '0 auto 0 0',
                width: 3,
                bgcolor: accent,
                opacity: 0.8,
              }}
            />
            <CardContent sx={{ p: 2, pl: 2.25, '&:last-child': { pb: 2 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, display: 'block', mb: 0.7 }}
                  >
                    {stat.title}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: iconBg,
                    color: accent,
                    width: 38,
                    height: 38,
                    borderRadius: 2.25,
                    '& .MuiSvgIcon-root': { fontSize: 19 },
                  }}
                >
                  {stat.icon}
                </Avatar>
              </Box>

              {(stat.change || stat.description) && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: 1.3,
                    minHeight: 18,
                  }}
                >
                  {stat.change && (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        color:
                          stat.isPositive === false
                            ? 'error.main'
                            : 'success.main',
                        fontWeight: 650,
                        fontSize: '0.72rem',
                      }}
                    >
                      {stat.isPositive === false ? (
                        <TrendingDownIcon sx={{ mr: 0.25, fontSize: 14 }} />
                      ) : (
                        <TrendingUpIcon sx={{ mr: 0.25, fontSize: 14 }} />
                      )}
                      {stat.change}
                    </Box>
                  )}
                  {stat.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '0.68rem' }}
                    >
                      {stat.description}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};
