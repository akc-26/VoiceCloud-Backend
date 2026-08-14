import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { DataTable, Column } from '../components/common/DataTable';
import { Pagination } from '../components/common/Pagination';
import { adminService } from '../services/admin.service';

interface AuditLogItem { id: string; userId?: string; module?: string; action: string; previousValue?: any; newValue?: any; createdAt?: string; }
export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]); const [page, setPage] = useState(1); const [limit, setLimit] = useState(25); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const res = await adminService.getAuditLogs({ page, limit }); setLogs(res?.data || res?.logs || (Array.isArray(res) ? res : [])); setTotal(res?.total ?? (res?.data || res?.logs || res || []).length); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [page, limit]);
  const columns: Column<AuditLogItem>[] = [
    { id: 'id', label: 'Audit ID' },
    { id: 'userId', label: 'Admin Actor', render: (row) => <Box sx={{ display:'flex',alignItems:'center',gap:1 }}><SecurityIcon color="primary" fontSize="small"/><Typography variant="body2" sx={{fontWeight:700}}>{row.userId || 'SYSTEM'}</Typography></Box> },
    { id: 'module', label: 'Module', render: (row) => row.module || 'system' },
    { id: 'action', label: 'Action Event' },
    { id: 'createdAt', label: 'Timestamp', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—' },
  ];
  return <Box><Box sx={{mb:3}}><Typography variant="h4" sx={{fontWeight:800}}>Administrative Audit Trail</Typography><Typography variant="body2" color="text.secondary">Real administrative audit events recorded by the backend.</Typography></Box><DataTable columns={columns} rows={logs} isLoading={loading}/><Pagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit}/></Box>;
};
