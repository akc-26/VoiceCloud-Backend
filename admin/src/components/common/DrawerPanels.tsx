import React from 'react';
import { Box, Divider, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface DrawerPanelsProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number | string;
}

export const DrawerPanels: React.FC<DrawerPanelsProps> = ({
  open,
  title,
  onClose,
  children,
  width = 460,
}) => (
  <Drawer
    anchor="right"
    open={open}
    onClose={onClose}
    slotProps={{
      paper: {
        sx: {
          width: { xs: '100%', sm: width },
          p: 0,
          borderLeft: '1px solid',
          borderColor: 'divider',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '-16px 0 44px rgba(0,0,0,0.28)'
              : '-16px 0 44px rgba(16,35,63,0.08)',
        },
      },
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2.5,
        py: 2,
      }}
    >
      <Typography variant="h6">{title}</Typography>
      <IconButton size="small" onClick={onClose} aria-label="Close panel">
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
    <Divider />
    <Box sx={{ p: { xs: 2, sm: 2.5 }, flexGrow: 1, overflowY: 'auto' }}>
      {children}
    </Box>
  </Drawer>
);
