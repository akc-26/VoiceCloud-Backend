import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, Box, Typography, Button } from '@mui/material';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(`[WidgetErrorBoundary] Caught error in ${this.props.title || 'Widget'}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Card sx={{ height: '100%', borderRadius: 2 }}>
          <CardContent
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 180,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'warning.light',
                color: 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <AlertCircle size={24} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {this.props.title || 'Widget'} Unavailable
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 280 }}>
              This section is temporarily unavailable. The rest of your studio remains functional.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RotateCcw size={14} />}
              onClick={this.handleRetry}
              sx={{ fontWeight: 600 }}
            >
              Retry Widget
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
