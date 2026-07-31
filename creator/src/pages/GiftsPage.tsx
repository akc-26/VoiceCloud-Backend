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

export const GiftsPage: React.FC = () => {
  const gifts = [
    { name: 'Dragon Castle', coins: '5,000 Coins', sender: '@alex_audionut', time: '15 mins ago', room: 'Lounge #102' },
    { name: 'Golden Microphone', coins: '1,200 Coins', sender: '@sarah_waves', time: '2 hours ago', room: 'Lounge #102' },
    { name: 'VIP Rocket Blast', coins: '10,000 Coins', sender: '@mike_sound', time: 'Yesterday', room: 'Podcast #101' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Virtual Gifts Received
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track high-value gifts, lucky mystery box rolls, combo streaks, and top gifter histories.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        {gifts.map((g, idx) => (
          <Grid key={idx} xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
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
                      {g.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {g.room}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 800 }}>
                    {g.coins}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    From {g.sender}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
