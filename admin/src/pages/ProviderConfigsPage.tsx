import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Paper,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import PsychologyIcon from '@mui/icons-material/Psychology';
import MapIcon from '@mui/icons-material/Map';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';
import SpeedIcon from '@mui/icons-material/Speed';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import {
  adminService,
  CreateProviderConfigRequest,
  ProviderConfigData,
  UpdateProviderConfigRequest,
} from '../services/admin.service';
import { useNotificationsStore } from '../store/notifications.store';

const CATEGORIES = [
  { id: 'rtc', label: 'RTC & Audio', icon: <RecordVoiceOverIcon /> },
  { id: 'storage', label: 'Object Storage', icon: <StorageIcon /> },
  { id: 'payment', label: 'Payments', icon: <CreditCardIcon /> },
  { id: 'firebase', label: 'Firebase Push', icon: <NotificationsIcon /> },
  { id: 'email', label: 'Email Engine', icon: <EmailIcon /> },
  { id: 'sms', label: 'SMS Gateway', icon: <SmsIcon /> },
  { id: 'ai', label: 'Generative AI', icon: <PsychologyIcon /> },
  { id: 'maps', label: 'Maps & Geo', icon: <MapIcon /> },

];

const LIVEKIT_CONFIG_TEMPLATE = {
  serverUrl: 'wss://YOUR_PROJECT.livekit.cloud',
  apiKey: 'YOUR_LIVEKIT_API_KEY',
  apiSecret: 'YOUR_LIVEKIT_API_SECRET',
  tokenExpiration: 3600,
};

const DEFAULT_PROVIDER_TYPE: Record<string, string> = {
  rtc: 'livekit',
  storage: 'minio',
  payment: 'razorpay',
  firebase: 'firebase',
  email: 'smtp',
  sms: 'twilio',
  ai: 'gemini',
  maps: 'google_maps',
};

const isMaskedSecretValue = (value: unknown): boolean =>
  typeof value === 'string' && value.includes('••••');

const omitMaskedSecrets = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitMaskedSecrets);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => !isMaskedSecretValue(child))
        .map(([key, child]) => [key, omitMaskedSecrets(child)]),
    );
  }
  return value;
};

const extractApiErrorMessage = (error: any, fallback: string): string => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' && message.trim() ? message : fallback;
};

const isOperationalRtcProvider = (provider: Pick<ProviderConfigData, 'category' | 'providerType'>): boolean =>
  provider.category !== 'rtc' || provider.providerType.trim().toLowerCase() === 'livekit';

