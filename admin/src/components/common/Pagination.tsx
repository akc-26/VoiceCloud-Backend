import React from 'react';
import { Box, Pagination as MuiPagination, TablePagination } from '@mui/material';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  rowsPerPageOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  rowsPerPageOptions = [10, 25, 50, 100],
}) => {
  const pageCount = Math.ceil(total / limit) || 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        mt: 1.5,
        px: 0.5,
      }}
    >
      <MuiPagination
        count={pageCount}
        page={page}
        onChange={(_, nextPage) => onPageChange(nextPage)}
        color="primary"
        shape="rounded"
        size="small"
      />
      {onLimitChange && (
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={(_, nextPage) => onPageChange(nextPage + 1)}
          rowsPerPage={limit}
          onRowsPerPageChange={(event) => onLimitChange(Number.parseInt(event.target.value, 10))}
          rowsPerPageOptions={rowsPerPageOptions}
          sx={{
            border: 0,
            '& .MuiTablePagination-toolbar': { minHeight: 36, p: 0 },
            '& .MuiTablePagination-displayedRows': { fontSize: '0.75rem', color: 'text.secondary' },
            '& .MuiTablePagination-selectLabel': { fontSize: '0.75rem', color: 'text.secondary' },
          }}
        />
      )}
    </Box>
  );
};
