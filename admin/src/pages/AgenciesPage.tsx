import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import PaymentsIcon from '@mui/icons-material/Payments';
import GroupIcon from '@mui/icons-material/Group';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';

interface AgencyItem {
  id: string;
  name: string;
  owner: string;
  country: string;
  legalName: string;
  taxId: string;
  totalHosts: number;
  activeHosts: number;
  monthlyRevenue: number;
  commissionRate: number;
  isVerified: boolean;
  featured: boolean;
  status: string;
}

interface ApplicationItem {
  id: string;
  agencyName: string;
  legalName: string;
  ownerId: string;
  taxId: string;
  businessRegistrationNumber: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  submittedAt: string;
}

interface SettlementItem {
  id: string;
  agencyId: string;
  agencyName: string;
  period: string;
  grossRevenue: number;
  agencyCommission: number;
  creatorEarnings: number;
  platformFee: number;
  status: string;
}

interface AuditLogItem {
  id: string;
  agencyId: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export const AgenciesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  // Agency Directory State
  const [agencies, setAgencies] = useState<AgencyItem[]>([
    {
      id: 'agency-1',
      name: 'Star Media Agency',
      owner: 'victoria_ceo',
      country: 'United States',
      legalName: 'Star Media LLC',
      taxId: 'TAX-998822',
      totalHosts: 28,
      activeHosts: 22,
      monthlyRevenue: 14500,
      commissionRate: 15,
      isVerified: true,
      featured: true,
      status: 'active',
    },
    {
      id: 'agency-2',
      name: 'Apex Talent Guild',
      owner: 'marcus_g',
      country: 'United Kingdom',
      legalName: 'Apex Guild Ltd',
      taxId: 'GB-881100',
      totalHosts: 15,
      activeHosts: 11,
      monthlyRevenue: 8200,
      commissionRate: 12,
      isVerified: true,
      featured: false,
      status: 'active',
    },
    {
      id: 'agency-3',
      name: 'Luna Voice Studios',
      owner: 'elena_host',
      country: 'Canada',
      legalName: 'Luna Audio Inc',
      taxId: 'CA-554411',
      totalHosts: 8,
      activeHosts: 4,
      monthlyRevenue: 3400,
      commissionRate: 10,
      isVerified: false,
      featured: false,
      status: 'pending_verification',
    },
  ]);

  // Applications State
  const [applications, setApplications] = useState<ApplicationItem[]>([
    {
      id: 'app-101',
      agencyName: 'Aura Broadcast Talent',
      legalName: 'Aura Global Media LLC',
      ownerId: 'user_aura_boss',
      taxId: 'US-99112233',
      businessRegistrationNumber: 'REG-2026-90',
      country: 'United States',
      contactEmail: 'admin@aurabroadcast.com',
      contactPhone: '+1-555-8822',
      status: 'pending',
      submittedAt: '2026-07-28 14:30',
    },
  ]);

  // Settlements State
  const [settlements, setSettlements] = useState<SettlementItem[]>([
    {
      id: 'set-1',
      agencyId: 'agency-1',
      agencyName: 'Star Media Agency',
      period: '2026-07',
      grossRevenue: 14500,
      agencyCommission: 2175,
      creatorEarnings: 9425,
      platformFee: 2900,
      status: 'pending',
    },
    {
      id: 'set-2',
      agencyId: 'agency-2',
      agencyName: 'Apex Talent Guild',
      period: '2026-07',
      grossRevenue: 8200,
      agencyCommission: 984,
      creatorEarnings: 5576,
      platformFee: 1640,
      status: 'completed',
    },
  ]);

  // Audit Logs State
  const [auditLogs] = useState<AuditLogItem[]>([
    {
      id: 'log-1',
      agencyId: 'agency-1',
      action: 'AGENCY_APPLICATION_APPROVED',
      performedBy: 'admin_super',
      details: '{"applicationId":"app-100","verified":true}',
      timestamp: '2026-07-28 10:15',
    },
    {
      id: 'log-2',
      agencyId: 'agency-1',
      action: 'SETTLEMENT_CALCULATED',
      performedBy: 'system',
      details: '{"period":"2026-07","gross":14500}',
      timestamp: '2026-07-28 00:01',
    },
  ]);

