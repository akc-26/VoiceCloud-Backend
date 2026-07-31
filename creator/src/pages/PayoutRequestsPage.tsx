import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { CreditCard, DollarSign, Plus, CheckCircle2, Clock } from 'lucide-react';

export const PayoutRequestsPage: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);

  const payoutHistory = [
    {
      id: 'PR-8821',
      diamonds: '125,000 💎',
      usd: '$1,250.00',
      method: 'Bank Transfer (ACH)',
      status: 'PROCESSED',
      date: 'July 2, 2026',
    },
    {
      id: 'PR-8899',
      diamonds: '50,000 💎',
      usd: '$500.00',
      method: 'PayPal',
      status: 'PENDING',
      date: 'July 28, 2026',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Payout Requests & Withdrawals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Convert diamond earnings to bank wire or PayPal. Minimum payout threshold: 10,000 💎 ($100.00 USD).
          </Typography>
        </Box>
        <Button variant="contained" color="success" startIcon={<Plus size={18} />} onClick={() => setOpenModal(true)}>
          Submit Payout Request
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Payout History & Request Logs
          </Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Request ID</TableCell>
                  <TableCell>Diamonds Amount</TableCell>
                  <TableCell>Estimated USD</TableCell>
                  <TableCell>Payout Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Requested Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payoutHistory.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ fontWeight: 700 }}>{row.id}</TableCell>
                    <TableCell>{row.diamonds}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{row.usd}</TableCell>
                    <TableCell>{row.method}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        color={row.status === 'PROCESSED' ? 'success' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>{row.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Payout Dialog Form */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit Payout Request</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField label="Diamonds Amount to Convert" placeholder="e.g. 50000" fullWidth type="number" />
            <TextField select label="Payout Method" defaultValue="Bank Transfer" fullWidth>
              <MenuItem value="Bank Transfer">Bank Transfer (ACH Direct)</MenuItem>
              <MenuItem value="PayPal">PayPal Account</MenuItem>
              <MenuItem value="Crypto (USDT)">Crypto (USDT TRC20)</MenuItem>
            </TextField>
            <TextField label="Account / Wallet Details" placeholder="e.g. Bank Account or PayPal email" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={() => setOpenModal(false)}>
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
