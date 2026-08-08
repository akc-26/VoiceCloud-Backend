import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import { useAuthStore, UserRole } from '../store/auth.store';
import { BRAND_CONFIG, getBrandAssetUrl } from '@shared/branding';
import { authService } from '../services/auth.service';
import { useNotificationsStore } from '../store/notifications.store';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const addToast = useNotificationsStore((state) => state.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        p: 2,
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(29, 78, 216, 0.12) 0%, transparent 60%)',
      }}
    >
      <Card
        elevation={0}
        sx={{
          maxWidth: 440,
          width: '100%',
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <CardContent>
          <Box sx={{ textCenter: 'center', textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                backgroundColor: 'primary.light',
                color: 'primary.main',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <Box
                component="img"
                src={getBrandAssetUrl('admin', 'logoMark')}
                alt=""
                sx={{ width: 56, height: 56 }}
              />
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800 }}
              color="text.primary"
            >
              {BRAND_CONFIG.products.admin.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Enter your credentials to access the management portal
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Admin Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              size="medium"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              size="medium"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
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
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <LockOutlinedIcon />
                )
              }
              sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2, fontWeight: 700 }}
            >
              {isLoading ? 'Authenticating...' : 'Sign In To Console'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">
              SYSTEM SECURITY NOTICE
            </Typography>
          </Divider>
          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            sx={{ display: 'block' }}
          >
            Authorized admin personnel only. All access requests and
            administrative actions are strictly logged for audit compliance.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
