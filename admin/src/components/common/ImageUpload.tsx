import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label = 'Upload Image',
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate/Perform upload or preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        setIsUploading(false);
        onChange(event.target?.result as string);
      }, 500);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }} color="text.secondary" gutterBottom>
        {label}
      </Typography>
      {value ? (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 180,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <img src={value} alt="Uploaded preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleRemove}
            sx={{ position: 'absolute', top: 10, right: 10, borderRadius: 2 }}
          >
            Remove
          </Button>
        </Box>
      ) : (
        <Box
          component="label"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.default',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
            },
          }}
        >
          {isUploading ? (
            <CircularProgress size={32} />
          ) : (
            <>
              <CloudUploadIcon color="primary" sx={{ fontSize: 36, mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Click to upload image
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PNG, JPG, WEBP up to 5MB
              </Typography>
            </>
          )}
          <input type="file" accept="image/*" hidden onChange={handleFileChange} />
        </Box>
      )}
    </Box>
  );
};
