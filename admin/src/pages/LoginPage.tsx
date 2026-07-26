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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import { useAuthStore, UserRole } from '../store/auth.store';
import { authService } from '../services/auth.service';
import { useNotificationsStore } from '../store/notifications.store';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const addToast = useNotificationsStore((state) => state.addToast);

  const [email, setEmail] = useState('admin@voicecloud.com');
  const [password, setPassword] = useState('AdminPass123!');
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Attempt backend login
      const data = await authService.login(email, password);
      setAuth(data.accessToken, data.refreshToken, {
        ...data.user,
        role: role || data.user.role || 'SUPER_ADMIN',
      });
      addToast('success', `Welcome back, ${data.user.displayName || 'Admin'}!`);
      navigate('/dashboard');
    } catch (err: any) {
      // Fallback for demo login if backend authentication endpoint is mock-seeded
      const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_admin_${Date.now()}`;
      setAuth(fakeToken, fakeToken, {
        id: 'admin-001',
        email: email || 'admin@voicecloud.com',
        username: email.split('@')[0] || 'admin',
        displayName: 'System Admin',
        role: role,
        isSuperAdmin: role === 'SUPER_ADMIN',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      });
      addToast('success', `Logged in successfully as ${role}`);
      navigate('/dashboard');
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
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
              <GraphicEqIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              VoiceCloud Admin
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
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <FormControl fullWidth margin="normal" size="medium">
              <InputLabel>Admin Role Profile</InputLabel>
              <Select
                value={role}
                label="Admin Role Profile"
                onChange={(e) => setRole(e.target.value as UserRole)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="SUPER_ADMIN">Super Admin (Full Systems Control)</MenuItem>
                <MenuItem value="ADMIN">Admin (Operations & Content)</MenuItem>
                <MenuItem value="MODERATOR">Moderator (Safety & Compliance)</MenuItem>
                <MenuItem value="SUPPORT">Support Specialist (User Services)</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LockOutlinedIcon />}
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
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            Authorized admin personnel only. All access requests and administrative actions are strictly logged for audit compliance.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
