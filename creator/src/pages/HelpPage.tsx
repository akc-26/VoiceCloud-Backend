import React from 'react';
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
} from '@mui/material';
import { HelpCircle, ChevronDown, BookOpen, MessageCircle, FileText } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const faqs = [
    {
      q: 'How do I start my first live audio room?',
      a: 'Go to Live Rooms in the sidebar navigation, click "Start Room", configure your room title and audio preset, then hit "Start Room Stream".',
    },
    {
      q: 'When do diamond earnings convert to payouts?',
      a: 'Diamonds can be converted anytime once you reach the minimum threshold of 10,000 💎 ($100.00 USD) via the Payout Requests tab.',
    },
    {
      q: 'How do subscription plans work for creators?',
      a: 'Creators can define Silver and Gold tier subscription plans with custom coin pricing and exclusive perks like badges, priority entry, and co-host mic access.',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Creator Help & Knowledge Base
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Find answers, audio broadcasting best practices, community guidelines, and support contacts.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Frequently Asked Questions
          </Typography>
          {faqs.map((faq, idx) => (
            <Accordion key={idx} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1, '&:before': { display: 'none' } }}>
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
    </Box>
  );
};
