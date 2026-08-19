import React, { useEffect, useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface SearchBarProps {
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value: initialValue = '',
  placeholder = 'Search...',
  onChange,
  debounceMs = 300,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = window.setTimeout(() => onChange(searchTerm), debounceMs);
    return () => window.clearTimeout(handler);
  }, [searchTerm, onChange, debounceMs]);

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
  };

  return (
    <TextField
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      sx={{ width: { xs: '100%', sm: 300 } }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: searchTerm ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClear} aria-label="Clear search">
                <ClearIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  );
};
