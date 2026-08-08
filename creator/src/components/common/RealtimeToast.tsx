import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from 'react';
import {
  Snackbar,
  Alert,
  AlertColor,
  Box,
  Typography,
  Slide,
  SlideProps,
} from '@mui/material';
import {
  Gift,
  UserPlus,
  Star,
  Radio,
  Wallet,
  Bell,
  Sparkles,
} from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  severity: AlertColor;
  iconType?:
    'gift' | 'follower' | 'subscriber' | 'room' | 'wallet' | 'notification';
  timestamp?: string;
}

interface RealtimeToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const RealtimeToastContext = createContext<RealtimeToastContextType>({
  showToast: () => {},
});

export const useRealtimeToast = () => useContext(RealtimeToastContext);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

export const RealtimeToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
  const [open, setOpen] = useState(false);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const newToast: ToastMessage = {
      ...toast,
      id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    setQueue((prev) => [...prev, newToast]);
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !currentToast) {
      setCurrentToast(queue[0]);
      setQueue((prev) => prev.slice(1));
      setOpen(true);
    } else if (queue.length > 0 && currentToast && open) {
      // If a new toast comes while one is open, auto close current and transition
      setOpen(false);
    }
  }, [queue, currentToast, open]);

  const handleClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleExited = () => {
    setCurrentToast(null);
  };

  const renderIcon = (type?: ToastMessage['iconType']) => {
    switch (type) {
      case 'gift':
        return <Gift size={20} color="#ec4899" />;
      case 'follower':
        return <UserPlus size={20} color="#3b82f6" />;
      case 'subscriber':
        return <Star size={20} color="#eab308" />;
      case 'room':
        return <Radio size={20} color="#8b5cf6" />;
      case 'wallet':
        return <Wallet size={20} color="#10b981" />;
      case 'notification':
        return <Bell size={20} color="#f97316" />;
      default:
        return <Sparkles size={20} color="#8b5cf6" />;
    }
  };

  return (
    <RealtimeToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        slots={{ transition: SlideTransition }}
        slotProps={{ transition: { onExited: handleExited } }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 7 }}
      >
        {currentToast ? (
          <Alert
            onClose={handleClose}
            severity={currentToast.severity}
            variant="filled"
            icon={renderIcon(currentToast.iconType)}
            sx={{
              width: '100%',
              minWidth: 320,
              maxWidth: 420,
              borderRadius: 2.5,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                {currentToast.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8125rem', opacity: 0.9, mt: 0.3 }}
              >
                {currentToast.message}
              </Typography>
            </Box>
          </Alert>
        ) : undefined}
      </Snackbar>
    </RealtimeToastContext.Provider>
  );
};
