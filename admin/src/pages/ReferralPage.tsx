import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import CampaignIcon from '@mui/icons-material/Campaign';
import SecurityIcon from '@mui/icons-material/Security';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';

export const ReferralPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [openBlacklistDialog, setOpenBlacklistDialog] = useState(false);
  const [openGrantRewardDialog, setOpenGrantRewardDialog] = useState(false);

  // Mock initial state for presentation and real UI interaction
  const [campaigns, setCampaigns] = useState([
    {
      id: 'cmp-101',
      campaignName: 'Summer Referral Festival',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      isActive: true,
      currentTotalReferrals: 124,
      globalLimits: 1000,
      rewardType: 'COINS',
      amount: 100,
    },
    {
      id: 'cmp-102',
      campaignName: 'VIP Launch Referral Bonus',
      startDate: '2026-07-15',
      endDate: '2026-07-31',
      isActive: false,
      currentTotalReferrals: 450,
      globalLimits: 500,
      rewardType: 'VIP_TRIAL',
      amount: 7,
    },
  ]);

  const [fraudLogs, setFraudLogs] = useState([
    {
      id: 'frd-1',
      referrerId: 'usr-8832',
      referredUserId: 'usr-9941',
      triggerReason: 'Duplicate device ID detected (3 existing referrals)',
      riskScore: 85,
      status: 'SUSPECTED',
      ipAddress: '192.168.1.45',
      createdAt: '2026-07-29 10:15:00',
    },
    {
      id: 'frd-2',
      referrerId: 'usr-1204',
      referredUserId: 'usr-5521',
      triggerReason: 'Excessive referral rate velocity (12 referrals in last hour)',
      riskScore: 60,
      status: 'SUSPECTED',
      ipAddress: '10.0.0.12',
      createdAt: '2026-07-29 09:30:00',
    },
  ]);

  const [blacklist, setBlacklist] = useState([
    { id: 'bl-1', type: 'IP', value: '192.168.1.100', reason: 'Botnet IP Address', createdAt: '2026-07-20' },
    { id: 'bl-2', type: 'DEVICE', value: 'device-id-spammer-99', reason: 'Multiple account generation', createdAt: '2026-07-22' },
  ]);

  // Form states
  const [newCampaign, setNewCampaign] = useState({
    campaignName: '',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    rewardType: 'COINS',
    amount: 100,
  });

  const [newBlacklist, setNewBlacklist] = useState({
    type: 'IP',
    value: '',
    reason: '',
  });

  const [grantRewardForm, setGrantRewardForm] = useState({
    userId: '',
    rewardType: 'COINS',
    amount: 100,
    reason: 'Admin Bonus Grant',
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.campaignName) return;
    setCampaigns([
      ...campaigns,
      {
        id: `cmp-${Date.now()}`,
        campaignName: newCampaign.campaignName,
        startDate: newCampaign.startDate,
        endDate: newCampaign.endDate,
        isActive: true,
        currentTotalReferrals: 0,
        globalLimits: 500,
        rewardType: newCampaign.rewardType,
        amount: Number(newCampaign.amount),
      },
    ]);
    setOpenCampaignDialog(false);
    setNewCampaign({ campaignName: '', startDate: '2026-08-01', endDate: '2026-08-31', rewardType: 'COINS', amount: 100 });
  };

  const handleAddBlacklist = () => {
    if (!newBlacklist.value) return;
    setBlacklist([
      ...blacklist,
      {
        id: `bl-${Date.now()}`,
        type: newBlacklist.type,
        value: newBlacklist.value,
        reason: newBlacklist.reason || 'Admin blacklisted',
        createdAt: new Date().toISOString().split('T')[0],
      },
    ]);
    setOpenBlacklistDialog(false);
    setNewBlacklist({ type: 'IP', value: '', reason: '' });
  };

  const handleApproveFraud = (id: string) => {
    setFraudLogs(fraudLogs.map((f) => (f.id === id ? { ...f, status: 'CLEAN' } : f)));
  };

  const handleRejectFraud = (id: string) => {
    setFraudLogs(fraudLogs.map((f) => (f.id === id ? { ...f, status: 'CONFIRMED' } : f)));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Title Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShareIcon fontSize="large" /> Phase 30: Referral & Invite System
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage referral campaigns, invite tracking, milestone rewards, anti-fraud controls & real-time analytics.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />}>
            Refresh Data
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCampaignDialog(true)}>
            New Campaign
          </Button>
        </Box>
      </Box>

      {/* Top Overview Metrics Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                TOTAL REFERRALS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
                1,280
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                +18% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                QUALIFIED REFERRALS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, color: 'success.main' }}>
                1,050
              </Typography>
              <Typography variant="caption" color="text.secondary">
                82% conversion rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                PENDING APPROVAL
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, color: 'warning.main' }}>
                185
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Awaiting first activity
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                REWARDS DISBURSED
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, color: 'primary.main' }}>
                245,000
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Coins & Diamonds
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                SUSPECTED FRAUD
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, color: 'error.main' }}>
                45
              </Typography>
              <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                Requires review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, val) => setTabIndex(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<CampaignIcon />} iconPosition="start" label="Campaigns Management" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Fraud & Blacklist Engine" />
          <Tab icon={<EmojiEventsIcon />} iconPosition="start" label="Milestones & Grant Rewards" />
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Analytics & Leaderboard" />
        </Tabs>

        {/* TAB 0: CAMPAIGNS */}
        {tabIndex === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Referral Campaigns List
              </Typography>
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Campaign ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Campaign Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>End Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reward</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{c.id}</TableCell>
                      <TableCell>{c.campaignName}</TableCell>
                      <TableCell>{c.startDate}</TableCell>
                      <TableCell>{c.endDate}</TableCell>
                      <TableCell>
                        <Chip label={`${c.amount} ${c.rewardType}`} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {c.currentTotalReferrals} / {c.globalLimits}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.isActive ? 'ACTIVE' : 'INACTIVE'}
                          size="small"
                          color={c.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={c.isActive}
                              onChange={(e) =>
                                setCampaigns(
                                  campaigns.map((item) =>
                                    item.id === c.id ? { ...item, isActive: e.target.checked } : item,
                                  ),
                                )
                              }
                              size="small"
                            />
                          }
                          label=""
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 1: FRAUD & BLACKLIST */}
        {tabIndex === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Suspected Referral Fraud Logs
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<BlockIcon />}
                onClick={() => setOpenBlacklistDialog(true)}
              >
                Add Blacklist Entry
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 4 }}>
              <Table>
                <TableHead sx={{ backgroundColor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Referrer ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Referred User ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trigger Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Risk Score</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fraudLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{log.referrerId}</TableCell>
                      <TableCell>{log.referredUserId}</TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>{log.triggerReason}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${log.riskScore} / 100`}
                          size="small"
                          color={log.riskScore >= 80 ? 'error' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell>
                        <Chip label={log.status} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Approve Referral">
                          <IconButton color="success" size="small" onClick={() => handleApproveFraud(log.id)}>
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject & Mark Fraud">
                          <IconButton color="error" size="small" onClick={() => handleRejectFraud(log.id)}>
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Active Referral Blacklist (IP, Device ID, Users)
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Blacklisted Value</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date Added</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blacklist.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Chip label={b.type} size="small" color="secondary" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{b.value}</TableCell>
                      <TableCell>{b.reason}</TableCell>
                      <TableCell>{b.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 2: MILESTONES & GRANT REWARDS */}
        {tabIndex === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                System Milestone Definitions
              </Typography>
              <Button variant="contained" color="primary" onClick={() => setOpenGrantRewardDialog(true)}>
                Manual Grant Reward
              </Button>
            </Box>

            <Grid container spacing={2.5}>
              {[
                { count: '1 Referral', reward: '100 Coins', type: 'COINS' },
                { count: '5 Referrals', reward: '600 Coins', type: 'COINS' },
                { count: '10 Referrals', reward: '100 Diamonds', type: 'DIAMONDS' },
                { count: '25 Referrals', reward: '7 Days VIP Trial', type: 'VIP_TRIAL' },
                { count: '50 Referrals', reward: '500 Diamonds', type: 'DIAMONDS' },
                { count: '100 Referrals', reward: 'Gold Referral Frame', type: 'PROFILE_FRAME' },
              ].map((m, idx) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {m.count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Reward: <strong>{m.reward}</strong>
                      </Typography>
                      <Chip label={m.type} size="small" color="primary" sx={{ mt: 1.5 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* TAB 3: ANALYTICS & LEADERBOARD */}
        {tabIndex === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Top Referrers Leaderboard
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>User ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Qualified Referrals</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total Rewards Earned</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { rank: 1, userId: 'usr-1092', count: 185, reward: '18,500 Coins' },
                    { rank: 2, userId: 'usr-2041', count: 142, reward: '14,200 Coins' },
                    { rank: 3, userId: 'usr-3312', count: 98, reward: '9,800 Coins' },
                    { rank: 4, userId: 'usr-4109', count: 74, reward: '7,400 Coins' },
                  ].map((row) => (
                    <TableRow key={row.rank}>
                      <TableCell sx={{ fontWeight: 800 }}>#{row.rank}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.userId}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>{row.reward}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* CREATE CAMPAIGN DIALOG */}
      <Dialog open={openCampaignDialog} onClose={() => setOpenCampaignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Referral Campaign</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Campaign Name"
            value={newCampaign.campaignName}
            onChange={(e) => setNewCampaign({ ...newCampaign, campaignName: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={newCampaign.startDate}
            onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
            margin="normal"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={newCampaign.endDate}
            onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
            margin="normal"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Reward Type</InputLabel>
            <Select
              value={newCampaign.rewardType}
              label="Reward Type"
              onChange={(e) => setNewCampaign({ ...newCampaign, rewardType: e.target.value })}
            >
              <MenuItem value="COINS">Coins</MenuItem>
              <MenuItem value="DIAMONDS">Diamonds</MenuItem>
              <MenuItem value="VIP_TRIAL">VIP Trial</MenuItem>
              <MenuItem value="STORE_ITEM">Store Item</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Reward Amount"
            type="number"
            value={newCampaign.amount}
            onChange={(e) => setNewCampaign({ ...newCampaign, amount: Number(e.target.value) })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenCampaignDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCampaign}>
            Create Campaign
          </Button>
        </DialogActions>
      </Dialog>

      {/* BLACKLIST DIALOG */}
      <Dialog open={openBlacklistDialog} onClose={() => setOpenBlacklistDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Blacklist Entry</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={newBlacklist.type}
              label="Type"
              onChange={(e) => setNewBlacklist({ ...newBlacklist, type: e.target.value })}
            >
              <MenuItem value="IP">IP Address</MenuItem>
              <MenuItem value="DEVICE">Device ID</MenuItem>
              <MenuItem value="USER">User ID</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Value"
            value={newBlacklist.value}
            onChange={(e) => setNewBlacklist({ ...newBlacklist, value: e.target.value })}
            margin="normal"
            placeholder="e.g. 192.168.1.1 or device-uuid or usr-1234"
          />
          <TextField
            fullWidth
            label="Reason"
            value={newBlacklist.reason}
            onChange={(e) => setNewBlacklist({ ...newBlacklist, reason: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenBlacklistDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleAddBlacklist}>
            Add Blacklist
          </Button>
        </DialogActions>
      </Dialog>

      {/* GRANT REWARD DIALOG */}
      <Dialog open={openGrantRewardDialog} onClose={() => setOpenGrantRewardDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Manual Reward Grant</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="User ID"
            value={grantRewardForm.userId}
            onChange={(e) => setGrantRewardForm({ ...grantRewardForm, userId: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Reward Type</InputLabel>
            <Select
              value={grantRewardForm.rewardType}
              label="Reward Type"
              onChange={(e) => setGrantRewardForm({ ...grantRewardForm, rewardType: e.target.value })}
            >
              <MenuItem value="COINS">Coins</MenuItem>
              <MenuItem value="DIAMONDS">Diamonds</MenuItem>
              <MenuItem value="VIP_TRIAL">VIP Trial</MenuItem>
              <MenuItem value="PROFILE_FRAME">Profile Frame</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Amount / Quantity"
            type="number"
            value={grantRewardForm.amount}
            onChange={(e) => setGrantRewardForm({ ...grantRewardForm, amount: Number(e.target.value) })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenGrantRewardDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setOpenGrantRewardDialog(false);
              alert('Reward granted successfully!');
            }}
          >
            Grant Reward
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
