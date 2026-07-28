import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Button,
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
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 3 }}>
        {children}
      </DialogContent>
      {onSubmit && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" color="inherit" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={onSubmit} disabled={isLoading}>
            {submitText}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
