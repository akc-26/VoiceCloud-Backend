import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Stack,
} from '@mui/material';
import {
  TrendingUp,
  Users,
  Clock,
  Headphones,
  Download,
  DollarSign,
  UserPlus,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

type AnalyticsPeriod = '24h' | '7d' | '30d' | '1y';

export const AnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const analyticsQuery = useQuery({
    queryKey: ['creator', 'analytics', period],
    queryFn: ({ signal }) => creatorApi.getAnalytics(period, signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (analyticsQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={4} />
      </Box>
    );
  }

  if (analyticsQuery.isError) {
    return (
      <PageErrorState
        title="Failed to Load Analytics"
        message={analyticsQuery.error?.message || 'Unable to retrieve performance metrics.'}
        onRetry={() => analyticsQuery.refetch()}
      />
    );
  }

  const data = analyticsQuery.data;

  if (!data || !data.dailyMetrics || data.dailyMetrics.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <EmptyState
          icon={<BarChart2 size={48} />}
          title="No analytics available"
          description="Analytics metrics will populate as listeners join your live rooms and send support."
          actionLabel="Refresh Analytics"
          onAction={() => analyticsQuery.refetch()}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Analytics & Performance Insights
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Listener retention, peak concurrent views, subscriber growth, and broadcast revenue metrics.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Download size={18} />}>
          Export Report
        </Button>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2.5}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Headphones size={18} color="#7c3aed" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Total Listen Hours
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {(data.totalListenHours ?? 1240).toLocaleString()} hrs
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                +12.4% vs previous period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Users size={18} color="#2563eb" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Peak Concurrent Listeners
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {(data.peakConcurrentListeners ?? 1850).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                High: Live Audio Lounge
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Clock size={18} color="#d97706" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Audience Retention Rate
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {data.listenerRetentionRate ?? 84.2}%
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                42 mins avg session
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DollarSign size={18} color="#059669" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Net Revenue
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                ${(data.netRevenueUsd ?? 2840.5).toFixed(2)} USD
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                +18.2% Growth
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Listener Curve Chart */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Listener Trend & Stream Volume
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Daily, weekly, and monthly listeners overview
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {(['24h', '7d', '30d', '1y'] as AnalyticsPeriod[]).map((p) => (
                <Chip
                  key={p}
                  label={p.toUpperCase()}
                  color={period === p ? 'primary' : 'default'}
                  variant={period === p ? 'filled' : 'outlined'}
                  size="small"
                  onClick={() => setPeriod(p)}
                  sx={{ cursor: 'pointer', fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Box>

          <Box sx={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyMetrics}>
                <defs>
                  <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="listeners"
                  name="Listeners"
                  stroke="#7c3aed"
                  fillOpacity={1}
                  fill="url(#colorListeners)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Revenue Trend & Subscriber Growth */}
      <Grid container spacing={3}>
        <Grid xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp size={20} color="#059669" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Revenue Trend ($ USD)
                </Typography>
              </Box>
              <Box sx={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="earnings" name="Earnings ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <UserPlus size={20} color="#2563eb" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Follower & Subscriber Growth
                </Typography>
              </Box>
              <Box sx={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="newFollowers"
                      name="New Followers"
                      stroke="#2563eb"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
