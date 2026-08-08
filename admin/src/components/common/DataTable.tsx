import React from 'react';
import {
  Box,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

const tableShellSx = {
  border: '1px solid',
  borderColor: 'divider',
  backgroundColor: 'background.paper',
  overflowX: 'auto',
} as const;

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
      <TableContainer component={Paper} elevation={0} sx={tableShellSx}>
        <Table sx={{ minWidth: 680 }} aria-busy="true">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align} style={{ minWidth: column.minWidth }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    <Skeleton variant="text" width="78%" height={22} />
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
    <TableContainer component={Paper} elevation={0} sx={tableShellSx}>
      <Table sx={{ minWidth: 680 }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.id} align={column.align} style={{ minWidth: column.minWidth }}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const key = row.id !== undefined ? String(row.id) : `row-${index}`;
            return (
              <TableRow
                key={key}
                hover
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(event) => {
                  if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:last-child td, &:last-child th': { borderBottom: 0 },
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {column.render ? column.render(row) : (row as Record<string, React.ReactNode>)[column.id]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Box sx={{ height: 1 }} />
    </TableContainer>
  );
}
