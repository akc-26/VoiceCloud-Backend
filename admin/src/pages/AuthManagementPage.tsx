import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import GoogleIcon from '@mui/icons-material/Google';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import DevicesIcon from '@mui/icons-material/Devices';
import RefreshIcon from '@mui/icons-material/Refresh';
import BlockIcon from '@mui/icons-material/Block';
import KeyIcon from '@mui/icons-material/Key';
import LockClockIcon from '@mui/icons-material/LockClock';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { useNotificationsStore } from '../store/notifications.store';
import { api } from '../services/api';

interface SystemSetting {
  id: string;
  key: string;
  title: string;
  description: string;
  value: string;
  group: string;
}

export const AuthManagementPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Settings State
  const [jwtExpiration, setJwtExpiration] = useState('3600');
  const [jwtRefreshExpiration, setJwtRefreshExpiration] = useState('604800');
  const [allowGuestLogin, setAllowGuestLogin] = useState(true);
  const [allowGoogleLogin, setAllowGoogleLogin] = useState(true);
  const [allowPhoneLogin, setAllowPhoneLogin] = useState(true);
  const [requireReferralCode, setRequireReferralCode] = useState(false);
  const [maxDevicesPerUser, setMaxDevicesPerUser] = useState('5');
  const [otpTimeout, setOtpTimeout] = useState('300');
  const [otpRetryCount, setOtpRetryCount] = useState('3');
  const [lockoutAttempts, setLockoutAttempts] = useState('5');
  const [lockoutDuration, setLockoutDuration] = useState('15');

  // Active Sessions & History
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get<SystemSetting[]>(
        '/admin/settings/group/authentication',
      );
      const settings = res.data || [];
      settings.forEach((s) => {
        if (s.key === 'jwt_expiration') setJwtExpiration(s.value);
        if (s.key === 'jwt_refresh_expiration')
          setJwtRefreshExpiration(s.value);
        if (s.key === 'allow_guest_login')
          setAllowGuestLogin(s.value === 'true');
        if (s.key === 'allow_google_login')
          setAllowGoogleLogin(s.value === 'true');
        if (s.key === 'allow_phone_login')
          setAllowPhoneLogin(s.value === 'true');
        if (s.key === 'require_referral_code')
          setRequireReferralCode(s.value === 'true');
        if (s.key === 'max_devices_per_user') setMaxDevicesPerUser(s.value);
        if (s.key === 'otp_timeout') setOtpTimeout(s.value);
        if (s.key === 'otp_retry_count') setOtpRetryCount(s.value);
        if (s.key === 'failed_login_lockout_attempts')
          setLockoutAttempts(s.value);
        if (s.key === 'failed_login_lockout_duration')
          setLockoutDuration(s.value);
      });
    } catch (error: any) {
      addToast('error', error?.message || 'Failed to load authentication settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/admin/auth/history?limit=50');
      setRecentHistory(res.data || []);
    } catch (err: any) {
      setRecentHistory([]);
      addToast('error', err?.response?.data?.message || 'Failed to load authentication history');
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const updates: Array<[string, string]> = [
        ['jwt_expiration', jwtExpiration],
        ['jwt_refresh_expiration', jwtRefreshExpiration],
        ['allow_guest_login', String(allowGuestLogin)],
        ['allow_google_login', String(allowGoogleLogin)],
        ['allow_phone_login', String(allowPhoneLogin)],
        ['require_referral_code', String(requireReferralCode)],
        ['max_devices_per_user', maxDevicesPerUser],
        ['otp_timeout', otpTimeout],
        ['otp_retry_count', otpRetryCount],
        ['failed_login_lockout_attempts', lockoutAttempts],
        ['failed_login_lockout_duration', lockoutDuration],
      ];
      await Promise.all(updates.map(([key, value]) => api.patch(`/admin/settings/${key}`, { value })));
      addToast('success', 'Authentication Platform settings saved successfully');
      await fetchSettings();
    } catch (err: any) {
      const message = Array.isArray(err?.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err?.response?.data?.message || err?.message || 'Failed to save authentication settings';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 800,
            }}
          >
            <SecurityIcon color="primary" fontSize="large" /> Authentication &
            Identity Console
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage JWT tokens, OAuth, Phone OTP, Guest access policies, device
            limits, and lockout rules
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveAll}
          size="large"
          disabled={loading}
        >
          Save Changes
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab
            label="Authentication Policies"
            icon={<KeyIcon />}
            iconPosition="start"
          />
          <Tab
            label="Login Methods"
            icon={<PhoneAndroidIcon />}
            iconPosition="start"
          />
          <Tab
            label="Security & Lockouts"
            icon={<LockClockIcon />}
            iconPosition="start"
          />
          <Tab
            label="Active Sessions & History"
            icon={<DevicesIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* TAB 0: Authentication Policies */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  JWT Token Lifetime Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Access Token Expiration (seconds)"
                      type="number"
                      value={jwtExpiration}
                      onChange={(e) => setJwtExpiration(e.target.value)}
                      helperText="Default: 3600s (1 hour). Controls short-lived access bearer token."
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Refresh Token Expiration (seconds)"
                      type="number"
                      value={jwtRefreshExpiration}
                      onChange={(e) => setJwtRefreshExpiration(e.target.value)}
                      helperText="Default: 604800s (7 days). Controls long-lived refresh token rotation."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  Device & Referral Policies
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Max Concurrent Devices per User"
                      type="number"
                      value={maxDevicesPerUser}
                      onChange={(e) => setMaxDevicesPerUser(e.target.value)}
                      helperText="Maximum active logged-in devices before oldest session is auto-revoked."
                    />
                  </Grid>
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={requireReferralCode}
                          onChange={(e) =>
                            setRequireReferralCode(e.target.checked)
                          }
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700 }}
                          >
                            Require Referral Code During Registration
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            When enabled, users must provide a valid referral
                            code to sign up.
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: Login Methods */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <PhoneAndroidIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Phone OTP Auth
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Authenticate users via SMS OTP and Firebase Auth ID tokens.
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={allowPhoneLogin}
                      onChange={(e) => setAllowPhoneLogin(e.target.checked)}
                      color="success"
                    />
                  }
                  label="Enable Phone Login"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <GoogleIcon color="error" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Google Sign-In
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Authenticate users via Google OAuth / Firebase ID tokens.
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={allowGoogleLogin}
                      onChange={(e) => setAllowGoogleLogin(e.target.checked)}
                      color="success"
                    />
                  }
                  label="Enable Google Login"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <PersonOutlinedIcon color="info" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Guest Access
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Allow temporary guest access with seamless upgrade pathways.
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={allowGuestLogin}
                      onChange={(e) => setAllowGuestLogin(e.target.checked)}
                      color="success"
                    />
                  }
                  label="Enable Guest Login"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 2: Security & Lockouts */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  Phone OTP Timeout & Retry Limit
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="OTP Timeout (seconds)"
                      type="number"
                      value={otpTimeout}
                      onChange={(e) => setOtpTimeout(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Max OTP Retry Attempts"
                      type="number"
                      value={otpRetryCount}
                      onChange={(e) => setOtpRetryCount(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  Account Lockout Policy
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Failed Login Lockout Threshold"
                      type="number"
                      value={lockoutAttempts}
                      onChange={(e) => setLockoutAttempts(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Lockout Duration (minutes)"
                      type="number"
                      value={lockoutDuration}
                      onChange={(e) => setLockoutDuration(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 3: Active Sessions & History */}
      {activeTab === 3 && (
        <Card elevation={0}>
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                User Connection & Auth Audit History
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchHistory}
                size="small"
              >
                Refresh Log
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Country / Platform</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentHistory.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.userName || row.username || 'Unknown User'}</Typography>{row.username && <Typography variant="caption" color="text.secondary">@{row.username}</Typography>}</Box><Tooltip title="View complete user details"><IconButton size="small" onClick={() => navigate(`/users/${row.userId}`)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip></Box></TableCell>
                      <TableCell>
                        <Chip
                          label={row.action}
                          size="small"
                          color={
                            row.action === 'LOGIN'
                              ? 'success'
                              : row.action === 'FAILED_LOGIN'
                                ? 'error'
                                : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{row.loginMethod || 'N/A'}</TableCell>
                      <TableCell>{row.ipAddress}</TableCell>
                      <TableCell>{`${row.country || 'Global'} / ${row.platform || 'Android'}`}</TableCell>
                      <TableCell>
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AuthManagementPage;
