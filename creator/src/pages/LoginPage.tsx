import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  Mail,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { BRAND_CONFIG, getBrandAssetUrl } from '@shared/branding';
import { useAuthStore } from '../store/auth.store';
import { CreatorApiService } from '../services/creator-api.service';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuthResponse = useAuthStore((state) => state.setAuthResponse);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCreatedInfo, setAccountCreatedInfo] = useState(false);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!normalizedEmail || !password) {
      setError('Please enter both Creator email and password.');
      return;
    }
    if (!isValidEmail) {
      setError('Please enter a valid Creator email address.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const authResponse = await CreatorApiService.getInstance().login({
        email: normalizedEmail,
        password,
      });
      if (authResponse.user?.role !== 'CREATOR') {
        throw new Error(
          `This account does not have ${BRAND_CONFIG.products.creator.shortName} access.`,
        );
      }
      setAuthResponse(authResponse);
      void navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(
        err.message || 'Authentication failed. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: { xs: 4, md: 6 },
        bgcolor: BRAND_CONFIG.colors.creator.darkBackground,
        backgroundImage:
          'radial-gradient(circle at 12% 16%, rgba(34,197,94,0.20), transparent 30%), radial-gradient(circle at 88% 84%, rgba(94,234,212,0.13), transparent 28%), linear-gradient(135deg, #0b1512 0%, #123a32 52%, #0b1512 100%)',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(0, 1.05fr) minmax(420px, 0.8fr)',
            },
            gap: { xs: 3, md: 6 },
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              color: '#f3faf6',
              display: { xs: 'none', md: 'block' },
              pr: 2,
            }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 5 }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 3,
                  bgcolor: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 16px 42px rgba(0,0,0,0.22)',
                }}
              >
                <Box
                  component="img"
                  src={getBrandAssetUrl('creator', 'logoMark')}
                  alt=""
                  sx={{ width: 43, height: 43 }}
                />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ color: '#ffffff', fontWeight: 700 }}
                >
                  {BRAND_CONFIG.identity.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(243,250,246,0.64)' }}
                >
                  {BRAND_CONFIG.products.creator.shortName}
                </Typography>
              </Box>
            </Box>

            <Chip
              icon={<Sparkles size={14} />}
              label={BRAND_CONFIG.products.creator.workspaceLabel}
              sx={{
                mb: 2.5,
                color: BRAND_CONFIG.colors.creator.primaryLight,
                bgcolor: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(94,234,212,0.18)',
              }}
            />
            <Typography
              component="h1"
              sx={{
                maxWidth: 650,
                fontSize: { md: '2.5rem', lg: '3rem' },
                lineHeight: 1.08,
                fontWeight: 700,
                letterSpacing: '-0.035em',
                color: '#ffffff',
                mb: 2,
              }}
            >
              Your voice, audience and earnings in one live studio.
            </Typography>
            <Typography
              sx={{
                maxWidth: 610,
                color: 'rgba(243,250,246,0.68)',
                fontSize: '1rem',
                lineHeight: 1.7,
                mb: 4,
              }}
            >
              Manage live rooms, community activity, creator analytics and
              monetization through the secure {BRAND_CONFIG.identity.name}{' '}
              Creator workspace.
            </Typography>

            <Stack
              direction="row"
              spacing={2}
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              {[
                [Radio, 'Realtime live controls'],
                [Users, 'Community focused'],
                [ShieldCheck, 'Secure creator access'],
              ].map(([Icon, label]) => {
                const IconComponent = Icon as React.ComponentType<{
                  size?: number;
                }>;
                return (
                  <Box
                    key={label as string}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 1,
                      px: 1.5,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.045)',
                      border: '1px solid rgba(216,227,222,0.10)',
                    }}
                  >
                    <Box
                      sx={{
                        color: BRAND_CONFIG.colors.creator.accent,
                        display: 'flex',
                      }}
                    >
                      <IconComponent size={17} />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(243,250,246,0.78)', fontWeight: 600 }}
                    >
                      {label as string}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <Box>
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.25,
                mb: 3,
              }}
            >
              <Box
                component="img"
                src={getBrandAssetUrl('creator', 'logoMark')}
                alt=""
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: '#fff',
                  borderRadius: 2.5,
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  sx={{ color: '#ffffff', fontWeight: 700 }}
                >
                  {BRAND_CONFIG.identity.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(243,250,246,0.64)' }}
                >
                  {BRAND_CONFIG.products.creator.shortName}
                </Typography>
              </Box>
            </Box>

            <Card
              sx={{
                bgcolor: 'rgba(243,247,245,0.97)',
                borderColor: 'rgba(216,227,222,0.76)',
                boxShadow: '0 28px 80px rgba(0,0,0,0.28)',
                backdropFilter: 'blur(18px)',
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
                <Box sx={{ mb: 3.5 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      color: BRAND_CONFIG.colors.creator.textPrimary,
                      fontWeight: 700,
                      mb: 0.75,
                    }}
                  >
                    Welcome back
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: BRAND_CONFIG.colors.creator.textSecondary }}
                  >
                    Sign in to continue to{' '}
                    {BRAND_CONFIG.products.creator.fullName}.
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}
                {accountCreatedInfo && (
                  <Alert
                    severity="info"
                    onClose={() => setAccountCreatedInfo(false)}
                    sx={{ mb: 3 }}
                  >
                    Creator registrations are managed by{' '}
                    {BRAND_CONFIG.identity.name} Administration. Contact your
                    system administrator for creator access credentials.
                  </Alert>
                )}

                <form
                  onSubmit={(event) => {
                    void handleSignIn(event);
                  }}
                >
                  <Stack spacing={2.5}>
                    <TextField
                      label="Creator Email"
                      type="email"
                      fullWidth
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={BRAND_CONFIG.contacts.creatorLoginExample}
                      required
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Mail size={18} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                    <TextField
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      required
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock size={18} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() =>
                                  setShowPassword((value) => !value)
                                }
                                edge="end"
                                aria-label="toggle password visibility"
                              >
                                {showPassword ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={rememberMe}
                            onChange={(event) =>
                              setRememberMe(event.target.checked)
                            }
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" color="text.secondary">
                            Remember me
                          </Typography>
                        }
                      />
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        underline="hover"
                        onClick={() =>
                          alert(
                            'Password reset assistance is managed by your administrator or support team.',
                          )
                        }
                        sx={{ fontWeight: 600 }}
                      >
                        Forgot password?
                      </Link>
                    </Box>

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      endIcon={<ArrowRight size={18} />}
                      sx={{
                        py: 1.35,
                        color: '#07130d',
                        fontSize: '0.95rem',
                        boxShadow: '0 12px 28px rgba(34,197,94,0.22)',
                      }}
                    >
                      {loading ? 'Authenticating...' : 'Sign In to Studio'}
                    </Button>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: 'center' }}
                    >
                      Don't have a Creator account?{' '}
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => setAccountCreatedInfo(true)}
                        sx={{ fontWeight: 700 }}
                      >
                        Apply for Creator Access
                      </Link>
                    </Typography>
                  </Stack>
                </form>

                <Box
                  sx={{
                    mt: 3.5,
                    pt: 2.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
                  }}
                >
                  {[
                    [ShieldCheck, 'Protected'],
                    [Headphones, 'Live Audio'],
                    [CheckCircle2, 'Creator Ready'],
                  ].map(([Icon, label]) => {
                    const IconComponent = Icon as React.ComponentType<{
                      size?: number;
                    }>;
                    return (
                      <Box
                        key={label as string}
                        sx={{ textAlign: 'center', color: 'text.secondary' }}
                      >
                        <Box
                          sx={{
                            color: 'primary.main',
                            display: 'flex',
                            justifyContent: 'center',
                            mb: 0.5,
                          }}
                        >
                          <IconComponent size={17} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {label as string}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
