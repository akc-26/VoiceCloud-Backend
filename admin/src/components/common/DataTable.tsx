import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Skeleton,
} from '@mui/material';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  isLoading?: boolean;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  isLoading,
  loading,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records to display at this time.',
  onRowClick,
}: DataTableProps<T>) {
  const showLoading = isLoading || loading;
  if (showLoading) {
    return (
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id} align={col.align} style={{ minWidth: col.minWidth }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton variant="text" width="80%" height={24} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.id} align={col.align} style={{ minWidth: col.minWidth }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const key = row.id ? String(row.id) : `row-${index}`;
            return (
              <TableRow
                key={key}
                hover
                onClick={() => onRowClick && onRowClick(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:last-child td, &:last-child th': { border: 0 },
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align}>
                    {col.render ? col.render(row) : (row as any)[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
