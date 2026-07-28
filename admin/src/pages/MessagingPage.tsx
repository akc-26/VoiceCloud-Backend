import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Chat as ChatIcon,
  ReportProblem as ReportIcon,
  AttachFile as AttachIcon,
  BarChart as AnalyticsIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`messaging-tabpanel-${index}`}
      aria-labelledby={`messaging-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const MessagingPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportActionStatus, setReportActionStatus] = useState<'reviewed' | 'dismissed' | 'actioned'>('reviewed');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [deleteMessage, setDeleteMessage] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  const queryClient = useQueryClient();

  // Queries
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-messaging-analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/messaging/analytics');
      return res.data;
    },
  });

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['admin-messaging-conversations'],
    queryFn: async () => {
      const res = await api.get('/admin/messaging/conversations');
      return res.data;
    },
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-messaging-reports'],
    queryFn: async () => {
      const res = await api.get('/admin/messaging/reports');
      return res.data;
    },
  });

  const { data: attachmentsData, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['admin-messaging-attachments'],
    queryFn: async () => {
      const res = await api.get('/admin/messaging/attachments');
      return res.data;
    },
  });

  // Mutation to resolve report
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, payload }: { reportId: string; payload: any }) => {
      const res = await api.patch(`/admin/messaging/reports/${reportId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messaging-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-messaging-analytics'] });
      setSelectedReport(null);
      setModeratorNotes('');
      setDeleteMessage(false);
    },
  });

  const handleResolveReportSubmit = () => {
    if (!selectedReport) return;
    resolveReportMutation.mutate({
      reportId: selectedReport.id,
      payload: {
        status: reportActionStatus,
        moderatorNotes,
        deleteMessage,
      },
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
        <ChatIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Chat & Messaging Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor active conversations, moderate reported messages, audit media attachments, and track real-time analytics.
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 3, p: 1 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<AnalyticsIcon />} iconPosition="start" label="Overview & Analytics" />
          <Tab icon={<ChatIcon />} iconPosition="start" label="Conversations" />
          <Tab icon={<ReportIcon />} iconPosition="start" label="Reported Messages" />
          <Tab icon={<AttachIcon />} iconPosition="start" label="Attachments Audit" />
        </Tabs>
      </Paper>

      {/* TAB 0: ANALYTICS OVERVIEW */}
      <CustomTabPanel value={tabValue} index={0}>
        {analyticsLoading ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Conversations
                  </Typography>
                  <Typography variant="h3" fontWeight={800} color="primary.main" sx={{ my: 1 }}>
                    {analytics?.totalConversations || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Platform-wide direct, group & room chats
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Messages Sent
                  </Typography>
                  <Typography variant="h3" fontWeight={800} color="secondary.main" sx={{ my: 1 }}>
                    {analytics?.totalMessages || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Historical text, audio & attachments
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Pending Moderation Reports
                  </Typography>
                  <Typography variant="h3" fontWeight={800} color="error.main" sx={{ my: 1 }}>
                    {analytics?.pendingReports || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Flagged by community users
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Chat Users Today
                  </Typography>
                  <Typography variant="h3" fontWeight={800} color="success.main" sx={{ my: 1 }}>
                    {analytics?.activeUsersToday || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Unique senders & receivers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  Conversations Breakdown by Type
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip label={`Direct Messages: ${analytics?.conversationsByType?.direct || 0}`} color="primary" sx={{ fontSize: '1rem', py: 2 }} />
                  <Chip label={`Group Chats: ${analytics?.conversationsByType?.group || 0}`} color="info" sx={{ fontSize: '1rem', py: 2 }} />
                  <Chip label={`Voice Room Chats: ${analytics?.conversationsByType?.room || 0}`} color="warning" sx={{ fontSize: '1rem', py: 2 }} />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </CustomTabPanel>

      {/* TAB 1: CONVERSATIONS */}
      <CustomTabPanel value={tabValue} index={1}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell fontWeight={700}>ID / Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Members</TableCell>
                  <TableCell>Messages</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conversationsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : conversationsData?.conversations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No conversations found
                    </TableCell>
                  </TableRow>
                ) : (
                  conversationsData?.conversations?.map((conv: any) => (
                    <TableRow key={conv.id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {conv.name || `Conv #${conv.id.substring(0, 8)}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {conv.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={conv.type.toUpperCase()}
                          size="small"
                          color={
                            conv.type === 'direct'
                              ? 'primary'
                              : conv.type === 'group'
                              ? 'info'
                              : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>{conv.memberCount || conv.members?.length || 0}</TableCell>
                      <TableCell>{conv.messageCount || 0}</TableCell>
                      <TableCell>
                        {new Date(conv.lastMessageAt || conv.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="primary"
                          onClick={() => setSelectedConversation(conv)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </CustomTabPanel>

      {/* TAB 2: REPORTED MESSAGES */}
      <CustomTabPanel value={tabValue} index={2}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Report ID</TableCell>
                  <TableCell>Message / Reason</TableCell>
                  <TableCell>Reporter ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : reportsData?.reports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No reported messages in queue
                    </TableCell>
                  </TableRow>
                ) : (
                  reportsData?.reports?.map((report: any) => (
                    <TableRow key={report.id} hover>
                      <TableCell>{report.id.substring(0, 8)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {report.reason.toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {report.message?.content || 'Attachment / Voice note'}
                        </Typography>
                      </TableCell>
                      <TableCell>{report.reporterId.substring(0, 8)}</TableCell>
                      <TableCell>
                        <Chip
                          label={report.status.toUpperCase()}
                          size="small"
                          color={
                            report.status === 'pending'
                              ? 'error'
                              : report.status === 'actioned'
                              ? 'success'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedReport(report);
                            setReportActionStatus('actioned');
                          }}
                        >
                          Resolve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </CustomTabPanel>

      {/* TAB 3: ATTACHMENTS AUDIT */}
      <CustomTabPanel value={tabValue} index={3}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Attachment Name / URL</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Sender ID</TableCell>
                  <TableCell>Conversation ID</TableCell>
                  <TableCell>Uploaded At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attachmentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : attachmentsData?.attachments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No chat attachments uploaded
                    </TableCell>
                  </TableRow>
                ) : (
                  attachmentsData?.attachments?.map((att: any, idx: number) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 300 }}>
                          {att.name || att.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={(att.type || 'attachment').toUpperCase()} size="small" />
                      </TableCell>
                      <TableCell>{att.senderId?.substring(0, 8) || 'N/A'}</TableCell>
                      <TableCell>{att.conversationId?.substring(0, 8) || 'N/A'}</TableCell>
                      <TableCell>
                        {att.createdAt ? new Date(att.createdAt).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </CustomTabPanel>

      {/* RESOLVE REPORT DIALOG */}
      <Dialog open={!!selectedReport} onClose={() => setSelectedReport(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Reported Message</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Reported Reason:
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              {selectedReport?.reason}
            </Typography>
            {selectedReport?.details && (
              <Typography variant="body2" color="text.secondary">
                Details: {selectedReport.details}
              </Typography>
            )}
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status Outcome</InputLabel>
            <Select
              value={reportActionStatus}
              label="Status Outcome"
              onChange={(e) => setReportActionStatus(e.target.value as any)}
            >
              <MenuItem value="actioned">Actioned (Take Action / Warning)</MenuItem>
              <MenuItem value="reviewed">Reviewed (No Violation)</MenuItem>
              <MenuItem value="dismissed">Dismissed (Invalid Report)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Moderator Notes"
            value={moderatorNotes}
            onChange={(e) => setModeratorNotes(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant={deleteMessage ? 'contained' : 'outlined'}
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteMessage(!deleteMessage)}
            >
              {deleteMessage ? 'Will Delete Reported Message' : 'Soft Delete Message'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedReport(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleResolveReportSubmit}
            disabled={resolveReportMutation.isPending}
          >
            Submit Resolution
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONVERSATION DETAILS DIALOG */}
      <Dialog
        open={!!selectedConversation}
        onClose={() => setSelectedConversation(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Conversation Details - {selectedConversation?.name || selectedConversation?.id}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="text.secondary">
            Type: {selectedConversation?.type} | Members: {selectedConversation?.memberCount || selectedConversation?.members?.length}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Members List:</Typography>
            {selectedConversation?.members?.map((m: any) => (
              <Box key={m.id} sx={{ py: 0.5, borderBottom: '1px solid #eee' }}>
                <Typography variant="body2">
                  User ID: {m.userId} | Role: <strong>{m.role}</strong>
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedConversation(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
