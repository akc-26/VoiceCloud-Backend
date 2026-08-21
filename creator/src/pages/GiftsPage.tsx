import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Stack,
  Divider,
} from '@mui/material';
import { Gift, Sparkles, User, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const GiftsPage: React.FC = () => {
  const giftsQuery = useQuery({
    queryKey: ['creator', 'gifts'],
    queryFn: ({ signal }) => creatorApi.getRecentReceivedGifts(5, signal),
    staleTime: 30 * 1000,
    retry: 1,
  });

  if (giftsQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="grid" count={3} />
      </Box>
    );
  }

  if (giftsQuery.isError) {
    return (
      <PageErrorState
        title="Failed to Load Gift Records"
        message={
          giftsQuery.error?.message ||
          'Unable to retrieve virtual gift transaction logs.'
        }
        onRetry={() => giftsQuery.refetch()}
      />
    );
  }

  const gifts = giftsQuery.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Virtual Gifts Received
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track high-value gifts, lucky mystery box rolls, combo streaks, and
          top gifter histories.
        </Typography>
      </Box>

      {/* Gifts Grid or Empty State */}
      {gifts.length === 0 ? (
        <EmptyState
          icon={<Gift size={48} />}
          title="No Gifts Received Yet"
          description="Gifts sent by listeners during your live audio sessions will appear here in real-time."
          actionLabel="Refresh List"
          onAction={() => giftsQuery.refetch()}
        />
      ) : (
        <Grid container spacing={2.5}>
          {gifts.map((g: any, idx: number) => (
            <Grid key={g.id || idx} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Gift size={22} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {g.giftName || g.name || 'Virtual Gift'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {g.roomName || g.roomId || '—'}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="primary.main"
                      sx={{ fontWeight: 800 }}
                    >
                      🪙 {Number(g.totalCoins ?? g.coinValue ?? 0).toLocaleString()} Coins
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      From {g.senderName || g.sender?.displayName || g.sender?.username || 'VoiceCloud user'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
