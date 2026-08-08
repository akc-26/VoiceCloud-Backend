import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  adminService,
  HostBusinessSettings,
  HostLevelSettings,
  UpdateHostBusinessSettings,
} from '../../services/admin.service';
import { useNotificationsStore } from '../../store/notifications.store';

const EMPTY_SETTINGS: HostBusinessSettings = {
  applicationsEnabled: true,
  minFollowers: 50,
  minCompletedRooms: 3,
  requireGoodStanding: true,
  levels: [],
  updatedAt: '',
};

const benefitKeyPattern = /^[a-z0-9_]{1,64}$/;

export const HostBusinessSettingsCard: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [settings, setSettings] =
    useState<HostBusinessSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    adminService
      .getHostBusinessSettings()
      .then((response) => {
        if (mounted) {
          setSettings(response);
          setLoadError('');
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError('Unable to load Host business settings.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const validationError = useMemo(() => validateSettings(settings), [settings]);

  const updateLevel = (index: number, patch: Partial<HostLevelSettings>) => {
    setSettings((current) => ({
      ...current,
      levels: current.levels.map((level, levelIndex) =>
        levelIndex === index ? { ...level, ...patch } : level,
      ),
    }));
  };

  const addLevel = () => {
    setSettings((current) => {
      const previous = current.levels[current.levels.length - 1];
      const nextLevel = current.levels.length + 1;
      return {
        ...current,
        levels: [
          ...current.levels,
          {
            level: nextLevel,
            name: `Host Level ${nextLevel}`,
            minimumXp: previous ? previous.minimumXp + 1000 : 0,
            benefits: [],
          },
        ],
      };
    });
  };

  const removeLevel = (index: number) => {
    setSettings((current) => ({
      ...current,
      levels: current.levels
        .filter((_, levelIndex) => levelIndex !== index)
        .map((level, levelIndex) => ({ ...level, level: levelIndex + 1 })),
    }));
  };

  const addBenefit = (levelIndex: number) => {
    const level = settings.levels[levelIndex];
    updateLevel(levelIndex, {
      benefits: [
        ...level.benefits,
        { key: `benefit_${level.benefits.length + 1}`, label: '' },
      ],
    });
  };

  const updateBenefit = (
    levelIndex: number,
    benefitIndex: number,
    patch: { key?: string; label?: string },
  ) => {
    const level = settings.levels[levelIndex];
    updateLevel(levelIndex, {
      benefits: level.benefits.map((benefit, index) =>
        index === benefitIndex ? { ...benefit, ...patch } : benefit,
      ),
    });
  };

  const removeBenefit = (levelIndex: number, benefitIndex: number) => {
    const level = settings.levels[levelIndex];
    updateLevel(levelIndex, {
      benefits: level.benefits.filter((_, index) => index !== benefitIndex),
    });
  };

  const save = async () => {
    const error = validateSettings(settings);
    if (error) {
      addToast('error', error);
      return;
    }

    const payload: UpdateHostBusinessSettings = {
      applicationsEnabled: settings.applicationsEnabled,
      minFollowers: settings.minFollowers,
      minCompletedRooms: settings.minCompletedRooms,
      requireGoodStanding: settings.requireGoodStanding,
      levels: settings.levels.map((level) => ({
        ...level,
        name: level.name.trim(),
        benefits: level.benefits.map((benefit) => ({
          key: benefit.key.trim(),
          label: benefit.label.trim(),
        })),
      })),
    };

    setSaving(true);
    try {
      const response = await adminService.updateHostBusinessSettings(payload);
      setSettings(response);
      addToast('success', 'Host business settings updated atomically.');
    } catch {
      addToast('error', 'Host business settings were not updated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card elevation={0} sx={{ p: 1 }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              Host Business Rules
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure Host eligibility, XP levels, names, and benefits through
              one validated backend transaction.
            </Typography>
          </Box>
          {settings.updatedAt && (
            <Typography variant="caption" color="text.secondary">
              Last updated {new Date(settings.updatedAt).toLocaleString()}
            </Typography>
          )}
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && loadError && <Alert severity="error">{loadError}</Alert>}

        {!loading && !loadError && (
          <>
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.applicationsEnabled}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          applicationsEnabled: event.target.checked,
                        }))
                      }
                    />
                  }
                  label="Allow eligible users to submit Host applications"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Followers"
                  value={settings.minFollowers}
                  slotProps={{ htmlInput: { min: 0, max: 1000000 } }}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      minFollowers: Number(event.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Completed Rooms"
                  value={settings.minCompletedRooms}
                  slotProps={{ htmlInput: { min: 0, max: 1000000 } }}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      minCompletedRooms: Number(event.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requireGoodStanding}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          requireGoodStanding: event.target.checked,
                        }))
                      }
                    />
                  }
                  label="Require no active account ban or suspension"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Stack spacing={2}>
              {settings.levels.map((level, levelIndex) => (
                <Paper key={level.level} variant="outlined" sx={{ p: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Level {level.level}
                    </Typography>
                    <IconButton
                      aria-label={`Remove Host level ${level.level}`}
                      disabled={settings.levels.length === 1}
                      onClick={() => removeLevel(levelIndex)}
                    >
                      <Box
                        component="span"
                        aria-hidden="true"
                        sx={{ fontSize: 20, lineHeight: 1 }}
                      >
                        ×
                      </Box>
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Level Name"
                        value={level.name}
                        onChange={(event) =>
                          updateLevel(levelIndex, { name: event.target.value })
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Minimum XP"
                        value={level.minimumXp}
                        disabled={level.level === 1}
                        slotProps={{ htmlInput: { min: 0, max: 1000000000 } }}
                        onChange={(event) =>
                          updateLevel(levelIndex, {
                            minimumXp: Number(event.target.value),
                          })
                        }
                      />
                    </Grid>
                  </Grid>

                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {level.benefits.map((benefit, benefitIndex) => (
                      <Grid
                        container
                        spacing={1.5}
                        sx={{ alignItems: 'center' }}
                        key={`${level.level}-${benefitIndex}`}
                      >
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Benefit Key"
                            value={benefit.key}
                            onChange={(event) =>
                              updateBenefit(levelIndex, benefitIndex, {
                                key: event.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 7 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Benefit Label"
                            value={benefit.label}
                            onChange={(event) =>
                              updateBenefit(levelIndex, benefitIndex, {
                                label: event.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 1 }}>
                          <IconButton
                            aria-label="Remove Host benefit"
                            onClick={() =>
                              removeBenefit(levelIndex, benefitIndex)
                            }
                          >
                            <Box
                              component="span"
                              aria-hidden="true"
                              sx={{ fontSize: 20, lineHeight: 1 }}
                            >
                              ×
                            </Box>
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                    <Button
                      onClick={() => addBenefit(levelIndex)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Add benefit
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button onClick={addLevel}>Add Host level</Button>
              <Button
                variant="contained"
                onClick={save}
                disabled={saving || Boolean(validationError)}
              >
                {saving ? 'Saving...' : 'Save Host Business Rules'}
              </Button>
            </Box>

            {validationError && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {validationError}
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

function validateSettings(settings: HostBusinessSettings): string {
  if (
    !Number.isSafeInteger(settings.minFollowers) ||
    settings.minFollowers < 0 ||
    settings.minFollowers > 1_000_000
  ) {
    return 'Minimum followers must be an integer from 0 to 1,000,000.';
  }
  if (
    !Number.isSafeInteger(settings.minCompletedRooms) ||
    settings.minCompletedRooms < 0 ||
    settings.minCompletedRooms > 1_000_000
  ) {
    return 'Minimum completed rooms must be an integer from 0 to 1,000,000.';
  }
  if (settings.levels.length === 0 || settings.levels.length > 100) {
    return 'At least one and no more than 100 Host levels are required.';
  }

  for (let index = 0; index < settings.levels.length; index += 1) {
    const level = settings.levels[index];
    if (level.level !== index + 1) {
      return 'Host levels must be contiguous and start at level 1.';
    }
    if (!level.name.trim() || level.name.trim().length > 100) {
      return `Level ${level.level} requires a valid name.`;
    }
    if (
      !Number.isSafeInteger(level.minimumXp) ||
      level.minimumXp < 0 ||
      level.minimumXp > 1_000_000_000
    ) {
      return `Level ${level.level} has an invalid XP threshold.`;
    }
    if (index === 0 && level.minimumXp !== 0) {
      return 'Level 1 must start at 0 XP.';
    }
    if (index > 0 && level.minimumXp <= settings.levels[index - 1].minimumXp) {
      return 'Host XP thresholds must increase strictly.';
    }
    if (level.benefits.length > 50) {
      return `Level ${level.level} has too many benefits.`;
    }

    const keys = new Set<string>();
    for (const benefit of level.benefits) {
      const key = benefit.key.trim();
      const label = benefit.label.trim();
      if (!benefitKeyPattern.test(key) || !label || label.length > 200) {
        return `Level ${level.level} has an invalid benefit.`;
      }
      if (keys.has(key)) {
        return `Level ${level.level} has duplicate benefit keys.`;
      }
      keys.add(key);
    }
  }

  return '';
}
