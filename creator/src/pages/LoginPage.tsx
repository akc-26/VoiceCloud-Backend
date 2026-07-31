import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Link,
  InputAdornment,
  IconButton,
  Alert,
  Paper,
  Chip,
  Container,
} from '@mui/material';
import {
  Radio,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = email.trim();
    if (!identifier || !password) {
      setError('Please enter both email/username and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = identifier.includes('@')
        ? { email: identifier, password }
        : { username: identifier, password };

      const authResponse = await CreatorApiService.getInstance().login(payload);
      setAuthResponse(authResponse);
      setLoading(false);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setLoading(false);
      setError(
        err.message || 'Authentication failed. Please check your credentials.'
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 1) 70%)'
            : 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.08) 0%, rgba(248, 250, 252, 1) 70%)',
        py: 6,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        {/* VoiceCloud Branding Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              mb: 2,
            }}
          >
            <Radio size={30} />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              mb: 0.5,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            VoiceCloud
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
            Creator Studio Portal
          </Typography>
          <Chip
            icon={<Sparkles size={14} />}
            label="VC-PH04A.2 Authentication Entry"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mt: 1.5, fontSize: '0.75rem', fontWeight: 600 }}
          />
        </Box>

        {/* Login Card */}
        <Card
          elevation={6}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Creator Sign In
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your credentials to access live rooms, analytics, and earnings.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {accountCreatedInfo && (
              <Alert
                severity="info"
                onClose={() => setAccountCreatedInfo(false)}
                sx={{ mb: 3, borderRadius: 2 }}
              >
                Creator registrations are managed by VoiceCloud Administration. Contact your system administrator for creator access credentials.
              </Alert>
            )}

            <form onSubmit={handleSignIn}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Creator Email / Username"
                  type="text"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@voicecloud.app"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={18} />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                />

                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={18} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        color="primary"
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" color="text.secondary">
                        Remember Me
                      </Typography>
                    }
                  />

                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    color="primary"
                    underline="hover"
                    onClick={() =>
                      alert('Password reset link has been dispatched to your registered creator email.')
                    }
                    sx={{ fontWeight: 600 }}
                  >
                    Forgot Password?
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
                    py: 1.5,
                    borderRadius: 2.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {loading ? 'Authenticating...' : 'Sign In to Studio'}
                </Button>

                {/* Account Creation Placeholder */}
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Don't have a Creator account?{' '}
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      underline="hover"
                      color="primary"
                      onClick={() => setAccountCreatedInfo(true)}
                      sx={{ fontWeight: 700 }}
                    >
                      Apply for Creator Access
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Feature Badges & Info Footnote */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2.5,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldCheck size={16} color="#10b981" />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Secure Session Guard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Headphones size={16} color="#6366f1" />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              HD Audio Streaming Studio
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle2 size={16} color="#8b5cf6" />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              VoiceCloud VC-PH04A.2
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
