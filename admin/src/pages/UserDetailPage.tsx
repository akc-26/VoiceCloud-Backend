import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import { usersService, UserItem } from '../services/users.service';
import { useNotificationsStore } from '../store/notifications.store';

const ValueRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ py: 1 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
      {value === undefined || value === null || value === '' ? '—' : value}
    </Typography>
  </Box>
);

export const UserDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const addToast = useNotificationsStore((state) => state.addToast);
  const [user, setUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState('');

  const loadUser = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setUser(await usersService.getUserById(id));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();
  }, [id]);

  const resetPassword = async () => {
    if (!user || password.length < 8) return;
    try {
      await usersService.resetPassword(user.id, password);
      addToast('success', `Password reset for @${user.username}. Existing failed-login lockout was cleared.`);
      setPassword('');
      setResetOpen(false);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || err?.message || 'Password reset failed');
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} sx={{ mb: 2 }}>Back to Users</Button>
      {loading && <Typography>Loading user details…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {user && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
                <Avatar src={user.avatarUrl} sx={{ width: 72, height: 72 }}>{user.username?.charAt(0)?.toUpperCase()}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>{user.displayName}</Typography>
                  <Typography color="text.secondary">@{user.username}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={user.role} color="primary" variant="outlined" />
                    <Chip label={user.isBanned ? 'BANNED' : 'ACTIVE'} color={user.isBanned ? 'error' : 'success'} />
                    {user.isVerified && <Chip label="Verified" color="info" />}
                    {user.isVip && <Chip label="VIP" color="secondary" />}
                  </Stack>
                </Box>
                <Button variant="outlined" startIcon={<LockResetIcon />} onClick={() => setResetOpen(true)}>Reset Password</Button>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 700 }}>Identity & Account</Typography><Divider sx={{ my: 1 }} /><ValueRow label="User ID" value={user.id} /><ValueRow label="Email" value={user.email} /><ValueRow label="Phone" value={user.phoneNumber} /><ValueRow label="Country" value={user.country} /><ValueRow label="Preferred Language" value={user.preferredLanguage} /><ValueRow label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : undefined} /><ValueRow label="Updated" value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : undefined} /></CardContent></Card></Grid>
            <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 700 }}>Profile & Creator</Typography><Divider sx={{ my: 1 }} /><ValueRow label="Bio" value={user.bio} /><ValueRow label="Gender" value={user.gender} /><ValueRow label="Creator Enabled" value={user.isCreatorEnabled ? 'Yes' : 'No'} /><ValueRow label="Verification Status" value={user.verificationStatus} /><ValueRow label="Followers" value={user.followersCount ?? 0} /><ValueRow label="Following" value={user.followingCount ?? 0} /><ValueRow label="Popularity Score" value={user.popularityScore ?? 0} /></CardContent></Card></Grid>
            <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 700 }}>Levels</Typography><Divider sx={{ my: 1 }} /><ValueRow label="Wealth Level" value={user.wealthLevel ?? 1} /><ValueRow label="Wealth EXP" value={user.wealthExp ?? 0} /><ValueRow label="Charm Level" value={user.charmLevel ?? 1} /><ValueRow label="Charm EXP" value={user.charmExp ?? 0} /></CardContent></Card></Grid>
            <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 700 }}>Global Badges</Typography><Divider sx={{ my: 1 }} /><Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>{(user.badges || []).length ? (user.badges || []).map((badge) => <Chip key={badge} label={badge} />) : <Typography variant="body2" color="text.secondary">No global badges assigned.</Typography>}</Stack></CardContent></Card></Grid>
          </Grid>
        </>
      )}

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset User Password</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth sx={{ mt: 1 }} type="password" label="New Password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="Minimum 8 characters. This direct administrative reset also clears failed-login lockout state." />
        </DialogContent>
        <DialogActions><Button onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => void resetPassword()} disabled={password.length < 8}>Reset Password</Button></DialogActions>
      </Dialog>
    </Box>
  );
};
