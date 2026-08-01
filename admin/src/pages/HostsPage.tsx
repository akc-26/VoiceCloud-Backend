import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import VerifiedIcon from '@mui/icons-material/Verified';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import HistoryIcon from '@mui/icons-material/History';
import StarsIcon from '@mui/icons-material/Stars';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { useNotificationsStore } from '../store/notifications.store';
import {
  hostsAdminService,
  HostProfileData,
  HostEarningsData,
  HostAuditNoteData,
} from '../services/hosts.service';

export const HostsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [activeTab, setActiveTab] = useState(0);

  const [applications, setApplications] = useState<HostProfileData[]>([]);
  const [activeHosts, setActiveHosts] = useState<HostProfileData[]>([]);
  const [topHosts, setTopHosts] = useState<HostProfileData[]>([]);
  const [earningsData, setEarningsData] = useState<HostEarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog States
  const [rejectDialogHost, setRejectDialogHost] = useState<HostProfileData | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [auditDialogHost, setAuditDialogHost] = useState<HostProfileData | null>(null);
  const [auditHistory, setAuditHistory] = useState<HostAuditNoteData[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  const [rewardDialogHost, setRewardDialogHost] = useState<HostProfileData | null>(null);
  const [rewardName, setRewardName] = useState('Top Host Bonus');
  const [rewardAmount, setRewardAmount] = useState('1000');

  const [settlementDialog, setSettlementDialog] = useState<{
    hostProfileId: string;
    amount: number;
  } | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsData, activeData, earnings, top] = await Promise.all([
        hostsAdminService.getApplications('PENDING'),
        hostsAdminService.getApplications(),
        hostsAdminService.getEarningsOverview().catch(() => null),
        hostsAdminService.getTopHosts(10).catch(() => null),
      ]);
      setApplications(appsData || []);
      setActiveHosts((activeData || []).filter((h) => h.status !== 'PENDING'));
      setEarningsData(earnings);
      setTopHosts(top || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to connect to host management services.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleApprove = async (host: HostProfileData) => {
    try {
      await hostsAdminService.approveHost(host.id);
      addToast('success', `Approved host application for @${host.realName}`);
      fetchAllData();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Approval failed');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialogHost) return;
    try {
      await hostsAdminService.rejectHost(
        rejectDialogHost.id,
        rejectionReason || 'Rejected by compliance',
      );
      addToast('success', `Rejected application for @${rejectDialogHost.realName}`);
      setRejectDialogHost(null);
      setRejectionReason('');
      fetchAllData();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Rejection failed');
    }
  };

  const handleSuspendToggle = async (host: HostProfileData) => {
    try {
      if (host.status === 'SUSPENDED') {
        await hostsAdminService.reactivateHost(host.id);
        addToast('success', `Reactivated host @${host.realName}`);
      } else {
        await hostsAdminService.suspendHost(host.id);
        addToast('success', `Suspended host @${host.realName}`);
      }
      fetchAllData();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Status update failed');
    }
  };

  const handleOpenAuditHistory = async (host: HostProfileData) => {
    setAuditDialogHost(host);
    try {
      const history = await hostsAdminService.getAuditHistory(host.id);
      setAuditHistory(history || []);
    } catch {
      setAuditHistory([]);
    }
  };

  const handleAddAuditNote = async () => {
    if (!auditDialogHost || !newNoteText.trim()) return;
    try {
      await hostsAdminService.addAuditNote(auditDialogHost.id, newNoteText.trim());
      addToast('success', 'Audit note added successfully');
      setNewNoteText('');
      const history = await hostsAdminService.getAuditHistory(auditDialogHost.id);
      setAuditHistory(history || []);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to add note');
    }
  };

  const handleGrantReward = async () => {
    if (!rewardDialogHost) return;
    try {
      await hostsAdminService.grantReward(
        rewardDialogHost.id,
        rewardName,
        Number(rewardAmount) || 1000,
      );
      addToast('success', `Granted ${rewardAmount} Diamond reward to @${rewardDialogHost.realName}`);
      setRewardDialogHost(null);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to grant reward');
    }
  };

  const handleCompleteSettlement = async () => {
    if (!settlementDialog) return;
    try {
      await hostsAdminService.completeSettlement(
        settlementDialog.hostProfileId,
        settlementDialog.amount,
      );
      addToast('success', `Completed settlement payout of $${settlementDialog.amount.toFixed(2)}`);
      setSettlementDialog(null);
      fetchEarnings();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Settlement failed');
    }
  };

  // Application Columns
  const applicationColumns: Column<HostProfileData>[] = [
    {
      id: 'realName',
      label: 'Applicant Name',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RecordVoiceOverIcon color="primary" />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.realName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {row.idNumber}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'country', label: 'Country', render: (row) => row.country || 'N/A' },
    {
      id: 'languages',
      label: 'Languages',
      render: (row) => (row.languages || []).join(', ') || 'N/A',
    },
    {
      id: 'categories',
      label: 'Categories',
      render: (row) => (row.categories || []).join(', ') || 'General',
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status.toLowerCase()} />,
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleApprove(row)}
          >
            Approve
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => setRejectDialogHost(row)}
          >
            Reject
          </Button>
          <IconButton
            size="small"
            color="info"
            onClick={() => handleOpenAuditHistory(row)}
            title="Audit History"
          >
            <HistoryIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Active Host Columns
  const activeHostColumns: Column<HostProfileData>[] = [
    {
      id: 'realName',
      label: 'Host Name',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RecordVoiceOverIcon color="primary" />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.realName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              User ID: {row.userId}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'hostLevel',
      label: 'Host Level',
      render: (row) => (
        <Chip
          label={`Lvl ${row.hostLevel}`}
          color="primary"
          size="small"
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    {
      id: 'xp',
      label: 'XP',
      render: (row) => `${(row.xp || 0).toLocaleString()} XP`,
    },
    {
      id: 'performanceScore',
      label: 'Performance Score',
      render: (row) => `${Number(row.performanceScore || 0).toFixed(1)} / 100`,
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status.toLowerCase()} />,
    },
    {
      id: 'actions',
      label: 'Management',
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="outlined"
            color={row.status === 'SUSPENDED' ? 'success' : 'warning'}
            startIcon={<BlockIcon />}
            onClick={() => handleSuspendToggle(row)}
          >
            {row.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
          </Button>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => setRewardDialogHost(row)}
            title="Grant Bonus Reward"
          >
            <StarsIcon />
          </IconButton>
          <IconButton
            size="small"
            color="info"
            onClick={() => handleOpenAuditHistory(row)}
            title="Audit Notes"
          >
            <HistoryIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Host Management & Verification Platform
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Phase 25: Manage host applications, identity verification, levels, earnings settlements, and performance tools
        </Typography>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Pending Applications
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.main', mt: 0.5 }}>
                {applications.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Active Verified Hosts
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}>
                {activeHosts.filter((h) => h.status === 'APPROVED').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Pending Settlements
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'info.main', mt: 0.5 }}>
                ${(earningsData?.totalPendingSettlements || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Lifetime Earnings
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                ${(earningsData?.totalLifetimeEarnings || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error ? (
        <ErrorState
          title="Failed to Load Host Management Data"
          message={error}
          onRetry={fetchAllData}
        />
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
              <Tab label={`Applications Queue (${applications.length})`} icon={<VerifiedIcon />} iconPosition="start" />
              <Tab label={`Verified Hosts (${activeHosts.length})`} icon={<RecordVoiceOverIcon />} iconPosition="start" />
              <Tab label="Earnings & Settlements" icon={<AttachMoneyIcon />} iconPosition="start" />
              <Tab label="Top Hosts Leaderboard" icon={<LeaderboardIcon />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Tab 0: Verification Applications */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Verification Applications Queue
              </Typography>
              {applications.length > 0 ? (
                <DataTable columns={applicationColumns} rows={applications} loading={loading} />
              ) : (
                <EmptyState
                  title="No Applications Pending"
                  description="There are currently no host verification applications waiting in the compliance queue."
                />
              )}
            </Box>
          )}

          {/* Tab 1: Verified Hosts */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Active & Suspended Host Directory
              </Typography>
              {activeHosts.length > 0 ? (
                <DataTable columns={activeHostColumns} rows={activeHosts} loading={loading} />
              ) : (
                <EmptyState
                  title="No Hosts Found"
                  description="No active or suspended host profiles currently exist in the database."
                />
              )}
            </Box>
          )}

          {/* Tab 2: Earnings & Settlements */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Host Earnings & Settlement Withdrawals Overview
              </Typography>
              {earningsData?.earningsList && earningsData.earningsList.length > 0 ? (
                <DataTable
                  columns={[
                    { id: 'hostProfileId', label: 'Host ID', render: (row) => row.hostProfileId },
                    { id: 'userId', label: 'User ID', render: (row) => row.userId },
                    {
                      id: 'lifetimeEarnings',
                      label: 'Lifetime Earnings',
                      render: (row) => `$${Number(row.lifetimeEarnings).toFixed(2)}`,
                    },
                    {
                      id: 'pendingSettlements',
                      label: 'Pending Settlement',
                      render: (row) => `$${Number(row.pendingSettlements).toFixed(2)}`,
                    },
                    {
                      id: 'completedSettlements',
                      label: 'Completed Settlement',
                      render: (row) => `$${Number(row.completedSettlements).toFixed(2)}`,
                    },
                    {
                      id: 'actions',
                      label: 'Actions',
                      align: 'right',
                      render: (row) =>
                        Number(row.pendingSettlements) > 0 ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() =>
                              setSettlementDialog({
                                hostProfileId: row.hostProfileId,
                                amount: Number(row.pendingSettlements),
                              })
                            }
                          >
                            Complete Payout
                          </Button>
                        ) : (
                          <Chip label="Settled" color="default" size="small" />
                        ),
                    },
                  ]}
                  rows={earningsData.earningsList}
                />
              ) : (
                <EmptyState
                  title="No Earnings Records"
                  description="No host earnings or settlement withdrawal records recorded yet."
                />
              )}
            </Box>
          )}

          {/* Tab 3: Top Hosts Leaderboard */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Top Performing Hosts Leaderboard
              </Typography>
              {topHosts.length > 0 ? (
                <DataTable
                  columns={[
                    {
                      id: 'realName',
                      label: 'Host Name',
                      render: (row) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StarsIcon color="warning" />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {row.realName}
                          </Typography>
                        </Box>
                      ),
                    },
                    { id: 'hostLevel', label: 'Level', render: (row) => `Lvl ${row.hostLevel}` },
                    { id: 'xp', label: 'Total XP', render: (row) => (row.xp || 0).toLocaleString() },
                    {
                      id: 'performanceScore',
                      label: 'Performance Score',
                      render: (row) => `${Number(row.performanceScore || 0).toFixed(1)} / 100`,
                    },
                    {
                      id: 'hostRating',
                      label: 'Rating',
                      render: (row) =>
                        row.hostRating != null && Number(row.hostRating) > 0
                          ? `⭐ ${Number(row.hostRating).toFixed(1)}`
                          : 'N/A',
                    },
                    {
                      id: 'followersCount',
                      label: 'Followers',
                      render: (row) => (row.followersCount || 0).toLocaleString(),
                    },
                  ]}
                  rows={topHosts}
                />
              ) : (
                <EmptyState
                  title="No Top Hosts"
                  description="No host performance metrics available for the leaderboard yet."
                />
              )}
            </Box>
          )}
        </>
      )}

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectDialogHost} onClose={() => setRejectDialogHost(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Host Verification Application</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Provide a clear compliance reason for rejecting @{rejectDialogHost?.realName}:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogHost(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRejectConfirm}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit History & Notes Dialog */}
      <Dialog open={!!auditDialogHost} onClose={() => setAuditDialogHost(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Audit History & Notes: @{auditDialogHost?.realName}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              Add New Internal Audit Note:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter audit note details..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
              />
              <Button variant="contained" startIcon={<NoteAddIcon />} onClick={handleAddAuditNote}>
                Add
              </Button>
            </Box>
          </Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            Audit Logs:
          </Typography>
          {auditHistory.length > 0 ? (
            auditHistory.map((item) => (
              <Card key={item.id} variant="outlined" sx={{ mb: 1, p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Chip label={item.action} size="small" color="primary" />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2">{item.note}</Typography>
              </Card>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No audit logs recorded yet for this host.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditDialogHost(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Grant Bonus Reward Dialog */}
      <Dialog open={!!rewardDialogHost} onClose={() => setRewardDialogHost(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Grant Performance Reward</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Reward Campaign Name"
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Reward Diamond Amount"
            type="number"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRewardDialogHost(null)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleGrantReward}>
            Grant Reward
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settlement Payout Confirmation Dialog */}
      <Dialog open={!!settlementDialog} onClose={() => setSettlementDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Settlement Withdrawal</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to mark the pending settlement payout of{' '}
            <strong>${settlementDialog?.amount.toFixed(2)}</strong> as completed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlementDialog(null)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleCompleteSettlement}>
            Complete Settlement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
