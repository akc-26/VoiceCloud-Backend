import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SearchIcon from '@mui/icons-material/Search';

import {
  tasksAchievementsAdminService,
  TaskDefinition,
  AchievementDefinition,
  SeasonalEvent,
} from '../services/tasks-achievements.service';

export const TasksAchievementsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Data states
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
  const [seasons, setSeasons] = useState<SeasonalEvent[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Dialog States
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] =
    useState<Partial<TaskDefinition> | null>(null);

  const [achievementDialogOpen, setAchievementDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] =
    useState<Partial<AchievementDefinition> | null>(null);

  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] =
    useState<Partial<SeasonalEvent> | null>(null);

  const [grantRewardOpen, setGrantRewardOpen] = useState(false);
  const [grantData, setGrantData] = useState({
    userId: '',
    rewardType: 'coins',
    amount: 100,
    reason: 'Admin Reward',
  });

  const [inspectUserId, setInspectUserId] = useState('');
  const [userProgressData, setUserProgressData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 0) {
        const data = await tasksAchievementsAdminService.getTasks('daily');
        setTasks(data);
      } else if (activeTab === 1) {
        const data = await tasksAchievementsAdminService.getTasks('weekly');
        setTasks(data);
      } else if (activeTab === 2) {
        const data = await tasksAchievementsAdminService.getTasks('monthly');
        setTasks(data);
      } else if (activeTab === 3) {
        const data = await tasksAchievementsAdminService.getAchievements();
        setAchievements(data);
      } else if (activeTab === 4) {
        // XP Levels info or analytics
        const data = await tasksAchievementsAdminService.getAnalytics();
        setAnalytics(data);
      } else if (activeTab === 5) {
        const data = await tasksAchievementsAdminService.getAuditLogs({
          limit: 50,
        });
        setAuditLogs(data.items || []);
      } else if (activeTab === 6) {
        const data = await tasksAchievementsAdminService.getSeasons();
        setSeasons(data);
      } else if (activeTab === 7) {
        const data = await tasksAchievementsAdminService.getAnalytics();
        setAnalytics(data);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to fetch data',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!editingTask?.title || !editingTask?.eventKey) return;
    try {
      if (editingTask.id) {
        await tasksAchievementsAdminService.updateTask(
          editingTask.id,
          editingTask,
        );
        setSnackbarMessage('Task updated successfully');
      } else {
        const resetPeriod =
          activeTab === 1 ? 'weekly' : activeTab === 2 ? 'monthly' : 'daily';
        await tasksAchievementsAdminService.createTask({
          ...editingTask,
          resetPeriod,
        });
        setSnackbarMessage('Task created successfully');
      }
      setTaskDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksAchievementsAdminService.deleteTask(id);
      setSnackbarMessage('Task deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleSaveAchievement = async () => {
    if (!editingAchievement?.title || !editingAchievement?.eventKey) return;
    try {
      if (editingAchievement.id) {
        await tasksAchievementsAdminService.updateAchievement(
          editingAchievement.id,
          editingAchievement,
        );
        setSnackbarMessage('Achievement updated successfully');
      } else {
        await tasksAchievementsAdminService.createAchievement(
          editingAchievement,
        );
        setSnackbarMessage('Achievement created successfully');
      }
      setAchievementDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this achievement?'))
      return;
    try {
      await tasksAchievementsAdminService.deleteAchievement(id);
      setSnackbarMessage('Achievement deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleGrantReward = async () => {
    if (!grantData.userId) return;
    try {
      await tasksAchievementsAdminService.manualGrantReward(grantData);
      setSnackbarMessage('Reward manually granted!');
      setGrantRewardOpen(false);
      if (activeTab === 5) fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleManualReset = async (period: 'daily' | 'weekly' | 'monthly') => {
    try {
      await tasksAchievementsAdminService.manualReset(period);
      setSnackbarMessage(`Manual ${period} task reset executed!`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleInspectUser = async () => {
    if (!inspectUserId) return;
    try {
      const data =
        await tasksAchievementsAdminService.getUserProgress(inspectUserId);
      setUserProgressData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Title Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Daily Tasks & Achievements Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure tasks, permanent achievements, XP levels, rewards, streaks
            & seasonal events.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchData()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<CardGiftcardIcon />}
            onClick={() => setGrantRewardOpen(true)}
          >
            Manual Grant Reward
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            label="Daily Tasks"
            icon={<TaskAltIcon />}
            iconPosition="start"
          />
          <Tab
            label="Weekly Tasks"
            icon={<TaskAltIcon />}
            iconPosition="start"
          />
          <Tab
            label="Monthly Missions"
            icon={<TaskAltIcon />}
            iconPosition="start"
          />
          <Tab
            label="Achievements"
            icon={<EmojiEventsIcon />}
            iconPosition="start"
          />
          <Tab
            label="XP Levels"
            icon={<AssessmentIcon />}
            iconPosition="start"
          />
          <Tab
            label="Reward Audit Logs"
            icon={<CardGiftcardIcon />}
            iconPosition="start"
          />
          <Tab
            label="Seasonal Events"
            icon={<EmojiEventsIcon />}
            iconPosition="start"
          />
          <Tab
            label="Analytics Engine"
            icon={<AssessmentIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* TAB 0, 1, 2: TASKS TABLES */}
      {!loading && (activeTab === 0 || activeTab === 1 || activeTab === 2) && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {activeTab === 0
                ? 'Daily Tasks'
                : activeTab === 1
                  ? 'Weekly Tasks'
                  : 'Monthly Missions'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                color="warning"
                onClick={() =>
                  handleManualReset(
                    activeTab === 1
                      ? 'weekly'
                      : activeTab === 2
                        ? 'monthly'
                        : 'daily',
                  )
                }
              >
                Trigger Manual Reset
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingTask({
                    title: '',
                    description: '',
                    eventKey: 'login',
                    targetCount: 1,
                    rewardCoins: 50,
                    rewardDiamonds: 0,
                    rewardXp: 20,
                    isActive: true,
                  });
                  setTaskDialogOpen(true);
                }}
              >
                Create Task
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title & Description</TableCell>
                  <TableCell>Event Key</TableCell>
                  <TableCell>Target Count</TableCell>
                  <TableCell>Rewards (Coins/Diamonds/XP)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.eventKey}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{task.targetCount}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {task.rewardCoins > 0 && (
                          <Chip
                            label={`${task.rewardCoins} Coins`}
                            color="warning"
                            size="small"
                          />
                        )}
                        {task.rewardDiamonds > 0 && (
                          <Chip
                            label={`${task.rewardDiamonds} Dia`}
                            color="primary"
                            size="small"
                          />
                        )}
                        {task.rewardXp > 0 && (
                          <Chip
                            label={`${task.rewardXp} XP`}
                            color="success"
                            size="small"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.isActive ? 'Active' : 'Disabled'}
                        color={task.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingTask(task);
                          setTaskDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No tasks found for this period. Click "Create Task" to add
                      one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 3: ACHIEVEMENTS */}
      {!loading && activeTab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Permanent Achievements Engine
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingAchievement({
                  title: '',
                  description: '',
                  rarity: 'common',
                  eventKey: 'join_room',
                  targetCount: 10,
                  coinReward: 200,
                  diamondReward: 10,
                  xpBonus: 100,
                  isActive: true,
                });
                setAchievementDialogOpen(true);
              }}
            >
              Create Achievement
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title & Description</TableCell>
                  <TableCell>Rarity</TableCell>
                  <TableCell>Event Key & Target</TableCell>
                  <TableCell>Rewards</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {achievements.map((ach) => (
                  <TableRow key={ach.id}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {ach.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ach.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ach.rarity.toUpperCase()}
                        color={
                          ach.rarity === 'mythic'
                            ? 'secondary'
                            : ach.rarity === 'legendary'
                              ? 'warning'
                              : ach.rarity === 'epic'
                                ? 'primary'
                                : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {ach.eventKey} (Goal: {ach.targetCount})
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {ach.coinReward > 0 && (
                          <Chip
                            label={`${ach.coinReward} Coins`}
                            color="warning"
                            size="small"
                          />
                        )}
                        {ach.diamondReward > 0 && (
                          <Chip
                            label={`${ach.diamondReward} Dia`}
                            color="primary"
                            size="small"
                          />
                        )}
                        {ach.xpBonus > 0 && (
                          <Chip
                            label={`${ach.xpBonus} XP`}
                            color="success"
                            size="small"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ach.isActive ? 'Active' : 'Disabled'}
                        color={ach.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingAchievement(ach);
                          setAchievementDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteAchievement(ach.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 4: XP LEVELS & USER INSPECTOR */}
      {!loading && activeTab === 4 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    User Progress Inspector
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Enter User ID..."
                      value={inspectUserId}
                      onChange={(e) => setInspectUserId(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      startIcon={<SearchIcon />}
                      onClick={handleInspectUser}
                    >
                      Inspect
                    </Button>
                  </Box>

                  {userProgressData && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Level {userProgressData.xp?.level} (
                        {userProgressData.xp?.levelTitle}) —{' '}
                        {userProgressData.xp?.currentXp}/
                        {userProgressData.xp?.requiredXp} XP (
                        {userProgressData.xp?.progressPercent}%)
                      </Alert>
                      <Typography variant="subtitle2">
                        Streaks:{' '}
                        {userProgressData.streaks
                          ?.map(
                            (s: any) => `${s.streakType}: ${s.currentStreak}d`,
                          )
                          .join(' | ')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    Level Title Tiers (Level 1–50)
                  </Typography>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
                  >
                    <Typography variant="body2">
                      • Lvl 1–5: Novice Voice
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 6–10: Bronze Speaker
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 11–15: Silver Host
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 16–20: Gold Broadcaster
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 21–25: Platinum Vocalist
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 26–30: Diamond Superstar
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 31–35: Master Maestro
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 36–40: Grandmaster Idol
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 41–45: Legend Icon
                    </Typography>
                    <Typography variant="body2">
                      • Lvl 46–50: Mythic Voice
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {!loading && activeTab === 5 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>User ID</TableCell>
                <TableCell>Reward Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Metadata</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.userId}</TableCell>
                  <TableCell>
                    <Chip label={log.rewardType} size="small" color="primary" />
                  </TableCell>
                  <TableCell>{log.amount}</TableCell>
                  <TableCell>{log.source}</TableCell>
                  <TableCell>{log.metadata}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* TAB 6: SEASONAL EVENTS */}
      {!loading && activeTab === 6 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Seasonal Events Engine
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                const now = new Date();
                const future = new Date();
                future.setDate(future.getDate() + 30);
                setEditingSeason({
                  title: '',
                  description: '',
                  startDate: now.toISOString(),
                  endDate: future.toISOString(),
                  xpMultiplier: 1.5,
                  coinMultiplier: 1.2,
                  isActive: true,
                });
                setSeasonDialogOpen(true);
              }}
            >
              Create Season
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Start Date - End Date</TableCell>
                  <TableCell>XP Multiplier</TableCell>
                  <TableCell>Coin Multiplier</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {seasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {season.title}
                      </Typography>
                      <Typography variant="caption">
                        {season.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(season.startDate).toLocaleDateString()} -{' '}
                      {new Date(season.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{season.xpMultiplier}x</TableCell>
                    <TableCell>{season.coinMultiplier}x</TableCell>
                    <TableCell>
                      <Chip
                        label={season.isActive ? 'Active' : 'Ended'}
                        color={season.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="warning"
                        onClick={() =>
                          tasksAchievementsAdminService.triggerRollover(
                            season.id,
                          )
                        }
                      >
                        Rollover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 7: ANALYTICS */}
      {!loading && activeTab === 7 && analytics && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Task Completions
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {analytics.tasks?.completedCount || 0}
                </Typography>
                <Typography variant="body2">
                  Total Claimed: {analytics.tasks?.claimedCount || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Achievements Unlocked
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {analytics.achievements?.totalUnlockedCount || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Coins Distributed
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: 'warning.main' }}
                >
                  {analytics.rewards?.totalCoinsDistributed || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* CREATE / EDIT TASK DIALOG */}
      <Dialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTask?.id ? 'Edit Task' : 'Create Task'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={editingTask?.title || ''}
              onChange={(e) =>
                setEditingTask({ ...editingTask, title: e.target.value })
              }
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={editingTask?.description || ''}
              onChange={(e) =>
                setEditingTask({ ...editingTask, description: e.target.value })
              }
            />
            <TextField
              label="Event Key"
              fullWidth
              value={editingTask?.eventKey || ''}
              onChange={(e) =>
                setEditingTask({ ...editingTask, eventKey: e.target.value })
              }
              helperText="e.g. login, check_in, join_room, stay_room_min, host_room, send_gifts, receive_gifts, chat_messages"
            />
            <TextField
              label="Target Count"
              type="number"
              fullWidth
              value={editingTask?.targetCount || 1}
              onChange={(e) =>
                setEditingTask({
                  ...editingTask,
                  targetCount: parseInt(e.target.value) || 1,
                })
              }
            />
            <Grid container spacing={2}>
              <Grid size={4}>
                <TextField
                  label="Reward Coins"
                  type="number"
                  fullWidth
                  value={editingTask?.rewardCoins || 0}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      rewardCoins: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Reward Diamonds"
                  type="number"
                  fullWidth
                  value={editingTask?.rewardDiamonds || 0}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      rewardDiamonds: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Reward XP"
                  type="number"
                  fullWidth
                  value={editingTask?.rewardXp || 0}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      rewardXp: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTask}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* CREATE / EDIT ACHIEVEMENT DIALOG */}
      <Dialog
        open={achievementDialogOpen}
        onClose={() => setAchievementDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAchievement?.id ? 'Edit Achievement' : 'Create Achievement'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={editingAchievement?.title || ''}
              onChange={(e) =>
                setEditingAchievement({
                  ...editingAchievement,
                  title: e.target.value,
                })
              }
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={editingAchievement?.description || ''}
              onChange={(e) =>
                setEditingAchievement({
                  ...editingAchievement,
                  description: e.target.value,
                })
              }
            />
            <TextField
              select
              label="Rarity"
              fullWidth
              value={editingAchievement?.rarity || 'common'}
              onChange={(e) =>
                setEditingAchievement({
                  ...editingAchievement,
                  rarity: e.target.value as any,
                })
              }
            >
              <MenuItem value="common">Common</MenuItem>
              <MenuItem value="rare">Rare</MenuItem>
              <MenuItem value="epic">Epic</MenuItem>
              <MenuItem value="legendary">Legendary</MenuItem>
              <MenuItem value="mythic">Mythic</MenuItem>
            </TextField>
            <TextField
              label="Event Key"
              fullWidth
              value={editingAchievement?.eventKey || ''}
              onChange={(e) =>
                setEditingAchievement({
                  ...editingAchievement,
                  eventKey: e.target.value,
                })
              }
            />
            <TextField
              label="Target Count"
              type="number"
              fullWidth
              value={editingAchievement?.targetCount || 10}
              onChange={(e) =>
                setEditingAchievement({
                  ...editingAchievement,
                  targetCount: parseInt(e.target.value) || 1,
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAchievementDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveAchievement}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* MANUAL GRANT REWARD DIALOG */}
      <Dialog
        open={grantRewardOpen}
        onClose={() => setGrantRewardOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Manual Grant Reward</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Target User ID"
              fullWidth
              value={grantData.userId}
              onChange={(e) =>
                setGrantData({ ...grantData, userId: e.target.value })
              }
            />
            <TextField
              select
              label="Reward Type"
              fullWidth
              value={grantData.rewardType}
              onChange={(e) =>
                setGrantData({ ...grantData, rewardType: e.target.value })
              }
            >
              <MenuItem value="coins">Coins</MenuItem>
              <MenuItem value="diamonds">Diamonds</MenuItem>
              <MenuItem value="xp">XP</MenuItem>
              <MenuItem value="vip_trial">VIP Trial Days</MenuItem>
              <MenuItem value="profile_frame">Profile Frame</MenuItem>
              <MenuItem value="chat_bubble">Chat Bubble</MenuItem>
              <MenuItem value="badge">Badge</MenuItem>
            </TextField>
            <TextField
              label="Amount / Count"
              type="number"
              fullWidth
              value={grantData.amount}
              onChange={(e) =>
                setGrantData({
                  ...grantData,
                  amount: parseInt(e.target.value) || 1,
                })
              }
            />
            <TextField
              label="Reason"
              fullWidth
              value={grantData.reason}
              onChange={(e) =>
                setGrantData({ ...grantData, reason: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantRewardOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleGrantReward}
          >
            Grant Reward
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
      />
    </Box>
  );
};
