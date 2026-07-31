import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Divider,
  Button,
  Stack,
  LinearProgress,
} from '@mui/material';
import { BarChart3, TrendingUp, Users, Clock, Radio, Headphones, Download } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const analyticsData = [
  { time: '00:00', listeners: 320, earnings: 15 },
  { time: '04:00', listeners: 180, earnings: 8 },
  { time: '08:00', listeners: 640, earnings: 45 },
  { time: '12:00', listeners: 1250, earnings: 92 },
  { time: '16:00', listeners: 1580, earnings: 130 },
  { time: '20:00', listeners: 1850, earnings: 185 },
  { time: '23:59', listeners: 1100, earnings: 95 },
];

export const AnalyticsPage: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Analytics & Performance Insights
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Listener retention, peak concurrent views, and broadcast revenue metrics.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Download size={18} />}>
          Export Report
        </Button>
      </Box>

      {/* Top Metric Cards */}
      <Grid container spacing={2.5}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Headphones size={18} color="#7c3aed" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Total Listen Hours
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                1,240 hrs
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                +12.4% vs previous 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Users size={18} color="#2563eb" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Peak Concurrent Listeners
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                1,850
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                High: Audio Lounge #102
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Clock size={18} color="#d97706" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Avg Session Duration
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                42 mins
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                84.2% Retention Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp size={18} color="#059669" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Engagement Index
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                9.4 / 10
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                High Chat & Gift Activity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart Section */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                24-Hour Listener Curve & Stream Volume
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Real-time metrics provided by VoiceCloud Analytics Engine
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label="24 Hours" color="primary" size="small" />
              <Chip label="7 Days" variant="outlined" size="small" />
              <Chip label="30 Days" variant="outlined" size="small" />
            </Stack>
          </Box>

          <Box sx={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="listeners" stroke="#7c3aed" fillOpacity={1} fill="url(#colorListeners)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
