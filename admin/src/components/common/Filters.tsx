import React from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
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
  const hasActiveFilters = Object.values(values).some(Boolean);

  return (
    <Box
      sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          display: { xs: 'none', sm: 'grid' },
          placeItems: 'center',
          borderRadius: 2,
          color: 'primary.main',
          bgcolor: 'action.hover',
        }}
      >
        <FilterAltOutlinedIcon sx={{ fontSize: 17 }} />
      </Box>
      {filters.map((filter) => (
        <FormControl key={filter.key} size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{filter.label}</InputLabel>
          <Select
            value={values[filter.key] || ''}
            label={filter.label}
            onChange={(event: SelectChangeEvent) =>
              onChange(filter.key, event.target.value)
            }
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {filter.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
      {hasActiveFilters && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={onReset}
        >
          Reset
        </Button>
      )}
    </Box>
  );
};
