import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Users, Globe, Crown, Heart } from 'lucide-react';

export const AudiencePage: React.FC = () => {
  const topListeners = [
    { name: 'Alex AudioNut', handle: '@alex_audionut', level: 'VIP Master', hours: '128 hrs', gifts: '$450.00' },
    { name: 'Sarah Waves', handle: '@sarah_waves', level: 'Gold Supporter', hours: '94 hrs', gifts: '$280.00' },
    { name: 'Michael Sound', handle: '@mike_sound', level: 'Silver Supporter', hours: '76 hrs', gifts: '$150.00' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Audience & Fan Demographics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track listener loyalty, top gifters, VIP tier distribution, and regional listener reach.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Total Reach
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
                14,250
              </Typography>
              <Typography variant="caption" color="success.main">
                +14.2% Growth Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                VIP Fan Ratio
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
                5.9%
              </Typography>
              <Typography variant="caption" color="primary.main">
                840 Active Subscribers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Top Listener Leaderboard
          </Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Listener Name</TableCell>
                  <TableCell>VIP Status</TableCell>
                  <TableCell>Listen Time</TableCell>
                  <TableCell>Gifts Contributed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topListeners.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.name} ({row.handle})</TableCell>
                    <TableCell><Chip label={row.level} color="primary" size="small" /></TableCell>
                    <TableCell>{row.hours}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>{row.gifts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
