import React from 'react';
import { Box, TablePagination, Pagination as MuiPagination } from '@mui/material';

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
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        mt: 2,
        px: 1,
      }}
    >
      <MuiPagination
        count={pageCount}
        page={page}
        onChange={(_, p) => onPageChange(p)}
        color="primary"
        shape="rounded"
        size="medium"
      />
      {onLimitChange && (
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={(_, p) => onPageChange(p + 1)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={rowsPerPageOptions}
          sx={{ border: 'none' }}
        />
      )}
    </Box>
  );
};
