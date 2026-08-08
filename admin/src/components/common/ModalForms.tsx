import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ModalFormsProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitText?: string;
  isLoading?: boolean;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
}

export const ModalForms: React.FC<ModalFormsProps> = ({
  open,
  title,
  onClose,
  onSubmit,
  submitText = 'Save Changes',
  isLoading = false,
  children,
  maxWidth = 'sm',
}) => (
  <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
    <DialogTitle
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Typography component="span" variant="h6">
        {title}
      </Typography>
      <IconButton size="small" onClick={onClose} aria-label="Close dialog">
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ py: 2.5 }}>
      {children}
    </DialogContent>
    {onSubmit && (
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={isLoading}>
          {submitText}
        </Button>
      </DialogActions>
    )}
  </Dialog>
);
