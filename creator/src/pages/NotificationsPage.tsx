import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '../store/notification.store';

export const NotificationsPage: React.FC = () => {
  const { notifications, markAllAsRead } = useNotificationStore();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Creator Notifications Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            In-app alerts for subscriptions, gifts received, payout statuses, and platform system announcements.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<CheckCheck size={18} />} onClick={markAllAsRead}>
          Mark All Read
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            {notifications.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: item.read ? 'transparent' : 'action.hover',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                    <Chip label={item.type.toUpperCase()} size="small" color="primary" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.message}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
