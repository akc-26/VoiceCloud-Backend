import React from 'react';
import { Grid, Card, CardContent, Skeleton, Stack, Box } from '@mui/material';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'table' | 'grid';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 3,
}) => {
  if (type === 'list') {
    return (
      <Stack spacing={2}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />
        ))}
      </Stack>
    );
  }

  if (type === 'table') {
    return (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={40} />
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={52} />
        ))}
      </Stack>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid key={i} xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="text" width="60%" height={28} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width="50%" height={36} />
                <Skeleton variant="rounded" width="50%" height={36} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
