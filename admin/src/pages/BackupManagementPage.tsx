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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormGroup,
} from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VerifiedIcon from '@mui/icons-material/Verified';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import UsbIcon from '@mui/icons-material/Usb';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SpeedIcon from '@mui/icons-material/Speed';
import HistoryIcon from '@mui/icons-material/History';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';

import { adminService } from '../services/admin.service';
import { useNotificationsStore } from '../store/notifications.store';

export const BackupManagementPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Data states
  const [backups, setBackups] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [restoreHistory, setRestoreHistory] = useState<any[]>([]);
  const [drStatus, setDrStatus] = useState<any>(null);

  // Modals state
  const [createBackupOpen, setCreateBackupOpen] = useState<boolean>(false);
  const [newBackupDto, setNewBackupDto] = useState({
    name: '',
    type: 'MANUAL',
    components: ['database', 'redis', 'storage', 'config', 'ssl'],
    storageLocation: 'local',
    isEncrypted: true,
    notes: 'Platform snapshot created via Admin Console',
  });

  const [restoreModalOpen, setRestoreModalOpen] = useState<boolean>(false);
  const [restorePreview, setRestorePreview] = useState<any>(null);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any>(null);
  const [restoreTargetComponents, setRestoreTargetComponents] = useState<string[]>(['database', 'redis', 'storage', 'config']);
  const [autoRollback, setAutoRollback] = useState<boolean>(true);
  const [restoring, setRestoring] = useState<boolean>(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [scheduleDto, setScheduleDto] = useState({
    name: 'Nightly Database & Config Backup',
    frequency: 'DAILY',
    cronExpression: '0 2 * * *',
    isEnabled: true,
    components: ['database', 'redis', 'storage', 'config', 'ssl'],
    retentionDays: 30,
    maxBackupCount: 10,
    targetStorage: 'local',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const bList = await adminService.getBackups();
      setBackups(bList);

      const sList = await adminService.getBackupSchedules();
      setSchedules(sList);

      const rHistory = await adminService.getRestoreHistory();
      setRestoreHistory(rHistory);

      const dr = await adminService.getDisasterRecoveryStatus();
      setDrStatus(dr);
    } catch {
      addToast('error', 'Failed to load backup & disaster recovery data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await adminService.createBackup(newBackupDto);
      addToast('success', 'Backup created and verified successfully');
      setCreateBackupOpen(false);
      fetchAllData();
    } catch (err: any) {
      addToast('error', `Backup failed: ${err.message || 'Error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBackup = async (id: string, name: string) => {
    try {
      const res = await adminService.verifyBackup(id);
      addToast('success', `Verified checksum and integrity for '${name}'`);
      fetchAllData();
    } catch {
      addToast('error', 'Verification scan failed');
    }
  };

  const handleDeleteBackup = async (id: string, name: string) => {
    if (!window.confirm(`Delete backup archive '${name}' permanently?`)) return;
    try {
      await adminService.deleteBackup(id);
      addToast('success', `Deleted backup '${name}'`);
      fetchAllData();
    } catch {
      addToast('error', 'Failed to delete backup archive');
    }
  };

  const handleOpenRestorePreview = async (backup: any) => {
    setSelectedBackupForRestore(backup);
    setRestorePreview(null);
    setRestoreModalOpen(true);
    try {
      const preview = await adminService.getRestorePreview(backup.id);
      setRestorePreview(preview);
    } catch {
      addToast('error', 'Failed to generate restore preview');
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    setRestoring(true);
    try {
      await adminService.restoreBackup({
        backupId: selectedBackupForRestore.id,
        targetComponents: restoreTargetComponents,
        autoRollback,
      });
      addToast('success', 'Platform restoration completed successfully');
      setRestoreModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      addToast('error', `Restore failed: ${err.message || 'Error'}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      await adminService.createBackupSchedule(scheduleDto);
      addToast('success', 'Backup schedule policy created');
      setScheduleModalOpen(false);
      fetchAllData();
    } catch {
      addToast('error', 'Failed to save schedule policy');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await adminService.deleteBackupSchedule(id);
      addToast('success', 'Schedule policy deleted');
      fetchAllData();
    } catch {
      addToast('error', 'Failed to delete schedule');
    }
  };

  const handlePurgeRetention = async () => {
    try {
      const res = await adminService.purgeRetention();
      addToast('info', `Retention cleanup purged ${res.deletedCount} expired backups`);
      fetchAllData();
    } catch {
      addToast('error', 'Failed to execute retention purge');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Infrastructure Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary">
            Infrastructure Backup & Disaster Recovery
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Full platform snapshotting, DB table export, Redis state caching, AES-256 encrypted archives, and automated disaster recovery
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAllData} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outlined" color="warning" startIcon={<CleaningServicesIcon />} onClick={handlePurgeRetention}>
            Retention Cleanup
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateBackupOpen(true)}>
            Create Backup Now
          </Button>
        </Box>
      </Box>

      {/* Disaster Recovery Status Summary Cards */}
      {drStatus && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>DR READINESS SCORE</Typography>
                <Chip label={drStatus.status} color={drStatus.status === 'EXCELLENT' ? 'success' : 'warning'} size="small" />
              </Box>
              <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
                {drStatus.readinessScore}%
              </Typography>
              <LinearProgress variant="determinate" value={drStatus.readinessScore} sx={{ mt: 1, borderRadius: 1 }} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>RECOVERY POINT (RPO)</Typography>
              <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
                {drStatus.rpoHours < 900 ? `${drStatus.rpoHours} hrs` : 'No Backup'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Target: &lt; 24 hrs data loss window</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>EST. RECOVERY TIME (RTO)</Typography>
              <Typography variant="h4" fontWeight={800} color="info.main" sx={{ mt: 0.5 }}>
                {drStatus.rtoMinutes} mins
              </Typography>
              <Typography variant="caption" color="text.secondary">Automated container restore</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>HARDWARE / PI DRIVE</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <UsbIcon color={drStatus.components.raspberryPiHardware.externalDriveConnected ? 'success' : 'action'} />
                <Typography variant="h6" fontWeight={800}>
                  {drStatus.components.raspberryPiHardware.externalDriveConnected ? 'External Drive' : 'Local Storage'}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {drStatus.components.raspberryPiHardware.isRaspberryPiDetected ? 'Raspberry Pi Optimized' : 'Standard VPS / Cloud'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab icon={<BackupIcon />} iconPosition="start" label={`Backups (${backups.length})`} sx={{ fontWeight: 700 }} />
          <Tab icon={<RestoreIcon />} iconPosition="start" label="Restore Engine & History" sx={{ fontWeight: 700 }} />
          <Tab icon={<ScheduleIcon />} iconPosition="start" label={`Schedules (${schedules.length})`} sx={{ fontWeight: 700 }} />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Disaster Recovery Readiness" sx={{ fontWeight: 700 }} />
        </Tabs>

        {/* Tab 0: Backups List */}
        {activeTab === 0 && (
          <Box sx={{ p: 2 }}>
            {backups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <FolderZipIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">No infrastructure backups created yet</Typography>
                <Button variant="contained" sx={{ mt: 2 }} startIcon={<AddIcon />} onClick={() => setCreateBackupOpen(true)}>
                  Create First Backup
                </Button>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Backup Name & Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Size (Comp / Orig)</TableCell>
                    <TableCell>Compression</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={800}>{b.name}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          <Chip label={b.type} size="small" variant="outlined" />
                          {b.isEncrypted && <Chip label="AES-256" size="small" color="secondary" />}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {b.status === 'VERIFIED' ? (
                          <Chip icon={<VerifiedIcon />} label="VERIFIED" color="success" size="small" />
                        ) : b.status === 'COMPLETED' ? (
                          <Chip icon={<CheckCircleIcon />} label="COMPLETED" color="info" size="small" />
                        ) : (
                          <Chip icon={<ErrorIcon />} label={b.status} color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{formatBytes(b.fileSizeCompressed)}</Typography>
                        <Typography variant="caption" color="text.secondary">Orig: {formatBytes(b.fileSizeOriginal)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {b.compressionRatio ? `${Math.round((1 - b.compressionRatio) * 100)}% saved` : '1:1'}
                        </Typography>
                      </TableCell>
                      <TableCell>{b.durationMs ? `${b.durationMs} ms` : 'N/A'}</TableCell>
                      <TableCell>{new Date(b.createdAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title="Verify Integrity & Checksum">
                            <IconButton size="small" color="info" onClick={() => handleVerifyBackup(b.id, b.name)}>
                              <VerifiedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Restore Platform to this Backup">
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<RestoreIcon />}
                              onClick={() => handleOpenRestorePreview(b)}
                            >
                              Restore
                            </Button>
                          </Tooltip>
                          <Tooltip title="Delete Backup Archive">
                            <IconButton size="small" color="error" onClick={() => handleDeleteBackup(b.id, b.name)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* Tab 1: Restore Engine */}
        {activeTab === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
              Platform Restore Log & Rollback History
            </Typography>
            {restoreHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No restore operations executed yet</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Restore ID & Operator</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Target Components</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {restoreHistory.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{r.id}</Typography>
                        <Typography variant="caption" color="text.secondary">Operator: {r.operatorId || 'SYSTEM'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status}
                          color={r.status === 'COMPLETED' ? 'success' : r.status === 'ROLLED_BACK' ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {(r.targetComponents || []).map((c: string) => (
                          <Chip key={c} label={c} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </TableCell>
                      <TableCell>{r.durationMs} ms</TableCell>
                      <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* Tab 2: Schedules */}
        {activeTab === 2 && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>Automated Backup Schedule Policies</Typography>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setScheduleModalOpen(true)}>
                Add Schedule Policy
              </Button>
            </Box>
            {schedules.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No schedule policies defined</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Policy Name</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Retention Days</TableCell>
                    <TableCell>Max Count</TableCell>
                    <TableCell>Next Run</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell fontWeight={700}>{s.name}</TableCell>
                      <TableCell><Chip label={s.frequency} color="primary" size="small" /></TableCell>
                      <TableCell>{s.retentionDays} days</TableCell>
                      <TableCell>{s.maxBackupCount} backups</TableCell>
                      <TableCell>{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : 'N/A'}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => handleDeleteSchedule(s.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* Tab 3: Disaster Recovery Readiness */}
        {activeTab === 3 && drStatus && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
              Disaster Recovery Scenario Matrix & Readiness Checks
            </Typography>
            <Grid container spacing={2}>
              {drStatus.disasterScenarios.map((sc: any, idx: number) => (
                <Grid item xs={12} md={6} key={idx}>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={800}>{sc.scenario}</Typography>
                      <Chip label={`Risk: ${sc.riskLevel}`} color={sc.riskLevel === 'LOW' ? 'success' : 'warning'} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {sc.mitigationStrategy}
                    </Typography>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Automated Recovery Verified"
                      color="info"
                      variant="outlined"
                      size="small"
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Create Backup Modal */}
      <Dialog open={createBackupOpen} onClose={() => setCreateBackupOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={800}>Create Manual / Emergency Backup</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Backup Name (Optional)"
              placeholder="e.g. Pre_Deployment_Snapshot_15.1"
              value={newBackupDto.name}
              onChange={(e) => setNewBackupDto({ ...newBackupDto, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Backup Type</InputLabel>
              <Select
                value={newBackupDto.type}
                label="Backup Type"
                onChange={(e) => setNewBackupDto({ ...newBackupDto, type: e.target.value })}
              >
                <MenuItem value="FULL">Full Platform Backup</MenuItem>
                <MenuItem value="MANUAL">Manual Snapshot</MenuItem>
                <MenuItem value="EMERGENCY">Emergency Snapshot</MenuItem>
                <MenuItem value="PRE_UPGRADE">Pre-Upgrade Safety Snapshot</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={newBackupDto.isEncrypted}
                  onChange={(e) => setNewBackupDto({ ...newBackupDto, isEncrypted: e.target.checked })}
                />
              }
              label="Encrypt Archive with Hardware AES-256-GCM"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateBackupOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBackup} disabled={loading}>
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Preview & Confirmation Modal */}
      <Dialog open={restoreModalOpen} onClose={() => setRestoreModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={800}>Restore Platform Snapshot</DialogTitle>
        <DialogContent dividers>
          {selectedBackupForRestore && (
            <Box sx={{ py: 1 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Restoring will update database records and physical configurations to the state captured in '{selectedBackupForRestore.name}'.
              </Alert>

              {restorePreview ? (
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800}>RESTORE PREVIEW METRICS:</Typography>
                  <Typography variant="body2">Archive Entries: {restorePreview.totalFiles} files</Typography>
                  <Typography variant="body2">Database Tables Affected: {restorePreview.dbTablesAffected.join(', ')}</Typography>
                  <Typography variant="body2">Estimated Time: {restorePreview.estimatedTimeMs} ms</Typography>
                </Paper>
              ) : (
                <CircularProgress size={30} />
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={autoRollback}
                    onChange={(e) => setAutoRollback(e.target.checked)}
                  />
                }
                label="Automatic Rollback Protection (Creates Emergency Snapshot Before Restoring)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleExecuteRestore} disabled={restoring}>
            {restoring ? 'Restoring Platform...' : 'Confirm & Restore Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Schedule Modal */}
      <Dialog open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={800}>Create Backup Schedule Policy</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Policy Name"
              value={scheduleDto.name}
              onChange={(e) => setScheduleDto({ ...scheduleDto, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={scheduleDto.frequency}
                label="Frequency"
                onChange={(e) => setScheduleDto({ ...scheduleDto, frequency: e.target.value })}
              >
                <MenuItem value="DAILY">Daily</MenuItem>
                <MenuItem value="WEEKLY">Weekly</MenuItem>
                <MenuItem value="MONTHLY">Monthly</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Retention (Days)"
              value={scheduleDto.retentionDays}
              onChange={(e) => setScheduleDto({ ...scheduleDto, retentionDays: Number(e.target.value) })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSchedule}>Save Policy</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
