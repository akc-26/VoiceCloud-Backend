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
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const faqs = [
    {
      q: 'How do I start my first live audio room?',
      a: 'Go to Live Rooms in the sidebar navigation, click "Create Audio Room", configure your room title and audio preset, then hit "Start Broadcast".',
    },
    {
      q: 'When do diamond earnings convert to payouts?',
      a: 'Diamonds can be converted once you reach the current minimum payout threshold of 100 💎 ($0.50 USD) via the Creator Wallet page.',
    },
    {
      q: 'How do subscription plans work for creators?',
      a: 'Creators can define custom subscription plans with monthly coin pricing and exclusive perks like badges, priority room entry, and co-host mic access.',
    },
    {
      q: 'What are the recommended audio bitrates?',
      a: 'We recommend 324kbps Ultra HD for music and lounge sessions, 256kbps HD for podcasts, and 128kbps for general talk shows.',
    },
  ];

  const handleSupportSubmit = () => {
    if (!message.trim()) return;
    setSupportSubmitted(true);
    setTimeout(() => {
      setSupportSubmitted(false);
      setIsSupportOpen(false);
      setMessage('');
    }, 2000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
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
            Find answers, broadcasting best practices, creator guidelines, and
            platform support contacts.
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

      {/* Quick Action Cards */}
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
                Best practices for audio hosting, engagement, and audience
                retention.
              </Typography>
              <Button variant="outlined" size="small">
                Read Handbook
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
                Platform rules, chat moderation rules, and safety compliance.
              </Typography>
              <Button variant="outlined" size="small">
                View Guidelines
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
                System Version Info
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 2 }}
              >
                {BRAND_CONFIG.products.creator.fullName} | RTC Engine Active.
              </Typography>
              <Button variant="outlined" size="small" disabled>
                Up to Date
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* FAQ Section */}
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

      {/* Contact Support Modal */}
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
          {supportSubmitted ? (
            <Alert severity="success" sx={{ my: 2 }}>
              Your ticket has been sent! Our support team will reach out to you
              shortly.
            </Alert>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Subject"
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
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsSupportOpen(false)}>Cancel</Button>
          {!supportSubmitted && (
            <Button
              variant="contained"
              startIcon={<Send size={16} />}
              onClick={handleSupportSubmit}
              disabled={!message.trim()}
              sx={{ fontWeight: 700 }}
            >
              Submit Ticket
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
