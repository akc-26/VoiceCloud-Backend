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

import { adminService, ProviderConfigData } from '../services/admin.service';
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
    } catch {
      addToast('error', 'Failed to activate provider profile');
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
      setConfigJson(JSON.stringify(provider.config || {}, null, 2));
    } else {
      setSelectedProvider({
        category: activeTab,
        providerType: activeTab === 'storage' ? 'minio' : activeTab === 'payment' ? 'razorpay' : 'agora',
        name: 'New Custom Provider Profile',
        isEnabled: true,
        isActive: false,
        isSandbox: true,
        priority: 10,
        notes: '',
        tags: ['custom'],
      });
      setConfigJson('{\n  "apiKey": "SECRET_KEY_HERE"\n}');
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

      const payload = {
        ...selectedProvider,
        config: parsedConfig,
      };

      if (selectedProvider.id) {
        await adminService.updateProviderConfig(selectedProvider.id, payload);
        addToast('success', 'Provider profile updated successfully');
      } else {
        await adminService.createProviderConfig(payload);
        addToast('success', 'Provider profile created successfully');
      }

      setEditModalOpen(false);
      fetchProviders();
    } catch (err) {
      addToast('error', 'Failed to save provider configuration');
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
          <Typography variant="h4" fontWeight={800} color="primary">
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
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL PROFILES</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{healthSummary.total}</Typography>
              <Typography variant="caption" color="primary">Active in runtime</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>HEALTHY SERVICES</Typography>
              <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
                {healthSummary.healthy}
              </Typography>
              <Typography variant="caption" color="text.secondary">Verified connectivity</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>UNHEALTHY / ISSUES</Typography>
              <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mt: 0.5 }}>
                {healthSummary.unhealthy}
              </Typography>
              <Typography variant="caption" color="text.secondary">Require credential check</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>ENCRYPTION ENGINE</Typography>
              <Typography variant="h6" fontWeight={800} color="secondary.main" sx={{ mt: 0.5 }}>
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400, flexGrow: 1 }}
          />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
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
            <Grid item xs={12} md={6} lg={4} key={p.id}>
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
                      {p.isSandbox ? (
                        <Chip size="small" label="Sandbox" color="warning" variant="outlined" />
                      ) : (
                        <Chip size="small" label="Production" color="info" variant="outlined" />
                      )}
                    </Box>
                    {getHealthBadge(p.healthStatus)}
                  </Box>

                  {/* Profile Title */}
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
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
                        <Typography variant="caption" fontWeight={700}>Latency:</Typography>
                      </Box>
                      <Typography variant="caption" fontWeight={800} color={p.lastLatencyMs && p.lastLatencyMs < 200 ? 'success.main' : 'warning.main'}>
                        {p.lastLatencyMs ? `${p.lastLatencyMs} ms` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Last Tested:</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleString() : 'Never'}
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Config Keys Preview */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
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
                        >
                          Set Active
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
        <DialogTitle fontWeight={800}>
          {selectedProvider?.id ? 'Edit Provider Profile' : 'Create New Provider Profile'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Profile Name"
                value={selectedProvider?.name || ''}
                onChange={(e) => setSelectedProvider({ ...selectedProvider, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Provider Type (e.g. agora, s3, stripe, twilio)"
                value={selectedProvider?.providerType || ''}
                onChange={(e) => setSelectedProvider({ ...selectedProvider, providerType: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Priority Order"
                value={selectedProvider?.priority || 1}
                onChange={(e) => setSelectedProvider({ ...selectedProvider, priority: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes / Instructions"
                value={selectedProvider?.notes || ''}
                onChange={(e) => setSelectedProvider({ ...selectedProvider, notes: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Configuration & Credentials (JSON - Auto Encrypted with AES-256-GCM)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
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
        <DialogTitle fontWeight={800}>Live Connection Test</DialogTitle>
        <DialogContent dividers>
          {testingId ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ mt: 2 }} fontWeight={600}>
                Testing credentials & pinging provider servers...
              </Typography>
            </Box>
          ) : testResult ? (
            <Box sx={{ py: 1 }}>
              <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={800}>
                  {testResult.success ? 'CONNECTION SUCCESSFUL' : 'CONNECTION TEST FAILED'}
                </Typography>
                {testResult.message}
              </Alert>

              <Typography variant="caption" fontWeight={700} color="text.secondary">
                TEST METRICS & DETAILS:
              </Typography>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', mt: 1, fontFamily: 'monospace' }}>
                <Typography variant="caption" display="block">Latency: {testResult.latencyMs} ms</Typography>
                <Typography variant="caption" display="block">Tested At: {new Date(testResult.testedAt).toLocaleString()}</Typography>
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
        <DialogTitle fontWeight={800}>Decrypted Secrets & Credentials</DialogTitle>
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
        <DialogTitle fontWeight={800}>Configuration Revision History & Rollback</DialogTitle>
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
                    <TableCell fontWeight={600}>{h.name}</TableCell>
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