  // Dialog Controls
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const handleApproveApp = (app: ApplicationItem) => {
    setSelectedApp(app);
    setReviewDialogOpen(true);
  };

  const handleConfirmReview = (approved: boolean) => {
    if (!selectedApp) return;

    setApplications((prev) =>
      prev.map((a) =>
        a.id === selectedApp.id ? { ...a, status: approved ? 'approved' : 'rejected' } : a,
      ),
    );

    if (approved) {
      setAgencies((prev) => [
        ...prev,
        {
          id: `agency-${Date.now()}`,
          name: selectedApp.agencyName,
          owner: selectedApp.ownerId,
          country: selectedApp.country,
          legalName: selectedApp.legalName,
          taxId: selectedApp.taxId,
          totalHosts: 1,
          activeHosts: 1,
          monthlyRevenue: 0,
          commissionRate: 15,
          isVerified: true,
          featured: false,
          status: 'active',
        },
      ]);
    }

    setReviewDialogOpen(false);
    setSelectedApp(null);
    setReviewNotes('');
  };

  const handleToggleSuspend = (id: string) => {
    setAgencies((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === 'active' ? 'suspended' : 'active' } : a,
      ),
    );
  };

  const handleToggleVerify = (id: string) => {
    setAgencies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isVerified: !a.isVerified } : a)),
    );
  };

  const handleToggleFeatured = (id: string) => {
    setAgencies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, featured: !a.featured } : a)),
    );
  };

  const handleProcessSettlement = (id: string) => {
    setSettlements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'completed' } : s)),
    );
  };

  // Columns for Directory
  const directoryColumns: Column<AgencyItem>[] = [
    {
      id: 'name',
      label: 'Agency Name',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon color="primary" />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {row.name}
              </Typography>
              {row.isVerified && <VerifiedIcon color="info" sx={{ fontSize: 16 }} />}
              {row.featured && <StarIcon color="warning" sx={{ fontSize: 16 }} />}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {row.legalName} • {row.country}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'owner', label: 'Owner', render: (row) => `@${row.owner}` },
    {
      id: 'hosts',
      label: 'Managed Hosts',
      render: (row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.activeHosts} / {row.totalHosts} active
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.commissionRate}% agency cut
          </Typography>
        </Box>
      ),
    },
    {
      id: 'monthlyRevenue',
      label: 'Monthly Revenue',
      render: (row) => `$${row.monthlyRevenue.toLocaleString()}`,
    },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={row.isVerified ? 'Revoke Verification' : 'Verify Agency'}>
            <IconButton size="small" onClick={() => handleToggleVerify(row.id)} color={row.isVerified ? 'info' : 'default'}>
              <VerifiedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.featured ? 'Unfeature' : 'Feature Agency'}>
            <IconButton size="small" onClick={() => handleToggleFeatured(row.id)} color={row.featured ? 'warning' : 'default'}>
              <StarIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.status === 'active' ? 'Suspend Agency' : 'Reactivate Agency'}>
            <IconButton
              size="small"
              onClick={() => handleToggleSuspend(row.id)}
              color={row.status === 'active' ? 'error' : 'success'}
            >
              {row.status === 'active' ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Columns for Applications
  const applicationColumns: Column<ApplicationItem>[] = [
    {
      id: 'agencyName',
      label: 'Applicant Agency',
      render: (row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.agencyName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.legalName} • {row.country}
          </Typography>
        </Box>
      ),
    },
    { id: 'ownerId', label: 'Owner', render: (row) => `@${row.ownerId}` },
    {
      id: 'business',
      label: 'Business Registration & Tax ID',
      render: (row) => (
        <Box>
          <Typography variant="caption" display="block">Tax ID: {row.taxId}</Typography>
          <Typography variant="caption" display="block">Reg #: {row.businessRegistrationNumber}</Typography>
        </Box>
      ),
    },
    { id: 'submittedAt', label: 'Submitted', render: (row) => row.submittedAt },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      label: 'Review',
      render: (row) =>
        row.status === 'pending' ? (
          <Button
            variant="contained"
            size="small"
            color="primary"
            startIcon={<AssignmentTurnedInIcon />}
            onClick={() => handleApproveApp(row)}
          >
            Review Application
          </Button>
        ) : (
          <Chip label={row.status.toUpperCase()} size="small" color={row.status === 'approved' ? 'success' : 'error'} />
        ),
    },
  ];

  // Columns for Settlements
  const settlementColumns: Column<SettlementItem>[] = [
    { id: 'period', label: 'Period', render: (row) => row.period },
    { id: 'agencyName', label: 'Agency', render: (row) => row.agencyName },
    { id: 'grossRevenue', label: 'Gross Gift Vol', render: (row) => `$${row.grossRevenue.toLocaleString()}` },
    { id: 'agencyCommission', label: 'Agency Cut', render: (row) => `$${row.agencyCommission.toLocaleString()}` },
    { id: 'creatorEarnings', label: 'Host Earnings', render: (row) => `$${row.creatorEarnings.toLocaleString()}` },
    { id: 'platformFee', label: 'Platform Fee (20%)', render: (row) => `$${row.platformFee.toLocaleString()}` },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      label: 'Payout',
      render: (row) =>
        row.status === 'pending' ? (
          <Button
            variant="contained"
            size="small"
            color="success"
            startIcon={<PaymentsIcon />}
            onClick={() => handleProcessSettlement(row.id)}
          >
            Process Payout
          </Button>
        ) : (
          <Chip label="PAID" size="small" color="success" />
        ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Agency Management System
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage host talent agencies, verification applications, host contracts, and monthly revenue settlements
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Active Talent Agencies</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {agencies.filter((a) => a.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Managed Hosts</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {agencies.reduce((sum, a) => sum + a.activeHosts, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Monthly Agency Volume</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                ${agencies.reduce((sum, a) => sum + a.monthlyRevenue, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Pending Applications</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>
                {applications.filter((a) => a.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<BusinessIcon />} label="Agency Directory" iconPosition="start" />
        <Tab icon={<AssignmentTurnedInIcon />} label="Verification Applications" iconPosition="start" />
        <Tab icon={<PaymentsIcon />} label="Revenue Settlements" iconPosition="start" />
        <Tab icon={<LeaderboardIcon />} label="Leaderboards & Analytics" iconPosition="start" />
        <Tab icon={<HistoryIcon />} label="Audit Logs" iconPosition="start" />
      </Tabs>

      {/* Tab Panels */}
      {activeTab === 0 && <DataTable columns={directoryColumns} rows={agencies} />}
      {activeTab === 1 && <DataTable columns={applicationColumns} rows={applications} />}
      {activeTab === 2 && <DataTable columns={settlementColumns} rows={settlements} />}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Top Agency Rankings (Revenue)
              </Typography>
              {agencies.slice(0, 5).map((agency, idx) => (
                <Box
                  key={agency.id}
                  sx={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    p: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 800, width: 24 }}>
                      #{idx + 1}
                    </Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {agency.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {agency.activeHosts} Active Hosts
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main' }}>
                    ${agency.monthlyRevenue.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Agency Host Retention & Performance
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Platform Average Agency Retention Rate: <strong>94.2%</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Average Hosts per Agency: <strong>17 hosts</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Commission Split: <strong>15% Agency / 65% Host / 20% VoiceCloud Platform</strong>
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 4 && (
        <DataTable
          columns={[
            { id: 'timestamp', label: 'Timestamp', render: (r) => r.timestamp },
            { id: 'action', label: 'Action', render: (r) => <Chip label={r.action} size="small" /> },
            { id: 'performedBy', label: 'Performed By', render: (r) => `@${r.performedBy}` },
            { id: 'details', label: 'Details', render: (r) => r.details },
          ]}
          rows={auditLogs}
        />
      )}

      {/* Application Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Review Agency Application</DialogTitle>
        <DialogContent>
          {selectedApp && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {selectedApp.agencyName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Legal Entity: {selectedApp.legalName} ({selectedApp.country})
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Tax ID</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedApp.taxId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Registration Number</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedApp.businessRegistrationNumber}</Typography>
                </Grid>
              </Grid>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Review Notes / Verification Comments"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => handleConfirmReview(false)} color="error" startIcon={<CancelIcon />}>
            Reject Application
          </Button>
          <Button onClick={() => handleConfirmReview(true)} color="success" variant="contained" startIcon={<CheckCircleIcon />}>
            Approve & Issue Verification Badge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
