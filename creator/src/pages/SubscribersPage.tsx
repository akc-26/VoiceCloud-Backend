import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import { Crown, Plus, Check, Users } from 'lucide-react';

export const SubscribersPage: React.FC = () => {
  const plans = [
    {
      id: 'plan-1',
      name: 'Silver Supporter',
      price: '500 Coins/mo',
      subscribers: 520,
      perks: ['Exclusive Supporter Badge', 'Priority Room Entry', 'Custom Chat Bubble'],
    },
    {
      id: 'plan-2',
      name: 'Gold VIP Lounge',
      price: '1,500 Coins/mo',
      subscribers: 320,
      perks: ['All Silver Perks', 'Mic Co-Host Privileges', 'Soundboard Effects', 'Monthly Supporter Bonus'],
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Subscription Plans & VIP Perks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage creator tier pricing, exclusive perks, and subscriber member lists.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Plus size={18} />}>
          Create New Tier
        </Button>
      </Box>

      <Grid container spacing={3}>
        {plans.map((p) => (
          <Grid key={p.id} xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {p.name}
                  </Typography>
                  <Chip icon={<Crown size={14} />} label={`${p.subscribers} Subscribers`} color="primary" size="small" />
                </Box>

                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800, my: 1.5 }}>
                  {p.price}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Included Subscriber Perks:
                </Typography>
                <Stack spacing={1} sx={{ mb: 2.5 }}>
                  {p.perks.map((perk, i) => (
                    <Typography key={i} variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Check size={16} color="#10b981" /> {perk}
                    </Typography>
                  ))}
                </Stack>

                <Button variant="outlined" fullWidth>
                  Edit Subscription Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
