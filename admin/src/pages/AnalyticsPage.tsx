import React from 'react';
import { Box, Typography, Grid } from '@mui/material';

import {
  AnalyticsAreaChart,
  AnalyticsBarChart,
  AnalyticsPieChart,
} from '../components/common/Charts';

export const AnalyticsPage: React.FC = () => {
  const dauData = [
    { day: 'Mon', DAU: 12400 },
    { day: 'Tue', DAU: 13100 },
    { day: 'Wed', DAU: 12800 },
    { day: 'Thu', DAU: 14200 },
    { day: 'Fri', DAU: 16800 },
    { day: 'Sat', DAU: 19500 },
    { day: 'Sun', DAU: 18200 },
  ];

  const giftCategoryRevenue = [
    { name: 'SVGA Luxury Cars', value: 45 },
    { name: 'Voice Crowns', value: 30 },
    { name: 'Microphones', value: 15 },
    { name: 'Other Gifts', value: 10 },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Platform Analytics & Intelligence
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Deep dive into daily active users (DAU), voice room retention, gift
          monetization metrics, and user engagement
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <AnalyticsAreaChart
            title="Weekly Daily Active Users (DAU)"
            data={dauData}
            dataKey="DAU"
            xAxisKey="day"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsPieChart
            title="Gift Store Revenue Breakdown"
            data={giftCategoryRevenue}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
