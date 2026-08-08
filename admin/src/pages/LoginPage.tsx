import React, { useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';

import { useAuthStore, UserRole } from '../store/auth.store';
import { BRAND_CONFIG, getBrandAssetUrl } from '@shared/branding';
import { authService } from '../services/auth.service';
import { useNotificationsStore } from '../store/notifications.store';

const FeatureLine: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: 2.25,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'rgba(255,255,255,0.11)',
        border: '1px solid rgba(255,255,255,0.14)',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="subtitle2" sx={{ color: 'common.white', mb: 0.2 }}>
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}
      >
        {description}
      </Typography>
    </Box>
  </Box>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const setAuth = useAuthStore((state) => state.setAuth);
  const addToast = useNotificationsStore((state) => state.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await authService.login(
        email.trim().toLowerCase(),
        password,
      );
      const allowedAdminRoles: UserRole[] = [
        'SUPER_ADMIN',
        'ADMIN',
        'MODERATOR',
        'SUPPORT',
      ];

      if (!allowedAdminRoles.includes(data.user.role)) {
        throw new Error('This account does not have Admin Portal access.');
      }

      setAuth(data.accessToken, data.refreshToken, {
        ...data.user,
        isSuperAdmin: data.user.role === 'SUPER_ADMIN',
      });
      addToast('success', `Welcome back, ${data.user.displayName || 'Admin'}!`);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err?.message || 'Authentication failed. Please check your credentials.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: 'minmax(380px, 0.9fr) minmax(520px, 1.1fr)',
        },
        backgroundColor: 'background.default',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: 'common.white',
          background: `linear-gradient(145deg, ${BRAND_CONFIG.colors.admin.secondaryDark} 0%, ${BRAND_CONFIG.colors.admin.navigationBackground} 48%, ${BRAND_CONFIG.colors.admin.primary} 100%)`,
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 440,
            height: 440,
            borderRadius: '50%',
            right: -170,
            top: -120,
            background:
              'radial-gradient(circle, rgba(56,189,248,0.34) 0%, rgba(56,189,248,0) 70%)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 'auto auto -180px -120px',
            width: 430,
            height: 430,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
            <Box
              component="img"
              src={getBrandAssetUrl('admin', 'logoMark')}
              alt={`${BRAND_CONFIG.identity.name} logo`}
              sx={{
                width: 42,
                height: 42,
                filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.18))',
              }}
            />
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: 'common.white',
                  fontWeight: 750,
                  lineHeight: 1.15,
                }}
              >
                {BRAND_CONFIG.identity.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.68)' }}
              >
                {BRAND_CONFIG.products.admin.fullName}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 520, my: 6 }}>
          <Typography
            variant="h2"
            sx={{ color: 'common.white', mb: 1.5, maxWidth: 480 }}
          >
            Operational clarity for the entire platform.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255,255,255,0.74)',
              maxWidth: 500,
              mb: 4,
              lineHeight: 1.7,
            }}
          >
            Securely manage users, Hosts, economy operations, realtime
            infrastructure, moderation, content and system configuration from
            one workspace.
          </Typography>
          <Stack spacing={2.1}>
            <FeatureLine
              icon={<ShieldOutlinedIcon fontSize="small" />}
              title="Role-aware administration"
              description="Existing permissions and protected administrative workflows remain enforced."
            />
            <FeatureLine
              icon={<CloudDoneOutlinedIcon fontSize="small" />}
              title="Operational visibility"
              description="Monitor the existing platform and infrastructure surfaces from a consistent control center."
            />
            <FeatureLine
              icon={<InsightsOutlinedIcon fontSize="small" />}
              title="Data-first interface"
              description="Tables, statuses and financial information prioritize readability and precision."
            />
          </Stack>
        </Box>

        <Typography
          variant="caption"
          sx={{
            position: 'relative',
            zIndex: 1,
            color: 'rgba(255,255,255,0.58)',
          }}
        >
          Authorized personnel only. Administrative activity is subject to audit
          controls.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4, lg: 6 },
          backgroundImage:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 50% 10%, rgba(37,99,235,0.08), transparent 42%)'
              : 'radial-gradient(circle at 50% 10%, rgba(37,99,235,0.07), transparent 42%)',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 470 }}>
          <Box
            sx={{
              display: { xs: 'flex', lg: 'none' },
              alignItems: 'center',
              gap: 1.2,
              mb: 3,
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={getBrandAssetUrl('admin', 'logoMark')}
              alt={`${BRAND_CONFIG.identity.name} logo`}
              sx={{ width: 38, height: 38 }}
            />
            <Typography variant="h5">{BRAND_CONFIG.identity.name}</Typography>
          </Box>

          <Card
            elevation={0}
            sx={{
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 22px 54px rgba(0,0,0,0.24)'
                  : '0 22px 54px rgba(16,35,63,0.09)',
            }}
          >
            <CardContent
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                '&:last-child': { pb: { xs: 2.5, sm: 3.5 } },
              }}
            >
              <Box sx={{ mb: 2.5 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main',
                    bgcolor: alpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'dark' ? 0.16 : 0.075,
                    ),
                    mb: 1.5,
                  }}
                >
                  <LockOutlinedIcon sx={{ fontSize: 21 }} />
                </Box>
                <Typography variant="h4" sx={{ mb: 0.65 }}>
                  Administrator sign in
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use your authorized administrator credentials to continue.
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={1.6}>
                  <TextField
                    fullWidth
                    label="Admin email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowPassword((current) => !current)
                              }
                              edge="end"
                              aria-label={
                                showPassword ? 'Hide password' : 'Show password'
                              }
                            >
                              {showPassword ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    startIcon={
                      isLoading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <LockOutlinedIcon fontSize="small" />
                      )
                    }
                    sx={{ mt: 0.7, minHeight: 44 }}
                  >
                    {isLoading ? 'Authenticating…' : 'Sign in to Admin Console'}
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ my: 2.5 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                align="center"
                sx={{ display: 'block', lineHeight: 1.55 }}
              >
                Access is restricted to authorized administrative roles.
                Authentication and administrative activity are logged according
                to platform security policy.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};
