import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  HostProfileData,
  HostVerificationAssetData,
  hostsAdminService,
} from '../../services/hosts.service';
import {
  formatHostVerificationAssetSize,
  getHostVerificationCategoryLabel,
  isHostVerificationAssetPreviewable,
  sortHostVerificationAssets,
} from '../../utils/host-verification-assets';

interface HostVerificationDocumentsDialogProps {
  host: HostProfileData | null;
  open: boolean;
  onClose: () => void;
}

export const HostVerificationDocumentsDialog: React.FC<
  HostVerificationDocumentsDialogProps
> = ({ host, open, onClose }) => {
  const [assets, setAssets] = useState<HostVerificationAssetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] =
    useState<HostVerificationAssetData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewRequestRef = useRef(0);

  const releasePreview = useCallback(() => {
    previewRequestRef.current += 1;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewLoading(false);
    setPreviewError(null);
  }, []);

  const loadAssets = useCallback(
    async (signal?: AbortSignal) => {
      if (!host) return;
      setLoading(true);
      setLoadError(null);
      releasePreview();
      setSelectedAsset(null);
      try {
        const result = await hostsAdminService.getVerificationAssets(
          host.id,
          signal,
        );
        if (!signal?.aborted) {
          setAssets(sortHostVerificationAssets(result));
        }
      } catch (error: unknown) {
        if (!signal?.aborted) {
          setAssets([]);
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Secure verification metadata could not be loaded.',
          );
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [host, releasePreview],
  );

  useEffect(() => {
    if (!open || !host) return undefined;
    const controller = new AbortController();
    void loadAssets(controller.signal);
    return () => {
      controller.abort();
      releasePreview();
    };
  }, [host, loadAssets, open, releasePreview]);

  const handlePreview = async (asset: HostVerificationAssetData) => {
    releasePreview();
    setSelectedAsset(asset);

    if (!isHostVerificationAssetPreviewable(asset.verifiedMimeType)) {
      setPreviewError('This verified file format cannot be previewed safely.');
      return;
    }

    const requestId = ++previewRequestRef.current;
    setPreviewLoading(true);
    try {
      const blob = await hostsAdminService.getVerificationAssetContent(
        asset.assetId,
      );
      if (requestId !== previewRequestRef.current) return;
      if (!blob.size) {
        throw new Error('The private document response was empty.');
      }

      const verifiedBlob =
        blob.type === asset.verifiedMimeType
          ? blob
          : new Blob([blob], { type: asset.verifiedMimeType });
      const objectUrl = URL.createObjectURL(verifiedBlob);
      if (requestId !== previewRequestRef.current) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } catch (error: unknown) {
      if (requestId === previewRequestRef.current) {
        setPreviewError(
          error instanceof Error
            ? error.message
            : 'The private document could not be opened securely.',
        );
      }
    } finally {
      if (requestId === previewRequestRef.current) setPreviewLoading(false);
    }
  };

  const handleClose = () => {
    releasePreview();
    setAssets([]);
    setSelectedAsset(null);
    setLoadError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Secure verification review: {host?.realName || 'Host applicant'}
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Restricted compliance material</AlertTitle>
          Documents are fetched only after authorization and displayed through
          temporary in-browser references. They are not public links and are
          removed from memory when this review closes.
        </Alert>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Applicant identity
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {host?.idNumber || 'Masked identity unavailable'}
                </Typography>
              </Box>
              <Divider />

              {loading && (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <CircularProgress size={30} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Loading secure document metadata...
                  </Typography>
                </Box>
              )}

              {!loading && loadError && (
                <Alert
                  severity="error"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={() => void loadAssets()}
                    >
                      Retry
                    </Button>
                  }
                >
                  {loadError}
                </Alert>
              )}

              {!loading && !loadError && assets.length === 0 && (
                <Alert severity="warning">
                  No current private verification documents are linked to this
                  application. Legacy public files are not used; the applicant
                  must securely re-upload the required documents.
                </Alert>
              )}

              {!loading &&
                assets.map((asset) => (
                  <Paper
                    key={asset.assetId}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderColor:
                        selectedAsset?.assetId === asset.assetId
                          ? 'primary.main'
                          : 'divider',
                    }}
                  >
                    <Stack spacing={1}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 800 }}
                          >
                            {getHostVerificationCategoryLabel(asset.category)}
                          </Typography>
                          <Typography
                            variant="body2"
                            noWrap
                            title={asset.originalFilename}
                          >
                            {asset.originalFilename}
                          </Typography>
                        </Box>
                        <Chip label="Validated" color="success" size="small" />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {asset.verifiedFormat} ·{' '}
                        {formatHostVerificationAssetSize(asset.fileSize)} ·{' '}
                        {new Date(asset.createdAt).toLocaleString()}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => void handlePreview(asset)}
                        disabled={
                          previewLoading &&
                          selectedAsset?.assetId === asset.assetId
                        }
                      >
                        Review securely
                      </Button>
                    </Stack>
                  </Paper>
                ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              variant="outlined"
              sx={{
                minHeight: 480,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
              }}
            >
              {!selectedAsset && (
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  <DescriptionIcon sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="body2">
                    Select a validated document to review it securely.
                  </Typography>
                </Box>
              )}

              {selectedAsset && previewLoading && (
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={34} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Opening private document...
                  </Typography>
                </Box>
              )}

              {selectedAsset && previewError && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  {previewError}
                </Alert>
              )}

              {selectedAsset &&
                previewUrl &&
                selectedAsset.verifiedMimeType.startsWith('image/') && (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt={`${getHostVerificationCategoryLabel(selectedAsset.category)} preview`}
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 620,
                      objectFit: 'contain',
                    }}
                  />
                )}

              {selectedAsset &&
                previewUrl &&
                selectedAsset.verifiedMimeType === 'application/pdf' && (
                  <Box
                    component="iframe"
                    src={previewUrl}
                    title={`${getHostVerificationCategoryLabel(selectedAsset.category)} PDF preview`}
                    sandbox=""
                    referrerPolicy="no-referrer"
                    sx={{ width: '100%', height: 620, border: 0 }}
                  />
                )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close secure review</Button>
      </DialogActions>
    </Dialog>
  );
};