export const ProviderConfigsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [providers, setProviders] = useState<ProviderConfigData[]>([]);
  const [healthSummary, setHealthSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('rtc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [selectedProvider, setSelectedProvider] = useState<Partial<ProviderConfigData> | null>(null);
  const [configJson, setConfigJson] = useState<string>('{}');

  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [revealModalOpen, setRevealModalOpen] = useState<boolean>(false);
  const [revealedConfig, setRevealedConfig] = useState<Record<string, any> | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await adminService.getProviderConfigs();
      setProviders(data);
      const summary = await adminService.getProviderHealthSummary();
      setHealthSummary(summary);
    } catch (err) {
      addToast('error', 'Failed to load provider configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (id: string, name: string) => {
    try {
      await adminService.setActiveProviderConfig(id);
      addToast('success', `'${name}' is now active for its category`);
      fetchProviders();
    } catch (error) {
      addToast(
        'error',
        extractApiErrorMessage(
          error,
          'Failed to activate provider profile. LiveKit must pass its connection test first.',
        ),
      );
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    setTestModalOpen(true);
    try {
      const res = await adminService.testProviderConnection(id);
      setTestResult(res);
      fetchProviders();
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Network or execution error during connection test',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenEdit = (provider?: ProviderConfigData) => {
    if (provider) {
      setSelectedProvider(provider);
      const config = { ...(provider.config || {}) } as Record<string, unknown>;
      if (
        provider.category === 'rtc' &&
        provider.providerType.toLowerCase() === 'livekit' &&
        !config.serverUrl &&
        typeof config.host === 'string'
      ) {
        config.serverUrl = config.host;
        delete config.host;
      }
      setConfigJson(JSON.stringify(config, null, 2));
    } else {
      setSelectedProvider({
        category: activeTab,
        providerType: DEFAULT_PROVIDER_TYPE[activeTab] || 'custom',
        name: 'New Custom Provider Profile',
        isEnabled: true,
        isActive: false,
        isSandbox: true,
        priority: 10,
        notes: '',
        tags: ['custom'],
      });
      setConfigJson(
        activeTab === 'rtc'
          ? JSON.stringify(LIVEKIT_CONFIG_TEMPLATE, null, 2)
          : '{\n  "apiKey": "SECRET_KEY_HERE"\n}',
      );
    }
    setEditModalOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!selectedProvider) return;
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(configJson);
      } catch {
        addToast('error', 'Invalid JSON syntax in configuration input');
        return;
      }

      const safeConfig = omitMaskedSecrets(parsedConfig) as Record<string, any>;
      if (
        selectedProvider.category === 'rtc' &&
        selectedProvider.providerType?.trim().toLowerCase() === 'livekit'
      ) {
        const mergedForValidation = parsedConfig as Record<string, any>;
        const serverUrl = String(
          mergedForValidation.serverUrl || mergedForValidation.url || mergedForValidation.wsUrl || mergedForValidation.host || '',
        ).trim();
        const apiKey = String(mergedForValidation.apiKey || mergedForValidation.livekitApiKey || '').trim();
        const apiSecret = String(mergedForValidation.apiSecret || mergedForValidation.livekitApiSecret || mergedForValidation.secret || '').trim();
        const existingHasMaskedSecret = Object.values(mergedForValidation).some(isMaskedSecretValue);
        if (!serverUrl || !apiKey || (!apiSecret && !existingHasMaskedSecret)) {
          addToast('error', 'LiveKit requires Project URL, API Key, and API Secret from the same project.');
          return;
        }
        if (!/^wss?:\/\//i.test(serverUrl)) {
          addToast('error', 'LiveKit Project URL must begin with wss:// (or ws:// for an intentional local server).');
          return;
        }
      }

      if (selectedProvider.id) {
        const payload: UpdateProviderConfigRequest = {
          name: selectedProvider.name,
          config: safeConfig,
          isEnabled: selectedProvider.isEnabled,
          isActive: selectedProvider.isActive,
          isSandbox: selectedProvider.isSandbox,
          priority: selectedProvider.priority,
          notes: selectedProvider.notes,
          tags: selectedProvider.tags,
        };
        await adminService.updateProviderConfig(selectedProvider.id, payload);
        addToast('success', 'Provider profile updated successfully');
      } else {
        const payload: CreateProviderConfigRequest = {
          category: selectedProvider.category || activeTab,
          providerType:
            selectedProvider.providerType || DEFAULT_PROVIDER_TYPE[activeTab] || 'custom',
          name: selectedProvider.name || 'New Custom Provider Profile',
          config: safeConfig,
          isEnabled: selectedProvider.isEnabled,
          isActive: selectedProvider.isActive,
          isSandbox: selectedProvider.isSandbox,
          priority: selectedProvider.priority,
          notes: selectedProvider.notes,
          tags: selectedProvider.tags,
        };
        await adminService.createProviderConfig(payload);
        addToast('success', 'Provider profile created successfully');
      }

      setEditModalOpen(false);
      fetchProviders();
    } catch (err) {
      addToast(
        'error',
        extractApiErrorMessage(err, 'Failed to save provider configuration'),
      );
    }
  };

  const handleRevealSecrets = async (id: string) => {
    try {
      const res = await adminService.revealProviderSecret(id);
      setRevealedConfig(res.config);
      setRevealModalOpen(true);
    } catch {
      addToast('error', 'Failed to reveal credentials');
    }
  };

  const handleOpenHistory = async (id: string) => {
    try {
      const history = await adminService.getProviderHistory(id);
      setHistoryRecords(history);
      setSelectedProvider({ id });
      setHistoryModalOpen(true);
    } catch {
      addToast('error', 'Failed to fetch history audit records');
    }
  };

  const handleRollback = async (historyId: string, version: number) => {
    if (!selectedProvider?.id) return;
    try {
      await adminService.rollbackProviderConfig(selectedProvider.id, historyId);
      addToast('success', `Rolled back configuration to version ${version}`);
      setHistoryModalOpen(false);
      fetchProviders();
    } catch {
      addToast('error', 'Rollback operation failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete profile '${name}'?`)) return;
    try {
      await adminService.deleteProviderConfig(id);
      addToast('success', `Deleted provider profile '${name}'`);
      fetchProviders();
    } catch {
      addToast('error', 'Failed to delete provider profile');
    }
  };

  const filteredProviders = providers.filter((p) => {
    const categoryMatches = p.category === activeTab;
    const searchLower = searchQuery.toLowerCase();
    const textMatches =
      !searchQuery ||
      p.name.toLowerCase().includes(searchLower) ||
      p.providerType.toLowerCase().includes(searchLower) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchLower)));
    return categoryMatches && textMatches;
  });

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Chip size="small" icon={<CheckCircleIcon />} label="Healthy" color="success" />;
      case 'degraded':
        return <Chip size="small" icon={<ErrorIcon />} label="Degraded" color="warning" />;
      case 'unhealthy':
        return <Chip size="small" icon={<ErrorIcon />} label="Unhealthy" color="error" />;
      default:
        return <Chip size="small" icon={<HelpIcon />} label="Not Tested" variant="outlined" />;
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Infrastructure Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }} color="primary">
            Infrastructure Console & Provider Engine
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage RTC, Storage, Payments, Notifications, AI, Email, SMS & Maps with hot runtime switching, AES-256-GCM encrypted secrets, and live connection health monitoring
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchProviders}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenEdit()}
          >
            Add Provider Profile
          </Button>
        </Box>
      </Box>

      {/* Overview Cards */}
      {healthSummary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TOTAL PROFILES</Typography>
              <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800 }}>{healthSummary.total}</Typography>
              <Typography variant="caption" color="primary">Active in runtime</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>HEALTHY SERVICES</Typography>
              <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800 }} color="success.main">
                {healthSummary.healthy}
              </Typography>
              <Typography variant="caption" color="text.secondary">Verified connectivity</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>UNHEALTHY / ISSUES</Typography>
              <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800 }} color="error.main">
                {healthSummary.unhealthy}
              </Typography>
              <Typography variant="caption" color="text.secondary">Require credential check</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ENCRYPTION ENGINE</Typography>
              <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }} color="secondary.main">
                AES-256-GCM
              </Typography>
              <Typography variant="caption" color="text.secondary">Master Secret Hardware Key</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Category Tabs & Search */}
      <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {CATEGORIES.map((cat) => (
            <Tab
              key={cat.id}
              value={cat.id}
              label={cat.label}
              icon={cat.icon}
              iconPosition="start"
              sx={{ fontWeight: 700, minHeight: 60 }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search profiles by name, provider type or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: 400, flexGrow: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Showing {filteredProviders.length} profiles in {activeTab.toUpperCase()}
          </Typography>
        </Box>
      </Paper>

      {/* Profiles Grid */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>Loading provider profiles...</Typography>
        </Box>
      ) : filteredProviders.length === 0 ? (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px border', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary">No provider profiles found for this category</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a new profile configuration to enable third-party integration services
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenEdit()}>
            Add {activeTab.toUpperCase()} Profile
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredProviders.map((p) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={p.id}>
              <Card
                elevation={0}
                sx={{
                  border: '2px solid',
                  borderColor: p.isActive ? 'primary.main' : 'divider',
                  borderRadius: 2.5,
                  position: 'relative',
                  transition: 'all 0.2s',
                  '&:hover': { boxShadow: 3 },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  {/* Top Badges */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      {p.isActive && (
                        <Chip
                          size="small"
                          icon={<StarIcon />}
                          label="ACTIVE PROVIDER"
                          color="primary"
                          sx={{ fontWeight: 800 }}
                        />
                      )}
                      <Chip
                        size="small"
                        label={p.providerType.toUpperCase()}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                      {p.category === 'rtc' && !isOperationalRtcProvider(p) ? (
                        <Chip
                          size="small"
                          label="RUNTIME ADAPTER NOT AVAILABLE"
                          color="warning"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : null}
                      {p.isSandbox ? (
                        <Chip size="small" label="Sandbox" color="warning" variant="outlined" />
                      ) : (
                        <Chip size="small" label="Production" color="info" variant="outlined" />
                      )}
                    </Box>
                    {getHealthBadge(p.healthStatus)}
                  </Box>

                  {/* Profile Title */}
                  <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 800 }}>
                    {p.name}
                  </Typography>

                  {p.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontStyle: 'italic' }}>
                      "{p.notes}"
                    </Typography>
                  )}

                  {/* Health Metrics */}
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SpeedIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Latency:</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 800 }} color={p.lastLatencyMs && p.lastLatencyMs < 200 ? 'success.main' : 'warning.main'}>
                        {p.lastLatencyMs ? `${p.lastLatencyMs} ms` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Last Tested:</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleString() : 'Never'}
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Config Keys Preview */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 700 }}>
                      CONFIGURATION PARAMETERS (MASKED)
                    </Typography>
                    {Object.entries(p.config || {}).map(([key, val]) => (
                      <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.2 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {key}:
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {String(val)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Tags */}
                  {p.tags && p.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                      {p.tags.map((tag) => (
                        <Chip key={tag} label={`#${tag}`} size="small" sx={{ fontSize: '0.65rem' }} />
                      ))}
                    </Box>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {!p.isActive && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleSetActive(p.id, p.name)}
                          disabled={!isOperationalRtcProvider(p)}
                        >
                          {isOperationalRtcProvider(p) ? 'Set Active' : 'Unavailable'}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        color="info"
                        startIcon={<SpeedIcon />}
                        onClick={() => handleTestConnection(p.id)}
                      >
                        Test
                      </Button>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Reveal Decrypted Secrets">
                        <IconButton size="small" onClick={() => handleRevealSecrets(p.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Revision History & Rollback">
                        <IconButton size="small" onClick={() => handleOpenHistory(p.id)}>
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Profile Settings">
                        <IconButton size="small" color="primary" onClick={() => handleOpenEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Profile">
                        <IconButton size="small" color="error" onClick={() => handleDelete(p.id, p.name)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit / Create Profile Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {selectedProvider?.id ? 'Edit Provider Profile' : 'Create New Provider Profile'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Profile Name"
                value={selectedProvider?.name || ''}
                onChange={(e) => setSelectedProvider({ ...selectedProvider, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Provider Type (e.g. agora, s3, stripe, twilio)"
                value={selectedProvider?.providerType || ''}
                onChange={(e) => {
                  const providerType = e.target.value;
                  setSelectedProvider({ ...selectedProvider, providerType });
                  if (!selectedProvider?.id && activeTab === 'rtc') {
                    if (providerType.trim().toLowerCase() === 'livekit') {
                      setConfigJson(JSON.stringify(LIVEKIT_CONFIG_TEMPLATE, null, 2));
                    } else if (providerType.trim().toLowerCase() === 'agora') {
                      setConfigJson(JSON.stringify({ appId: 'AGORA_APP_ID', appCertificate: 'AGORA_APP_CERTIFICATE' }, null, 2));
                    }
                  }
                }}
                disabled={Boolean(selectedProvider?.id)}
                helperText={
                  selectedProvider?.id
                    ? 'Provider type is immutable for an existing profile; create a new profile to change it.'
                    : undefined
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedProvider?.isEnabled ?? true}
                    onChange={(e) => setSelectedProvider({ ...selectedProvider, isEnabled: e.target.checked })}
                  />
                }
                label="Enabled"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedProvider?.isSandbox ?? true}
                    onChange={(e) => setSelectedProvider({ ...selectedProvider, isSandbox: e.target.checked })}
                  />
                }
                label="Sandbox Mode"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Priority Order"
                value={selectedProvider?.priority || 1}
                onChange={(e) => setSelectedProvider({ ...selectedProvider, priority: Number(e.target.value) })}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes / Instructions"
                value={selectedProvider?.notes || ''}
                onChange={(e) => setSelectedProvider({ ...selectedProvider, notes: e.target.value })}
              />
            </Grid>

            <Grid size={12}>
              {selectedProvider?.category === 'rtc' &&
              selectedProvider?.providerType?.trim().toLowerCase() === 'livekit' ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  LiveKit requires a Project URL, API Key, and API Secret from the same LiveKit project.
                  Use <strong>serverUrl</strong> (for example, wss://YOUR_PROJECT.livekit.cloud),
                  <strong> apiKey</strong>, and <strong>apiSecret</strong>. The Test action performs a real
                  RoomService connectivity check before the provider is considered healthy.
                </Alert>
              ) : null}
              {selectedProvider?.category === 'rtc' &&
              selectedProvider?.providerType?.trim().toLowerCase() !== 'livekit' ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This provider profile can be stored for future adapter work, but it cannot be activated for
                  VoiceCloud browser voice rooms in this build. Creator Studio and the consumer website use the
                  operational LiveKit runtime adapter.
                </Alert>
              ) : null}
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Configuration & Credentials (JSON - Auto Encrypted with AES-256-GCM)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                slotProps={{
                  htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.85rem' } },
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProvider}>Save Configuration</Button>
        </DialogActions>
      </Dialog>

      {/* Test Connection Modal */}
      <Dialog open={testModalOpen} onClose={() => setTestModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Live Connection Test</DialogTitle>
        <DialogContent dividers>
          {testingId ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ mt: 2, fontWeight: 600 }}>
                Testing credentials & pinging provider servers...
              </Typography>
            </Box>
          ) : testResult ? (
            <Box sx={{ py: 1 }}>
              <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {testResult.success ? 'CONNECTION SUCCESSFUL' : 'CONNECTION TEST FAILED'}
                </Typography>
                {testResult.message}
              </Alert>

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                TEST METRICS & DETAILS:
              </Typography>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', mt: 1, fontFamily: 'monospace' }}>
                <Typography variant="caption" sx={{ display: 'block' }}>Latency: {testResult.latencyMs} ms</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>Tested At: {new Date(testResult.testedAt).toLocaleString()}</Typography>
                {testResult.details && (
                  <pre style={{ margin: 0, marginTop: 8, fontSize: '0.75rem', overflowX: 'auto' }}>
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </Paper>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reveal Secrets Modal */}
      <Dialog open={revealModalOpen} onClose={() => setRevealModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Decrypted Secrets & Credentials</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Sensitive credentials revealed. This event has been recorded in the system audit log.
          </Alert>
          {revealedConfig && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', fontFamily: 'monospace' }}>
              <pre style={{ margin: 0, fontSize: '0.85rem', overflowX: 'auto' }}>
                {JSON.stringify(revealedConfig, null, 2)}
              </pre>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(revealedConfig, null, 2));
              addToast('info', 'Credentials copied to clipboard');
            }}
          >
            Copy JSON
          </Button>
          <Button variant="contained" onClick={() => setRevealModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Revision History & Rollback Modal */}
      <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Configuration Revision History & Rollback</DialogTitle>
        <DialogContent dividers>
          {historyRecords.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No historical revisions found</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ver</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyRecords.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell><Chip label={`v${h.version}`} size="small" color="primary" /></TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{h.name}</TableCell>
                    <TableCell>{h.changeReason || 'System update'}</TableCell>
                    <TableCell>{new Date(h.createdAt).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRollback(h.id, h.version)}
                      >
                        Restore v{h.version}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
