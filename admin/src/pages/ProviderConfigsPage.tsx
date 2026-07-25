import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, TextField } from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import StorageIcon from '@mui/icons-material/Storage';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import { useNotificationsStore } from '../store/notifications.store';

export const ProviderConfigsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [s3Bucket, setS3Bucket] = useState('voicecloud-media-prod');
  const [stripeKey, setStripeKey] = useState('pk_live_51Mxxxxxxxxxxxx');

  const handleSave = (providerName: string) => {
    addToast('success', `Saved provider configuration for ${providerName}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>External Provider Configurations</Typography>
        <Typography variant="body2" color="text.secondary">Configure third-party API credentials, payment gateways, push services, and object storage buckets</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <StorageIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Storage Provider (AWS S3 / GCP)</Typography>
              </Box>
              <TextField
                fullWidth
                size="small"
                label="Target Bucket Name"
                value={s3Bucket}
                onChange={(e) => setS3Bucket(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={() => handleSave('Storage Provider')}>
                Save Storage Config
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <CreditCardIcon color="success" />
                <Typography variant="h6" fontWeight={700}>Payment Gateway (Stripe / PayPal)</Typography>
              </Box>
              <TextField
                fullWidth
                size="small"
                label="Stripe Public API Key"
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={() => handleSave('Payment Gateway')}>
                Save Gateway Config
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
