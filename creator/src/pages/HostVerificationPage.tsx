import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  Stack,
  LinearProgress,
  CircularProgress,
  Avatar,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  BadgeCheck,
  ShieldCheck,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  Sparkles,
  Users,
  Radio,
  Star,
  FileText,
  UserCheck,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { creatorApi } from '../services/creator-api.service';
import { useCreatorProfileStore } from '../store/creator-profile.store';
import {
  HostVerificationApplicationPayload,
  HostVerificationAsset,
  OwnerHostProfile,
} from '../types/creator.types';
import {
  activeAssetsForCategory,
  formatPrivateAssetSize,
  preferredAssetForCategory,
  validateHostVerificationFileSelection,
} from '../utils/host-verification-assets';

function getPrivateAssetLoadError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Secure verification document status could not be loaded.';
}

export const HostVerificationPage: React.FC = () => {
  const profile = useCreatorProfileStore((state) => state.profile);

  // Profile and Application State
  const [loading, setLoading] = useState(true);
  const [hostProfile, setHostProfile] = useState<OwnerHostProfile | null>(null);
  const [progression, setProgression] = useState<any | null>(null);
  const [publicConfig, setPublicConfig] = useState<any | null>(null);

  // Application Form State
  const [realName, setRealName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [country, setCountry] = useState('United States');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('English');
  const [categories, setCategories] = useState('Podcast & Audio Lounge');
  const [experience, setExperience] = useState('2+ years in live broadcasting');

  // Document Uploads State
  const [verificationAssets, setVerificationAssets] = useState<
    HostVerificationAsset[]
  >([]);

  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [uploadingSupporting, setUploadingSupporting] = useState(false);
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [assetLoadError, setAssetLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchHostStatus = async () => {
    setLoading(true);
    setAssetLoadError(null);
    try {
      const [pData, configData, assetResult] = await Promise.all([
        creatorApi.getHostProfile().catch(() => null),
        creatorApi.getPublicConfig().catch(() => null),
        creatorApi
          .getHostVerificationAssets()
          .then((assets) => ({ assets, error: null as string | null }))
          .catch((error: unknown) => ({
            assets: [] as HostVerificationAsset[],
            error: getPrivateAssetLoadError(error),
          })),
      ]);

      if (pData) {
        setHostProfile(pData);
        setRealName(pData.realName || profile?.displayName || '');
        setIdNumber(''); // Keep editable replacement field empty by default
        setCountry(pData.country || 'United States');
        setBio(pData.bio || '');
        if (pData.languages)
          setLanguages(
            Array.isArray(pData.languages)
              ? pData.languages.join(', ')
              : pData.languages,
          );
        if (pData.categories)
          setCategories(
            Array.isArray(pData.categories)
              ? pData.categories.join(', ')
              : pData.categories,
          );
        if (pData.experience) setExperience(pData.experience);

        // Fetch progression stats if host profile exists
        const prog = await creatorApi.getHostProgression().catch(() => null);
        if (prog) setProgression(prog);
      }
      if (configData) {
        setPublicConfig(configData);
      }
      setVerificationAssets(assetResult.assets);
      setAssetLoadError(assetResult.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHostStatus();
  }, []);

  // Upload Handlers
  const refreshVerificationAssets = async () => {
    try {
      const assets = await creatorApi.getHostVerificationAssets();
      setVerificationAssets(assets);
      setAssetLoadError(null);
      return assets;
    } catch (error: unknown) {
      setAssetLoadError(getPrivateAssetLoadError(error));
      throw error;
    }
  };

  const uploadOrReplaceSingleAsset = async (
    file: File,
    category: 'GOVERNMENT_ID' | 'SELFIE',
  ) => {
    const validationError = validateHostVerificationFileSelection(
      file,
      category,
    );
    if (validationError) throw new Error(validationError);

    const currentLinkedAsset = activeAssetsForCategory(
      verificationAssets,
      category,
    ).find((asset) => asset.linkedToApplication);
    const uploaded =
      category === 'GOVERNMENT_ID'
        ? await creatorApi.uploadGovernmentId(file)
        : await creatorApi.uploadProfilePhoto(file);

    if (currentLinkedAsset) {
      setReplacingAssetId(currentLinkedAsset.assetId);
      await creatorApi.replaceHostVerificationAsset(
        currentLinkedAsset.assetId,
        uploaded.assetId,
      );
      await refreshVerificationAssets();
      setReplacingAssetId(null);
      return;
    }

    setVerificationAssets((current) => [uploaded, ...current]);
  };

  const handleUploadGovernmentId = async (file: File) => {
    setUploadingId(true);
    setUploadError(null);
    try {
      await uploadOrReplaceSingleAsset(file, 'GOVERNMENT_ID');
    } catch (err: unknown) {
      setReplacingAssetId(null);
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Government ID upload failed securely.',
      );
      await refreshVerificationAssets().catch(() => undefined);
    } finally {
      setUploadingId(false);
    }
  };

  const handleUploadSelfie = async (file: File) => {
    setUploadingSelfie(true);
    setUploadError(null);
    try {
      await uploadOrReplaceSingleAsset(file, 'SELFIE');
    } catch (err: unknown) {
      setReplacingAssetId(null);
      setUploadError(
        err instanceof Error ? err.message : 'Selfie upload failed securely.',
      );
      await refreshVerificationAssets().catch(() => undefined);
    } finally {
      setUploadingSelfie(false);
    }
  };

  const handleUploadSupportingDocument = async (file: File) => {
    const validationError = validateHostVerificationFileSelection(
      file,
      'SUPPORTING_DOCUMENT',
    );
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadingSupporting(true);
    setUploadError(null);
    try {
      const uploaded = await creatorApi.uploadVerificationDocument(file);
      setVerificationAssets((current) => [uploaded, ...current]);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Supporting document upload failed securely.',
      );
    } finally {
      setUploadingSupporting(false);
    }
  };

  const handleReplaceSupportingDocument = async (
    currentAsset: HostVerificationAsset,
    file: File,
  ) => {
    const validationError = validateHostVerificationFileSelection(
      file,
      'SUPPORTING_DOCUMENT',
    );
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setReplacingAssetId(currentAsset.assetId);
    setUploadError(null);
    try {
      const uploaded = await creatorApi.uploadVerificationDocument(file);
      await creatorApi.replaceHostVerificationAsset(
        currentAsset.assetId,
        uploaded.assetId,
      );
      await refreshVerificationAssets();
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Supporting document replacement failed securely.',
      );
      await refreshVerificationAssets().catch(() => undefined);
    } finally {
      setReplacingAssetId(null);
    }
  };

  const governmentIdAsset = preferredAssetForCategory(
    verificationAssets,
    'GOVERNMENT_ID',
  );
  const selfieAsset = preferredAssetForCategory(verificationAssets, 'SELFIE');
  const supportingAssets = activeAssetsForCategory(
    verificationAssets,
    'SUPPORTING_DOCUMENT',
  );
  const hasGovIdUploaded = !!governmentIdAsset;
  const hasSelfieUploaded = !!selfieAsset;
  const hasLegacyDocumentsWithoutPrivateAssets =
    (!!hostProfile?.hasGovernmentIdUploaded && !governmentIdAsset) ||
    (!!hostProfile?.hasProfilePhotoUploaded && !selfieAsset);

  const handleSubmitApplication = async () => {
    if (assetLoadError) {
      setSubmitError(
        'Secure verification document status is unavailable. Retry before submitting your application.',
      );
      return;
    }
    if (!realName) {
      setSubmitError('Please complete all required fields (Real Name)');
      return;
    }
    if (!hostProfile?.idNumber && !idNumber.trim()) {
      setSubmitError('Please enter your Government ID / Passport Number');
      return;
    }
    if (!hasGovIdUploaded || !hasSelfieUploaded) {
      setSubmitError(
        'Government ID document and selfie photo uploads are required before submitting your application.',
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const dto: HostVerificationApplicationPayload = {
        realName,
        idNumber: idNumber.trim() ? idNumber.trim() : undefined,
        governmentIdAssetId: governmentIdAsset.assetId,
        selfieAssetId: selfieAsset.assetId,
        supportingDocumentAssetIds: supportingAssets.map(
          (asset) => asset.assetId,
        ),
        country,
        bio,
        languages: languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        categories: categories
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experience,
      };

      const res = await creatorApi.applyForHostVerification(dto);
      setHostProfile(res);
      setSubmitSuccess(
        'Your Host Verification application has been submitted successfully for compliance review!',
      );
      void fetchHostStatus();
    } catch (err: any) {
      setSubmitError(
        err?.message || 'Failed to submit host verification application.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={36} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading host verification status...
        </Typography>
      </Box>
    );
  }

  const status = hostProfile?.status || 'NOT_APPLIED';
  const minFollowers = publicConfig?.hostSettings?.minFollowersRequired || 50;
  const currentFollowers = profile.followersCount || 0;
  const isFollowerEligible = currentFollowers >= minFollowers;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BadgeCheck size={32} color="#2563eb" /> Host Verification & Creator Program
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Become an officially verified VoiceCloud host, unlock high-bitrate streaming, priority discovery, and exclusive monetization tiers.
        </Typography>
      </Box>

      {/* Verification Status Cards */}
      {status === 'APPROVED' && (
        <Alert
          severity="success"
          icon={<ShieldCheck size={28} />}
          sx={{ borderRadius: 2.5, p: 2, '& .MuiAlert-icon': { alignSelf: 'center' } }}
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            🎉 Congratulations! You are an Officially Verified Host
          </AlertTitle>
          Your identity and broadcasting credentials have been verified by VoiceCloud Compliance. You enjoy verified host badges across all audio lounges and room discovery channels.
        </Alert>
      )}

      {status === 'PENDING' && (
        <Alert
          severity="info"
          icon={<Clock size={28} />}
          sx={{ borderRadius: 2.5, p: 2, '& .MuiAlert-icon': { alignSelf: 'center' } }}
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            Application Under Compliance Review
          </AlertTitle>
          Your host verification application is currently being reviewed by our Trust & Safety team. Reviews typically complete within 24 to 48 hours.
        </Alert>
      )}

      {status === 'REJECTED' && (
        <Alert
          severity="error"
          icon={<XCircle size={28} />}
          sx={{ borderRadius: 2.5, p: 2, '& .MuiAlert-icon': { alignSelf: 'center' } }}
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            Application Decision: Resubmission Allowed
          </AlertTitle>
          {hostProfile?.rejectionReason ? (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Reason: <strong>{hostProfile.rejectionReason}</strong>
            </Typography>
          ) : (
            'Your previous application was not approved. Please review the requirements, update your documents, and resubmit when ready.'
          )}
        </Alert>
      )}

      {status === 'SUSPENDED' && (
        <Alert
          severity="warning"
          icon={<AlertTriangle size={28} />}
          sx={{ borderRadius: 2.5, p: 2, '& .MuiAlert-icon': { alignSelf: 'center' } }}
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            Host Status Temporarily Suspended
          </AlertTitle>
          Your host broadcasting privileges have been suspended. Please contact creator support for account audit information.
        </Alert>
      )}

      {submitSuccess && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          {submitSuccess}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Application or Status Overview */}
        <Grid xs={12} md={7}>
          {status === 'APPROVED' ? (
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Award size={22} color="#d97706" /> Verified Host Profile Information
                </Typography>

                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Avatar src={profile.avatarUrl} sx={{ width: 64, height: 64 }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {hostProfile?.realName || profile.displayName}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip
                          icon={<CheckCircle2 size={14} />}
                          label={`Verified Host Lvl ${hostProfile?.hostLevel || 1}`}
                          color="primary"
                          size="small"
                        />
                        <Chip
                          icon={<Star size={14} color="#eab308" />}
                          label={`Rating ⭐ ${hostProfile?.hostRating !== undefined && hostProfile?.hostRating !== null && Number(hostProfile.hostRating) > 0 ? Number(hostProfile.hostRating).toFixed(1) : 'N/A'}`}
                          size="small"
                        />
                      </Stack>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid xs={6}>
                      <Typography variant="caption" color="text.secondary">Identity Record</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{hostProfile?.idNumber || 'Verified ID'}</Typography>
                    </Grid>
                    <Grid xs={6}>
                      <Typography variant="caption" color="text.secondary">Country / Region</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{hostProfile?.country || 'Global'}</Typography>
                    </Grid>
                    <Grid xs={6}>
                      <Typography variant="caption" color="text.secondary">Total Rooms Hosted</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{hostProfile?.totalRoomsHosted !== undefined ? `${hostProfile.totalRoomsHosted} Lounges` : '0 Lounges'}</Typography>
                    </Grid>
                    <Grid xs={6}>
                      <Typography variant="caption" color="text.secondary">Peak Live Listeners</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{hostProfile?.peakListeners !== undefined ? hostProfile.peakListeners.toLocaleString() : '0'}</Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Active Host Level Progression
                  </Typography>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Level {progression?.currentLevel || hostProfile?.hostLevel || 1} XP ({progression?.currentXP || hostProfile?.xp || 0} / {progression?.requiredXP || 1000} XP)
                      </Typography>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                        {progression?.progressPercentage || 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progression?.progressPercentage || 0}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UserCheck size={22} color="#2563eb" /> Host Identity Application Form
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Provide your official identification details and broadcast profile to verify your account.
                </Typography>

                {submitError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {submitError}
                  </Alert>
                )}

                <Stack spacing={2.5}>
                  {hostProfile?.idNumber && (
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Current Stored Government ID: <strong>{hostProfile.idNumber}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Leave replacement field below empty to preserve stored ID.
                      </Typography>
                    </Box>
                  )}

                  <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                      <TextField
                        label="Legal Full Name *"
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={status === 'PENDING'}
                      />
                    </Grid>
                    <Grid xs={12} sm={6}>
                      <TextField
                        label={hostProfile?.idNumber ? "New / Replacement Government ID Number" : "Government ID / Passport No. *"}
                        value={idNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!/[*•●]/.test(val)) {
                            setIdNumber(val);
                          }
                        }}
                        helperText={hostProfile?.idNumber ? "Leave empty to keep current ID" : "Enter unmasked ID number"}
                        fullWidth
                        size="small"
                        disabled={status === 'PENDING'}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                      <TextField
                        label="Country of Residence"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={status === 'PENDING'}
                      />
                    </Grid>
                    <Grid xs={12} sm={6}>
                      <TextField
                        label="Languages Spoken"
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                        helperText="Comma separated (e.g. English, Spanish)"
                        fullWidth
                        size="small"
                        disabled={status === 'PENDING'}
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    label="Primary Content Categories"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                    helperText="Comma separated (e.g. Podcast, Music, Gaming, Tech)"
                    fullWidth
                    size="small"
                    disabled={status === 'PENDING'}
                  />

                  <TextField
                    label="Broadcasting Bio & Experience"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Tell us about your background in hosting, podcasts, or music broadcasting..."
                    fullWidth
                    size="small"
                    disabled={status === 'PENDING'}
                  />

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Verification Attachments
                  </Typography>

                  {assetLoadError && (
                    <Alert
                      severity="error"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          startIcon={<RefreshCw size={14} />}
                          onClick={() =>
                            void refreshVerificationAssets().catch(
                              () => undefined,
                            )
                          }
                        >
                          Retry
                        </Button>
                      }
                    >
                      Secure verification documents could not be loaded. Upload
                      and submission are paused to protect the current document
                      state.
                    </Alert>
                  )}

                  {hasLegacyDocumentsWithoutPrivateAssets && (
                    <Alert severity="warning">
                      One or more legacy verification files are no longer
                      available through secure private storage. Upload a new
                      Government ID and selfie before resubmitting.
                    </Alert>
                  )}

                  {uploadError && (
                    <Alert
                      severity="error"
                      onClose={() => setUploadError(null)}
                    >
                      {uploadError}
                    </Alert>
                  )}

                  <Grid container spacing={2}>
                    {/* ID Document Uploader */}
                    <Grid xs={12} sm={6}>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, display: 'block', mb: 1 }}
                        >
                          Government ID Document
                        </Typography>
                        {governmentIdAsset && (
                          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                            <Chip
                              icon={<CheckCircle2 size={14} />}
                              label={
                                governmentIdAsset.linkedToApplication
                                  ? 'Linked securely'
                                  : 'Ready to submit'
                              }
                              color="success"
                              size="small"
                              sx={{ alignSelf: 'center' }}
                            />
                            <Typography variant="caption" noWrap>
                              {governmentIdAsset.originalFilename}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {governmentIdAsset.verifiedFormat} ·{' '}
                              {formatPrivateAssetSize(
                                governmentIdAsset.fileSize,
                              )}
                            </Typography>
                          </Stack>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          component="label"
                          startIcon={
                            uploadingId ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Upload size={16} />
                            )
                          }
                          disabled={
                            uploadingId ||
                            status === 'PENDING' ||
                            !!assetLoadError
                          }
                        >
                          {uploadingId
                            ? 'Uploading...'
                            : governmentIdAsset
                              ? 'Upload replacement'
                              : 'Upload ID file'}
                          <input
                            type="file"
                            hidden
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void handleUploadGovernmentId(file);
                              event.target.value = '';
                            }}
                          />
                        </Button>
                      </Paper>
                    </Grid>

                    {/* Verification Selfie Uploader */}
                    <Grid xs={12} sm={6}>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, display: 'block', mb: 1 }}
                        >
                          Verification Selfie Photo
                        </Typography>
                        {selfieAsset && (
                          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                            <Chip
                              icon={<CheckCircle2 size={14} />}
                              label={
                                selfieAsset.linkedToApplication
                                  ? 'Linked securely'
                                  : 'Ready to submit'
                              }
                              color="success"
                              size="small"
                              sx={{ alignSelf: 'center' }}
                            />
                            <Typography variant="caption" noWrap>
                              {selfieAsset.originalFilename}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {selfieAsset.verifiedFormat} ·{' '}
                              {formatPrivateAssetSize(selfieAsset.fileSize)}
                            </Typography>
                          </Stack>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          component="label"
                          startIcon={
                            uploadingSelfie ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Upload size={16} />
                            )
                          }
                          disabled={
                            uploadingSelfie ||
                            status === 'PENDING' ||
                            !!assetLoadError
                          }
                        >
                          {uploadingSelfie
                            ? 'Uploading...'
                            : selfieAsset
                              ? 'Upload replacement'
                              : 'Upload selfie'}
                          <input
                            type="file"
                            hidden
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void handleUploadSelfie(file);
                              event.target.value = '';
                            }}
                          />
                        </Button>
                      </Paper>
                    </Grid>

                    <Grid xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                            mb: supportingAssets.length ? 1.5 : 0,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700 }}
                            >
                              Supporting Documents
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              Optional JPEG, PNG or PDF evidence; multiple files
                              are supported.
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            component="label"
                            startIcon={
                              uploadingSupporting ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Upload size={16} />
                              )
                            }
                            disabled={
                              uploadingSupporting ||
                              status === 'PENDING' ||
                              !!assetLoadError
                            }
                          >
                            {uploadingSupporting
                              ? 'Uploading...'
                              : 'Add document'}
                            <input
                              type="file"
                              hidden
                              accept="image/jpeg,image/png,application/pdf"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file)
                                  void handleUploadSupportingDocument(file);
                                event.target.value = '';
                              }}
                            />
                          </Button>
                        </Box>

                        <Stack spacing={1}>
                          {supportingAssets.map((asset) => (
                            <Box
                              key={asset.assetId}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                                p: 1.25,
                                bgcolor: 'action.hover',
                                borderRadius: 1.5,
                              }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  noWrap
                                  sx={{ fontWeight: 600 }}
                                >
                                  {asset.originalFilename}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {asset.verifiedFormat} ·{' '}
                                  {formatPrivateAssetSize(asset.fileSize)} ·{' '}
                                  {asset.linkedToApplication
                                    ? 'Linked securely'
                                    : 'Ready to submit'}
                                </Typography>
                              </Box>
                              {asset.linkedToApplication && (
                                <Button
                                  component="label"
                                  size="small"
                                  disabled={
                                    status === 'PENDING' ||
                                    !!assetLoadError ||
                                    replacingAssetId === asset.assetId
                                  }
                                >
                                  {replacingAssetId === asset.assetId
                                    ? 'Replacing...'
                                    : 'Replace'}
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/jpeg,image/png,application/pdf"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      if (file) {
                                        void handleReplaceSupportingDocument(
                                          asset,
                                          file,
                                        );
                                      }
                                      event.target.value = '';
                                    }}
                                  />
                                </Button>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={
                        submitting ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <ShieldCheck size={20} />
                        )
                      }
                      onClick={() => void handleSubmitApplication()}
                      disabled={
                        submitting || status === 'PENDING' || !!assetLoadError
                      }
                      fullWidth
                      sx={{ fontWeight: 700, py: 1.2 }}
                    >
                      {status === 'PENDING'
                        ? 'Application Pending Review'
                        : status === 'REJECTED'
                          ? 'Resubmit Host Application'
                          : 'Submit Verification Application'}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Side Panel: Eligibility & Program Levels */}
        <Grid xs={12} md={5}>
          <Stack spacing={3}>
            {/* Eligibility Evaluation */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Sparkles size={20} color="#7c3aed" /> Eligibility Requirements
                </Typography>

                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Users size={18} color="#2563eb" />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Active Followers</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Requires min. {minFollowers} followers
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      icon={isFollowerEligible ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      label={`${currentFollowers} / ${minFollowers}`}
                      color={isFollowerEligible ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Radio size={18} color="#dc2626" />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Broadcasting Experience</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Min 3 public voice rooms hosted
                        </Typography>
                      </Box>
                    </Box>
                    <Chip icon={<CheckCircle2 size={14} />} label="Eligible" color="success" size="small" />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShieldCheck size={18} color="#16a34a" />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Community Standing</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Zero policy compliance strikes
                        </Typography>
                      </Box>
                    </Box>
                    <Chip icon={<CheckCircle2 size={14} />} label="Good Standing" color="success" size="small" />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Creator Program Tiers Showcase */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Award size={20} color="#d97706" /> Host Levels & Creator Perks
                </Typography>

                <Stack spacing={1.5}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: 'primary.main' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      Level 1: Verified Host
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Verified Badge, High-Bitrate Ingest, Multi-Mic Audio Lounge
                    </Typography>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#d97706' }}>
                      Level 2: Elite Host (5,000 XP)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Gold Badge, Priority Discovery Placement, Custom Room Frames
                    </Typography>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#7c3aed' }}>
                      Level 3: Premium Host (15,000 XP)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Diamond Badge, Agency Management Eligibility, Accelerated Payouts
                    </Typography>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
