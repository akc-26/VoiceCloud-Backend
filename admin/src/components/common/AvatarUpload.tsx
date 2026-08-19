import React from 'react';
import { Box, Avatar, IconButton, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

interface AvatarUploadProps {
  value?: string;
  name?: string;
  onChange: (url: string) => void;
  onFileSelected?: (file: File) => void;
  size?: number;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  name = 'Admin User',
  onChange,
  onFileSelected,
  size = 80,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;

    onFileSelected?.(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) onChange(event.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
      <Box sx={{ position: 'relative' }}>
        <Avatar src={value} alt={name} sx={{ width: size, height: size, fontSize: size * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <IconButton
          component="label"
          aria-label="Choose avatar image"
          sx={{
            position: 'absolute', bottom: 0, right: 0, backgroundColor: 'primary.main',
            color: 'primary.contrastText', width: 28, height: 28,
            '&:hover': { backgroundColor: 'primary.dark' },
          }}
        >
          <PhotoCameraIcon sx={{ fontSize: 16 }} />
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileChange} />
        </IconButton>
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>User Avatar</Typography>
        <Typography variant="caption" color="text.secondary">Allowed JPG, PNG or WebP. Max size 5MB</Typography>
      </Box>
    </Box>
  );
};
