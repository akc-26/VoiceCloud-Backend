import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Button, SelectChangeEvent } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface FiltersProps {
  filters: FilterOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  filters,
  values,
  onChange,
  onReset,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <FilterListIcon color="action" fontSize="small" />
      {filters.map((f) => (
        <FormControl key={f.key} size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{f.label}</InputLabel>
          <Select
            value={values[f.key] || ''}
            label={f.label}
            onChange={(e: SelectChangeEvent) => onChange(f.key, e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {f.options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
      {Object.values(values).some((v) => Boolean(v)) && (
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<RestartAltIcon />}
          onClick={onReset}
          sx={{ borderRadius: 2 }}
        >
          Reset
        </Button>
      )}
    </Box>
  );
};
