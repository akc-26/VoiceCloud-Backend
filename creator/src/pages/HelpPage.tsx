import { BRAND_CONFIG } from '@shared/branding';
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
} from '@mui/material';
import {
  HelpCircle,
  ChevronDown,
  BookOpen,
  MessageCircle,
  FileText,
  Send,
} from 'lucide-react';

export const HelpPage: React.FC = () => {
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const supportEmail = BRAND_CONFIG.contacts.supportEmail;

  const faqs = [
    {
      q: 'How do I start my first live audio room?',
      a: 'Go to Live Rooms, create an audio room, configure its access and audio settings, then use Start Broadcast. Room lifecycle activation requires a verified Host account and a configured RTC provider.',
    },
    {
      q: 'When can I request a diamond payout?',
      a: 'The current backend payout lifecycle requires at least 100 diamonds. The Creator Wallet shows the authoritative balance and calculated payout amount before a request is submitted.',
    },
    {
      q: 'How do subscription plans work for creators?',
      a: 'Creators can create subscription plans with monthly pricing in USD, optional yearly pricing, and configured benefits. Active memberships are shown in the Subscribers directory.',
    },
    {
      q: 'What audio presets can I configure?',
      a: 'Studio Settings currently supports 324, 256, and 128 kbps audio presets. The effective media quality also depends on the active RTC provider and client media implementation.',
    },
  ];

  const handleSupportSubmit = () => {
    if (!message.trim()) return;
    const mailSubject =
      subject.trim() || `${BRAND_CONFIG.products.creator.shortName} Support Request`;
    const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(message.trim())}`;
    window.location.href = mailto;
    setIsSupportOpen(false);
    setSubject('');
    setMessage('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Creator Help & Knowledge Base
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Find product guidance and contact the configured platform support
            address.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<MessageCircle size={18} />}
          onClick={() => setIsSupportOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Contact Support
        </Button>
      </Box>

      <Alert severity="info">
        A persisted in-platform support-ticket backend is not currently present
        in this release. Contact Support opens your mail client to{' '}
        <strong>{supportEmail}</strong> instead of falsely reporting that a
        platform ticket was created.
      </Alert>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <BookOpen
                size={32}
                color={BRAND_CONFIG.colors.creator.primary}
                style={{ marginBottom: 8 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Creator Handbook
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 2 }}
              >
                No published handbook URL is configured in the current product
                source.
              </Typography>
              <Button variant="outlined" size="small" disabled>
                Not Published
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <FileText
                size={32}
                color={BRAND_CONFIG.colors.creator.info}
                style={{ marginBottom: 8 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Community Guidelines
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 2 }}
              >
                No published community-guidelines URL is configured in the
                current product source.
              </Typography>
              <Button variant="outlined" size="small" disabled>
                Not Published
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <HelpCircle
                size={32}
                color={BRAND_CONFIG.colors.creator.success}
                style={{ marginBottom: 8 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                System Information
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 2 }}
              >
                {BRAND_CONFIG.products.creator.fullName}. Runtime RTC media
                availability depends on the configured provider and client
                integration.
              </Typography>
              <Button variant="outlined" size="small" disabled>
                Configuration Managed by Admin
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Frequently Asked Questions
          </Typography>
          {faqs.map((faq, idx) => (
            <Accordion
              key={idx}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                mb: 1,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {faq.q}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {faq.a}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Contact Creator Support
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            This opens your default email application and addresses the message
            to {supportEmail}.
          </Alert>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Question about payout request"
              fullWidth
            />
            <TextField
              label="Message / Issue Description"
              multiline
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsSupportOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<Send size={16} />}
            onClick={handleSupportSubmit}
            disabled={!message.trim()}
            sx={{ fontWeight: 700 }}
          >
            Open Email Client
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
